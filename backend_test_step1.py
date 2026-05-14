"""STEP 1 (Apple App Store compliance) backend tests.

Tests the following NEW endpoints:
  - DELETE /api/auth/me
  - POST   /api/segnalazioni
  - POST   /api/blocks/{user_id}
  - DELETE /api/blocks/{user_id}
  - GET    /api/blocks
  - GET    /api/doni (block-symmetric filter)

Plus a smoke-test for existing flows.
"""
import os
import sys
import time
import uuid
import base64
import json
import httpx

BASE = "https://mood-tracker-619.preview.emergentagent.com/api"

results = []  # list of (name, passed, detail)


def record(name: str, ok: bool, detail: str = ""):
    results.append((name, ok, detail))
    flag = "PASS" if ok else "FAIL"
    print(f"[{flag}] {name} :: {detail}")


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def make_user(prefix: str):
    """Register a fresh user, return (token, user_id, email, password)."""
    email = f"{prefix}-{uuid.uuid4().hex[:8]}@joytest.it"
    password = "JoyTest123!"
    r = httpx.post(f"{BASE}/auth/register", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    j = r.json()
    return j["access_token"], j["user_id"], email, password


def put_profile(token: str, nome: str, citta: str):
    r = httpx.put(
        f"{BASE}/profile/me",
        headers=auth_headers(token),
        json={"nome": nome, "citta": citta, "telefono": "+39300000000"},
        timeout=30,
    )
    assert r.status_code == 200, f"profile put failed: {r.status_code} {r.text}"
    return r.json()


TINY_PNG_B64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAfbLI3wAAAABJRU5ErkJggg=="
)


def upload_image(token: str) -> str:
    r = httpx.post(
        f"{BASE}/uploads/image",
        headers=auth_headers(token),
        json={"base64": TINY_PNG_B64},
        timeout=60,
    )
    assert r.status_code == 200, f"upload failed: {r.status_code} {r.text}"
    return r.json()["secure_url"]


def create_dono(token: str, foto_url: str, titolo: str):
    r = httpx.post(
        f"{BASE}/doni",
        headers=auth_headers(token),
        json={
            "titolo": titolo,
            "descrizione": "test",
            "categoria": "altro",
            "lat": 41.9028,
            "lng": 12.4964,
            "foto_urls": [foto_url],
        },
        timeout=30,
    )
    assert r.status_code == 200, f"create_dono failed: {r.status_code} {r.text}"
    return r.json()


# -----------------------------------------------------------------------------
# 0) Health
# -----------------------------------------------------------------------------
def t_health():
    r = httpx.get(f"{BASE}/", timeout=20)
    record("GET /api/ health", r.status_code == 200, f"status={r.status_code} body={r.text[:80]}")


# -----------------------------------------------------------------------------
# 1) DELETE /api/auth/me — Account deletion
# -----------------------------------------------------------------------------
def t_delete_account():
    # 1a) No auth -> 401
    r = httpx.delete(f"{BASE}/auth/me", timeout=20)
    record("DELETE /auth/me without token -> 401", r.status_code == 401, f"status={r.status_code}")

    # Setup: create user X with profile, photo, dono and a block
    tok, uid, email, pwd = make_user("delme")
    put_profile(tok, "Mario Rossi", "Roma")
    foto = upload_image(tok)
    dono = create_dono(tok, foto, "Mobile da regalare")
    dono_id = dono["id"]

    # create a partner Z to test block cleanup
    tokZ, uidZ, _, _ = make_user("partnerz")
    put_profile(tokZ, "Zelda Verdi", "Milano")

    # X blocks Z
    rb = httpx.post(f"{BASE}/blocks/{uidZ}", headers=auth_headers(tok), timeout=20)
    # If moderation router missing, this is 404 — recorded separately
    if rb.status_code != 200:
        record("Setup: X blocks Z (pre-delete)", False, f"status={rb.status_code} body={rb.text[:100]} — moderation router likely not wired")

    # 1b) DELETE /auth/me with token -> 200
    rd = httpx.delete(f"{BASE}/auth/me", headers=auth_headers(tok), timeout=30)
    ok = rd.status_code == 200 and rd.json().get("ok") is True
    record("DELETE /auth/me with token -> 200 {ok:true}", ok, f"status={rd.status_code} body={rd.text[:120]}")

    # 1c) cannot login with old creds
    rl = httpx.post(f"{BASE}/auth/login", json={"email": email, "password": pwd}, timeout=20)
    record("Login with old creds after delete -> 401", rl.status_code == 401, f"status={rl.status_code}")

    # 1d) profile gone via GET /api/profile/{user_id} (other user fetches)
    rp = httpx.get(f"{BASE}/profile/{uid}", headers=auth_headers(tokZ), timeout=20)
    # endpoint returns 200 with null/None when profile absent
    body_text = rp.text.strip()
    is_empty = rp.status_code == 200 and (body_text in ("null", "") or rp.json() in (None, {}))
    record("GET /profile/{deleted_user} returns empty/null", is_empty or rp.status_code == 404,
           f"status={rp.status_code} body={body_text[:80]}")

    # 1e) doni created by deleted user no longer appear in GET /api/doni
    rdoni = httpx.get(f"{BASE}/doni", headers=auth_headers(tokZ), timeout=20)
    if rdoni.status_code == 200:
        items = rdoni.json()
        present = any(d.get("id") == dono_id for d in items)
        record("GET /doni excludes deleted user's dono", not present,
               f"dono {dono_id} present={present}, total={len(items)}")
    else:
        record("GET /doni excludes deleted user's dono", False, f"status={rdoni.status_code}")

    # 1f) blocks involving deleted user removed: tokZ.GET /blocks should not error & not contain anyone for him
    rbl = httpx.get(f"{BASE}/blocks", headers=auth_headers(tokZ), timeout=20)
    if rbl.status_code == 200:
        items = rbl.json()
        record("Blocks of partner-Z is empty after X deletion", items == [],
               f"items={items}")
    else:
        record("Blocks of partner-Z is empty after X deletion", False, f"status={rbl.status_code}")

    return tokZ, uidZ


# -----------------------------------------------------------------------------
# 2) POST /api/segnalazioni
# -----------------------------------------------------------------------------
def t_segnalazioni():
    # 2a) 401 without auth
    r = httpx.post(f"{BASE}/segnalazioni", json={
        "target_type": "dono", "target_id": "xyz", "reason": "spam"
    }, timeout=20)
    record("POST /segnalazioni without auth -> 401", r.status_code == 401, f"status={r.status_code}")

    # setup user
    tok, uid, _, _ = make_user("reporter")
    put_profile(tok, "Reporter Uno", "Bologna")

    target_id = str(uuid.uuid4())

    # 2b) invalid reason -> 400 with valid reasons mentioned
    r2 = httpx.post(f"{BASE}/segnalazioni",
                    headers=auth_headers(tok),
                    json={"target_type": "dono", "target_id": target_id, "reason": "BOGUS"},
                    timeout=20)
    detail = ""
    try:
        detail = r2.json().get("detail", "")
    except Exception:
        detail = r2.text
    has_reasons = ("spam" in detail and "altro" in detail)
    record("POST /segnalazioni invalid reason -> 400 listing valid reasons",
           r2.status_code == 400 and has_reasons, f"status={r2.status_code} detail={detail[:160]}")

    # 2c) valid report -> 200 with SegnalazioneOut
    r3 = httpx.post(f"{BASE}/segnalazioni",
                    headers=auth_headers(tok),
                    json={"target_type": "dono", "target_id": target_id,
                          "reason": "spam", "note": "Sembra una truffa"},
                    timeout=20)
    body = r3.json() if r3.status_code == 200 else None
    ok_body = bool(body and body.get("id") and body.get("status") == "pending"
                   and body.get("target_type") == "dono" and body.get("target_id") == target_id
                   and body.get("reason") == "spam" and body.get("created_at"))
    record("POST /segnalazioni valid -> 200 SegnalazioneOut",
           r3.status_code == 200 and ok_body, f"status={r3.status_code} body={body}")

    # 2d) idempotency: re-posting same (target_type, target_id) returns same id
    r4 = httpx.post(f"{BASE}/segnalazioni",
                    headers=auth_headers(tok),
                    json={"target_type": "dono", "target_id": target_id,
                          "reason": "contenuto_offensivo", "note": "duplicate"},
                    timeout=20)
    if r3.status_code == 200 and r4.status_code == 200:
        same_id = r4.json().get("id") == body["id"]
        pending = r4.json().get("status") == "pending"
        record("POST /segnalazioni idempotent (same id on duplicate)",
               same_id and pending,
               f"first_id={body.get('id')} second_id={r4.json().get('id')} status={r4.json().get('status')}")
    else:
        record("POST /segnalazioni idempotent (same id on duplicate)",
               False, f"first={r3.status_code} second={r4.status_code}")


# -----------------------------------------------------------------------------
# 3) POST /api/blocks/{user_id} + DELETE + GET
# -----------------------------------------------------------------------------
def t_blocks_basic():
    # No-auth POST -> 401
    r = httpx.post(f"{BASE}/blocks/{uuid.uuid4()}", timeout=20)
    record("POST /blocks/{id} without auth -> 401", r.status_code == 401, f"status={r.status_code}")

    tokA, uidA, _, _ = make_user("blockA")
    put_profile(tokA, "Anna Bloccante", "Firenze")
    tokB, uidB, _, _ = make_user("blockB")
    put_profile(tokB, "Bruno Bloccato", "Napoli")

    # Block self -> 400
    rself = httpx.post(f"{BASE}/blocks/{uidA}", headers=auth_headers(tokA), timeout=20)
    detail = ""
    try:
        detail = rself.json().get("detail", "")
    except Exception:
        detail = rself.text
    record("Block self -> 400", rself.status_code == 400 and "stesso" in detail.lower(),
           f"status={rself.status_code} detail={detail[:100]}")

    # Block non-existent -> 404
    bogus = str(uuid.uuid4())
    rne = httpx.post(f"{BASE}/blocks/{bogus}", headers=auth_headers(tokA), timeout=20)
    try:
        detail = rne.json().get("detail", "")
    except Exception:
        detail = rne.text
    record("Block non-existent user -> 404", rne.status_code == 404 and "non trovato" in detail.lower(),
           f"status={rne.status_code} detail={detail[:100]}")

    # Block valid -> 200
    rb = httpx.post(f"{BASE}/blocks/{uidB}", headers=auth_headers(tokA), timeout=20)
    ok = rb.status_code == 200 and rb.json().get("blocked_id") == uidB and rb.json().get("ok") is True
    record("Block valid user -> 200 {ok:true, blocked_id}", ok,
           f"status={rb.status_code} body={rb.text[:100]}")

    # Idempotent re-block
    rb2 = httpx.post(f"{BASE}/blocks/{uidB}", headers=auth_headers(tokA), timeout=20)
    record("Re-block same user (idempotent) -> 200", rb2.status_code == 200, f"status={rb2.status_code}")

    # GET /blocks -> contains B
    rg = httpx.get(f"{BASE}/blocks", headers=auth_headers(tokA), timeout=20)
    items = rg.json() if rg.status_code == 200 else []
    found = any(it.get("user_id") == uidB for it in items)
    record("GET /blocks returns the blocked user with profile fields", rg.status_code == 200 and found,
           f"status={rg.status_code} items={items}")

    # DELETE /blocks/{user_id} -> 200
    rd = httpx.delete(f"{BASE}/blocks/{uidB}", headers=auth_headers(tokA), timeout=20)
    record("DELETE /blocks/{id} -> 200 {ok:true, unblocked_id}",
           rd.status_code == 200 and rd.json().get("unblocked_id") == uidB,
           f"status={rd.status_code} body={rd.text[:100]}")

    # DELETE again (no existing block) -> still 200 (idempotent)
    rd2 = httpx.delete(f"{BASE}/blocks/{uidB}", headers=auth_headers(tokA), timeout=20)
    record("DELETE /blocks/{id} when no block exists (idempotent)",
           rd2.status_code == 200, f"status={rd2.status_code}")

    # Fresh user GET /blocks empty
    tokC, uidC, _, _ = make_user("blockC")
    rgc = httpx.get(f"{BASE}/blocks", headers=auth_headers(tokC), timeout=20)
    record("GET /blocks for fresh user -> empty list",
           rgc.status_code == 200 and rgc.json() == [],
           f"status={rgc.status_code} body={rgc.text[:80]}")

    return tokA, uidA, tokB, uidB


# -----------------------------------------------------------------------------
# 4) Block-filter on GET /api/doni (symmetric)
# -----------------------------------------------------------------------------
def t_blocks_filter():
    # Setup two users with one dono each
    tokA, uidA, _, _ = make_user("filterA")
    put_profile(tokA, "Filter Anna", "Torino")
    tokB, uidB, _, _ = make_user("filterB")
    put_profile(tokB, "Filter Bruno", "Genova")

    fotoA = upload_image(tokA)
    fotoB = upload_image(tokB)
    donoA = create_dono(tokA, fotoA, "Lampada vintage di A")["id"]
    donoB = create_dono(tokB, fotoB, "Bicicletta di B")["id"]

    # Both visible initially
    rlistA = httpx.get(f"{BASE}/doni", headers=auth_headers(tokA), timeout=20)
    items = rlistA.json() if rlistA.status_code == 200 else []
    sees_B = any(d["id"] == donoB for d in items)
    record("Before block: A sees B's dono in /doni", rlistA.status_code == 200 and sees_B,
           f"sees_B={sees_B} total={len(items)}")

    # A blocks B
    rb = httpx.post(f"{BASE}/blocks/{uidB}", headers=auth_headers(tokA), timeout=20)
    if rb.status_code != 200:
        record("Block-filter test cannot proceed (block API broken)", False, f"status={rb.status_code} body={rb.text[:100]}")
        return

    # A's /doni excludes B's dono
    rlistA2 = httpx.get(f"{BASE}/doni", headers=auth_headers(tokA), timeout=20)
    items = rlistA2.json()
    has_B = any(d["id"] == donoB for d in items)
    record("After A blocks B: A's /doni excludes B's dono", not has_B,
           f"donoB present={has_B} total={len(items)}")

    # B's /doni also excludes A's dono (symmetric)
    rlistB = httpx.get(f"{BASE}/doni", headers=auth_headers(tokB), timeout=20)
    items = rlistB.json()
    has_A = any(d["id"] == donoA for d in items)
    record("Symmetric filter: B's /doni excludes A's dono", not has_A,
           f"donoA present={has_A} total={len(items)}")

    # Unblock -> both reappear
    httpx.delete(f"{BASE}/blocks/{uidB}", headers=auth_headers(tokA), timeout=20)
    rlistA3 = httpx.get(f"{BASE}/doni", headers=auth_headers(tokA), timeout=20)
    sees_B = any(d["id"] == donoB for d in rlistA3.json())
    rlistB2 = httpx.get(f"{BASE}/doni", headers=auth_headers(tokB), timeout=20)
    sees_A = any(d["id"] == donoA for d in rlistB2.json())
    record("After unblock: both doni reappear in /doni for both", sees_A and sees_B,
           f"A_sees_B={sees_B} B_sees_A={sees_A}")


# -----------------------------------------------------------------------------
# 5) REGRESSION smoke
# -----------------------------------------------------------------------------
def t_regression():
    # register, login, me, upload, dono, list, conv start, recensioni list
    email = f"smoke-{uuid.uuid4().hex[:8]}@joytest.it"
    pwd = "JoyTest123!"
    r = httpx.post(f"{BASE}/auth/register", json={"email": email, "password": pwd}, timeout=20)
    record("Regression: POST /auth/register", r.status_code == 200, f"status={r.status_code}")
    if r.status_code != 200:
        return
    tok = r.json()["access_token"]
    uid = r.json()["user_id"]

    rl = httpx.post(f"{BASE}/auth/login", json={"email": email, "password": pwd}, timeout=20)
    record("Regression: POST /auth/login", rl.status_code == 200, f"status={rl.status_code}")

    rm = httpx.get(f"{BASE}/auth/me", headers=auth_headers(tok), timeout=20)
    record("Regression: GET /auth/me", rm.status_code == 200, f"status={rm.status_code}")

    put_profile(tok, "Smoke User", "Roma")
    ru = httpx.post(f"{BASE}/uploads/image", headers=auth_headers(tok),
                    json={"base64": TINY_PNG_B64}, timeout=60)
    ok_url = ru.status_code == 200 and ru.json().get("secure_url", "").startswith("https://res.cloudinary.com/")
    record("Regression: POST /uploads/image (Cloudinary)", ok_url,
           f"status={ru.status_code} secure_url={ru.json().get('secure_url', '')[:60] if ru.status_code==200 else ''}")
    foto = ru.json()["secure_url"] if ru.status_code == 200 else ""

    rd = httpx.post(f"{BASE}/doni", headers=auth_headers(tok), json={
        "titolo": "Smoke gift", "descrizione": "regression",
        "categoria": "altro", "lat": 41.9, "lng": 12.5, "foto_urls": [foto],
    }, timeout=20)
    record("Regression: POST /doni", rd.status_code == 200, f"status={rd.status_code}")

    rlist = httpx.get(f"{BASE}/doni", headers=auth_headers(tok), timeout=20)
    record("Regression: GET /doni", rlist.status_code == 200, f"status={rlist.status_code}")

    # need a second user to start a conv
    tok2, uid2, _, _ = make_user("smokeB")
    put_profile(tok2, "Smoke B", "Milano")
    rconv = httpx.post(f"{BASE}/conversazioni/start/{uid2}", headers=auth_headers(tok), timeout=20)
    record("Regression: POST /conversazioni/start/{other_user_id}",
           rconv.status_code == 200, f"status={rconv.status_code}")

    rrec = httpx.get(f"{BASE}/users/{uid2}/recensioni", headers=auth_headers(tok), timeout=20)
    record("Regression: GET /recensioni/utente/{user_id} (via /users/{id}/recensioni)",
           rrec.status_code == 200, f"status={rrec.status_code} body={rrec.text[:80]}")

    # alt path /api/recensioni/utente/{user_id}
    rrec2 = httpx.get(f"{BASE}/recensioni/utente/{uid2}", headers=auth_headers(tok), timeout=20)
    record("Regression alt: GET /api/recensioni/utente/{user_id}",
           rrec2.status_code in (200, 404), f"status={rrec2.status_code}")


# -----------------------------------------------------------------------------
def main():
    print(f"BASE={BASE}")
    t_health()
    try:
        t_delete_account()
    except Exception as e:
        record("t_delete_account suite", False, f"exception: {e}")
    try:
        t_segnalazioni()
    except Exception as e:
        record("t_segnalazioni suite", False, f"exception: {e}")
    try:
        t_blocks_basic()
    except Exception as e:
        record("t_blocks_basic suite", False, f"exception: {e}")
    try:
        t_blocks_filter()
    except Exception as e:
        record("t_blocks_filter suite", False, f"exception: {e}")
    try:
        t_regression()
    except Exception as e:
        record("t_regression suite", False, f"exception: {e}")

    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    passed = sum(1 for _, ok, _ in results if ok)
    failed = [r for r in results if not r[1]]
    print(f"TOTAL: {len(results)} | PASS: {passed} | FAIL: {len(failed)}")
    if failed:
        print("\nFailed tests:")
        for name, _, det in failed:
            print(f"  - {name}: {det}")
    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main())
