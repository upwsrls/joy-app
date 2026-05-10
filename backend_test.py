"""Comprehensive backend regression tests for JOY app V2.

Covers:
- Health
- Auth (register, login, me, OTP password reset)
- Profile
- Cloudinary upload
- Doni CRUD
- Chat conversations / messages
- Backward compatibility with legacy base64 docs
"""
from __future__ import annotations

import asyncio
import base64
import io
import os
import re
import sys
import time
import uuid
from pathlib import Path

import requests
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# Load env
ENV_FRONT = Path('/app/frontend/.env')
ENV_BACK = Path('/app/backend/.env')
load_dotenv(ENV_FRONT)
load_dotenv(ENV_BACK)

BASE_URL = (os.environ.get('EXPO_PUBLIC_BACKEND_URL') or 'http://localhost:8001').rstrip('/') + '/api'
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ.get('DB_NAME', 'test_database')
print(f'BASE_URL = {BASE_URL}')
print(f'MONGO_URL = {MONGO_URL}, DB_NAME = {DB_NAME}')

results: list[tuple[str, str, str]] = []  # (area, name, "PASS"/"FAIL: detail")


def _rec(area: str, name: str, ok: bool, detail: str = ''):
    status = 'PASS' if ok else f'FAIL: {detail}'
    print(f'[{area}] {name} -> {status}')
    results.append((area, name, status))


def _eq(area: str, name: str, got, expected, extra: str = ''):
    ok = got == expected
    _rec(area, name, ok, f'got={got!r} expected={expected!r} {extra}')
    return ok


# Tiny 1x1 PNG (valid)
ONE_PX_PNG_B64 = (
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk'
    'YPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
)
DATA_URL_PNG = f'data:image/png;base64,{ONE_PX_PNG_B64}'


# -------------------------------------------------------------------
# 1. HEALTH
# -------------------------------------------------------------------
def test_health():
    r = requests.get(f'{BASE_URL}/', timeout=15)
    ok = r.status_code == 200 and r.json().get('message') == 'JOY API ready' and r.json().get('version') == '2.0.0'
    _rec('HEALTH', 'GET /api/', ok, f'status={r.status_code} body={r.text}')


# -------------------------------------------------------------------
# 2. AUTH
# -------------------------------------------------------------------
auth_state = {}


def test_auth():
    suffix = uuid.uuid4().hex[:8]
    email_a = f'mario.rossi.{suffix}@joy.it'
    pwd_a = 'GiardinoSegreto42'

    # register
    r = requests.post(f'{BASE_URL}/auth/register', json={'email': email_a, 'password': pwd_a}, timeout=15)
    ok = r.status_code == 200 and 'access_token' in r.json() and r.json().get('email') == email_a
    _rec('AUTH', '2a register fresh', ok, f'status={r.status_code} body={r.text[:300]}')
    if not ok:
        return False
    body = r.json()
    auth_state['email_a'] = email_a
    auth_state['pwd_a'] = pwd_a
    auth_state['token_a'] = body['access_token']
    auth_state['user_a'] = body['user_id']

    # duplicate
    r = requests.post(f'{BASE_URL}/auth/register', json={'email': email_a, 'password': pwd_a}, timeout=15)
    _rec('AUTH', '2b duplicate register -> 400', r.status_code == 400, f'status={r.status_code} body={r.text[:200]}')

    # login good
    r = requests.post(f'{BASE_URL}/auth/login', json={'email': email_a, 'password': pwd_a}, timeout=15)
    ok = r.status_code == 200 and r.json().get('user_id') == auth_state['user_a']
    _rec('AUTH', '2c login -> same user_id', ok, f'status={r.status_code} body={r.text[:200]}')

    # login wrong password
    r = requests.post(f'{BASE_URL}/auth/login', json={'email': email_a, 'password': 'WRONG-pass-1234'}, timeout=15)
    _rec('AUTH', '2d wrong password -> 401', r.status_code == 401, f'status={r.status_code}')

    # me with token
    r = requests.get(f'{BASE_URL}/auth/me', headers={'Authorization': f'Bearer {auth_state["token_a"]}'}, timeout=15)
    ok = r.status_code == 200 and r.json().get('id') == auth_state['user_a'] and r.json().get('email') == email_a
    _rec('AUTH', '2e GET /auth/me with token', ok, f'status={r.status_code} body={r.text[:200]}')

    # me without token
    r = requests.get(f'{BASE_URL}/auth/me', timeout=15)
    _rec('AUTH', '2f GET /auth/me w/o token -> 401', r.status_code == 401, f'status={r.status_code}')

    # forgot-password
    r = requests.post(f'{BASE_URL}/auth/forgot-password', json={'email': email_a}, timeout=15)
    _rec('AUTH', '2g forgot-password -> 200', r.status_code == 200, f'status={r.status_code} body={r.text[:200]}')

    # capture OTP from logs
    time.sleep(1)
    otp = _grep_otp_from_logs(email_a)
    if not otp:
        _rec('AUTH', '2g.otp capture from logs', False, 'OTP not found in /var/log/supervisor/backend.*.log')
        return False
    _rec('AUTH', '2g.otp capture from logs', True, f'otp={otp}')

    # verify-otp
    r = requests.post(f'{BASE_URL}/auth/verify-otp', json={'email': email_a, 'otp': otp}, timeout=15)
    ok = r.status_code == 200 and r.json().get('ok') is True
    _rec('AUTH', '2g.1 verify-otp -> 200 {ok:true}', ok, f'status={r.status_code} body={r.text[:200]}')

    # reset-password
    new_pwd = 'NuovaPasswordSicura99'
    r = requests.post(f'{BASE_URL}/auth/reset-password', json={'email': email_a, 'otp': otp, 'new_password': new_pwd}, timeout=15)
    ok = r.status_code == 200 and 'access_token' in r.json()
    _rec('AUTH', '2g.2 reset-password -> 200 + token', ok, f'status={r.status_code} body={r.text[:200]}')
    if ok:
        auth_state['token_a'] = r.json()['access_token']
        auth_state['pwd_a'] = new_pwd

    # login with new password
    r = requests.post(f'{BASE_URL}/auth/login', json={'email': email_a, 'password': new_pwd}, timeout=15)
    ok = r.status_code == 200 and r.json().get('user_id') == auth_state['user_a']
    _rec('AUTH', '2g.3 login w/ new password', ok, f'status={r.status_code} body={r.text[:200]}')
    if ok:
        auth_state['token_a'] = r.json()['access_token']

    return True


def _grep_otp_from_logs(email: str) -> str | None:
    """Search recent backend logs for the printed OTP for the given email."""
    log_paths = [
        '/var/log/supervisor/backend.err.log',
        '/var/log/supervisor/backend.out.log',
    ]
    pattern = re.compile(rf'Password reset OTP per {re.escape(email)}\s*:\s*(\d{{6}})')
    candidates: list[str] = []
    for p in log_paths:
        if not os.path.exists(p):
            continue
        try:
            # read last 200KB
            size = os.path.getsize(p)
            with open(p, 'rb') as f:
                f.seek(max(0, size - 200_000))
                data = f.read().decode('utf-8', errors='replace')
            for m in pattern.finditer(data):
                candidates.append(m.group(1))
        except Exception as e:
            print(f'log read err {p}: {e}')
    return candidates[-1] if candidates else None


# -------------------------------------------------------------------
# 3. PROFILE
# -------------------------------------------------------------------
def test_profile():
    h = {'Authorization': f'Bearer {auth_state["token_a"]}'}
    payload = {
        'nome': 'Mario Rossi',
        'citta': 'Milano',
        'telefono': '+393331234567',
        'foto_url': 'https://example.com/x.jpg',
    }
    r = requests.put(f'{BASE_URL}/profile/me', json=payload, headers=h, timeout=15)
    ok = r.status_code == 200 and r.json().get('nome') == 'Mario Rossi' and r.json().get('foto_url') == payload['foto_url']
    _rec('PROFILE', '3a PUT /profile/me', ok, f'status={r.status_code} body={r.text[:300]}')

    r = requests.get(f'{BASE_URL}/profile/me', headers=h, timeout=15)
    body = r.json() if r.status_code == 200 else {}
    ok = (
        r.status_code == 200
        and body.get('nome') == 'Mario Rossi'
        and body.get('citta') == 'Milano'
        and body.get('telefono') == '+393331234567'
        and body.get('foto_url') == payload['foto_url']
    )
    _rec('PROFILE', '3b GET /profile/me', ok, f'status={r.status_code} body={r.text[:300]}')

    # Get other user's profile (test1@joy.it). First find their user_id
    r = requests.post(f'{BASE_URL}/auth/login', json={'email': 'test1@joy.it', 'password': 'test123'}, timeout=15)
    if r.status_code == 200:
        other_uid = r.json()['user_id']
        r = requests.get(f'{BASE_URL}/profile/{other_uid}', headers=h, timeout=15)
        # 200 (with body or null) is acceptable
        ok = r.status_code == 200
        _rec('PROFILE', '3c GET /profile/{other_user_id}', ok, f'status={r.status_code} body={r.text[:200]}')
    else:
        _rec('PROFILE', '3c GET /profile/{other_user_id}', False, 'could not log in test1@joy.it to retrieve user_id')


# -------------------------------------------------------------------
# 4. CLOUDINARY UPLOAD
# -------------------------------------------------------------------
upload_state = {}


def test_uploads():
    # 4a no token
    r = requests.post(f'{BASE_URL}/uploads/image', json={'base64': ONE_PX_PNG_B64}, timeout=20)
    _rec('UPLOAD', '4a w/o token -> 401', r.status_code == 401, f'status={r.status_code}')

    h = {'Authorization': f'Bearer {auth_state["token_a"]}'}

    # 4b empty
    r = requests.post(f'{BASE_URL}/uploads/image', json={'base64': ''}, headers=h, timeout=20)
    _rec('UPLOAD', '4b empty base64 -> 400', r.status_code == 400, f'status={r.status_code} body={r.text[:200]}')

    # 4c valid PNG
    r = requests.post(f'{BASE_URL}/uploads/image', json={'base64': ONE_PX_PNG_B64}, headers=h, timeout=60)
    body = r.json() if r.status_code == 200 else {}
    secure_url = body.get('secure_url', '')
    ok = (
        r.status_code == 200
        and secure_url.startswith('https://res.cloudinary.com/drmrh9h7f/')
        and body.get('public_id')
    )
    _rec('UPLOAD', '4c valid PNG -> 200 with cloudinary url', ok, f'status={r.status_code} body={r.text[:400]}')
    if ok:
        upload_state['secure_url'] = secure_url
        upload_state['public_id'] = body['public_id']

    # 4d (optional) >12MB to trigger 413
    big = 'A' * (12 * 1024 * 1024 + 10)
    r = requests.post(f'{BASE_URL}/uploads/image', json={'base64': big}, headers=h, timeout=60)
    _rec('UPLOAD', '4d >12MB payload -> 413', r.status_code == 413, f'status={r.status_code}')


# -------------------------------------------------------------------
# 5. DONI
# -------------------------------------------------------------------
dono_state = {}


def test_doni():
    h = {'Authorization': f'Bearer {auth_state["token_a"]}'}
    secure_url = upload_state.get('secure_url') or 'https://res.cloudinary.com/drmrh9h7f/image/upload/v1/joy/dummy.jpg'

    # 5a create
    payload = {
        'titolo': 'Bicicletta da donare',
        'descrizione': 'Buono stato, freni revisionati',
        'categoria': 'sport',
        'lat': 45.4642,
        'lng': 9.19,
        'foto_urls': [secure_url],
    }
    r = requests.post(f'{BASE_URL}/doni', json=payload, headers=h, timeout=20)
    ok = r.status_code == 200 and r.json().get('titolo') == 'Bicicletta da donare'
    _rec('DONI', '5a POST /doni', ok, f'status={r.status_code} body={r.text[:300]}')
    if ok:
        dono_state['id'] = r.json()['id']

    # 5b empty foto_urls
    bad = dict(payload)
    bad['foto_urls'] = []
    r = requests.post(f'{BASE_URL}/doni', json=bad, headers=h, timeout=20)
    _rec('DONI', '5b empty foto_urls -> 400', r.status_code == 400, f'status={r.status_code}')

    # 5c GET list
    r = requests.get(f'{BASE_URL}/doni', headers=h, timeout=20)
    ids = [d.get('id') for d in r.json()] if r.status_code == 200 else []
    _rec('DONI', '5c GET /doni includes new', r.status_code == 200 and dono_state.get('id') in ids,
         f'status={r.status_code} count={len(ids)}')

    # 5d GET miei
    r = requests.get(f'{BASE_URL}/doni/miei', headers=h, timeout=20)
    if r.status_code == 200:
        items = r.json()
        ok = dono_state.get('id') in [d['id'] for d in items] and all(d['user_id'] == auth_state['user_a'] for d in items)
        _rec('DONI', '5d GET /doni/miei', ok, f'count={len(items)}')
    else:
        _rec('DONI', '5d GET /doni/miei', False, f'status={r.status_code}')

    # 5e GET detail
    r = requests.get(f'{BASE_URL}/doni/{dono_state.get("id")}', headers=h, timeout=20)
    ok = r.status_code == 200 and r.json().get('id') == dono_state.get('id')
    _rec('DONI', '5e GET /doni/{id}', ok, f'status={r.status_code} body={r.text[:200]}')

    # 5f DELETE as different user (we'll create one quickly)
    other_email = f'altro.{uuid.uuid4().hex[:6]}@joy.it'
    rr = requests.post(f'{BASE_URL}/auth/register', json={'email': other_email, 'password': 'TestB-1234'}, timeout=15)
    other_token = rr.json().get('access_token') if rr.status_code == 200 else None
    other_uid = rr.json().get('user_id') if rr.status_code == 200 else None
    if other_token and dono_state.get('id'):
        rd = requests.delete(
            f'{BASE_URL}/doni/{dono_state["id"]}',
            headers={'Authorization': f'Bearer {other_token}'},
            timeout=20,
        )
        _rec('DONI', '5f DELETE as non-owner -> 403', rd.status_code == 403, f'status={rd.status_code}')
        # save for chat tests
        dono_state['user_b_email'] = other_email
        dono_state['user_b_token'] = other_token
        dono_state['user_b_id'] = other_uid

    # 5g DELETE as owner
    if dono_state.get('id'):
        r = requests.delete(f'{BASE_URL}/doni/{dono_state["id"]}', headers=h, timeout=30)
        _rec('DONI', '5g DELETE as owner', r.status_code == 200, f'status={r.status_code} body={r.text[:200]}')

        # confirm not in list
        r = requests.get(f'{BASE_URL}/doni', headers=h, timeout=20)
        ids = [d['id'] for d in r.json()] if r.status_code == 200 else []
        _rec('DONI', '5g.1 deleted dono not in /doni list', dono_state['id'] not in ids,
             f'still present={dono_state["id"] in ids}')


# -------------------------------------------------------------------
# 6. CHAT
# -------------------------------------------------------------------
chat_state = {}


def test_chat():
    user_b_token = dono_state.get('user_b_token')
    user_b_id = dono_state.get('user_b_id')
    if not user_b_token:
        # Register user B inline if we don't have one
        email_b = f'utenteB.{uuid.uuid4().hex[:6]}@joy.it'
        r = requests.post(f'{BASE_URL}/auth/register', json={'email': email_b, 'password': 'TestB-1234'}, timeout=15)
        if r.status_code != 200:
            _rec('CHAT', '6a register user B', False, f'status={r.status_code} body={r.text[:200]}')
            return
        user_b_token = r.json()['access_token']
        user_b_id = r.json()['user_id']

    # create profile for B
    hb = {'Authorization': f'Bearer {user_b_token}'}
    rb = requests.put(f'{BASE_URL}/profile/me', json={
        'nome': 'Lucia Bianchi', 'citta': 'Roma', 'telefono': '', 'foto_url': None,
    }, headers=hb, timeout=15)
    _rec('CHAT', '6a profile for user B', rb.status_code == 200, f'status={rb.status_code}')

    ha = {'Authorization': f'Bearer {auth_state["token_a"]}'}

    # 6h start with self -> 400
    r = requests.post(f'{BASE_URL}/conversazioni/start/{auth_state["user_a"]}', headers=ha, timeout=15)
    _rec('CHAT', '6h start with self -> 400', r.status_code == 400, f'status={r.status_code}')

    # 6b start
    r = requests.post(f'{BASE_URL}/conversazioni/start/{user_b_id}', headers=ha, timeout=15)
    ok = r.status_code == 200 and r.json().get('id')
    _rec('CHAT', '6b start /conversazioni/start/{B}', ok, f'status={r.status_code} body={r.text[:200]}')
    if not ok:
        return
    conv_id = r.json()['id']
    chat_state['conv_id'] = conv_id

    # 6c message from A
    r = requests.post(f'{BASE_URL}/conversazioni/{conv_id}/messaggi',
                      json={'testo': 'Ciao Lucia, è ancora disponibile?'}, headers=ha, timeout=15)
    _rec('CHAT', '6c send message from A', r.status_code == 200, f'status={r.status_code} body={r.text[:200]}')

    time.sleep(0.5)

    # 6d message from B
    r = requests.post(f'{BASE_URL}/conversazioni/{conv_id}/messaggi',
                      json={'testo': 'Ciao Mario, sì certo!'}, headers=hb, timeout=15)
    _rec('CHAT', '6d send message from B', r.status_code == 200, f'status={r.status_code} body={r.text[:200]}')

    # 6e GET conversazioni from A
    r = requests.get(f'{BASE_URL}/conversazioni', headers=ha, timeout=15)
    if r.status_code == 200:
        convs = r.json()
        match = next((c for c in convs if c['id'] == conv_id), None)
        ok = match is not None and 'Ciao' in (match.get('ultimo_messaggio') or '')
        _rec('CHAT', '6e GET /conversazioni includes conv with ultimo_messaggio', ok, f'match={match}')
    else:
        _rec('CHAT', '6e GET /conversazioni', False, f'status={r.status_code}')

    # 6f GET messages chronological
    r = requests.get(f'{BASE_URL}/conversazioni/{conv_id}/messaggi', headers=ha, timeout=15)
    if r.status_code == 200:
        msgs = r.json()
        timestamps = [m['created_at'] for m in msgs]
        ok = len(msgs) >= 2 and timestamps == sorted(timestamps)
        _rec('CHAT', '6f messages in chronological order', ok, f'count={len(msgs)} order_ok={timestamps == sorted(timestamps)}')
    else:
        _rec('CHAT', '6f GET /conversazioni/{id}/messaggi', False, f'status={r.status_code}')

    # 6g register user C, must be 403
    email_c = f'utenteC.{uuid.uuid4().hex[:6]}@joy.it'
    r = requests.post(f'{BASE_URL}/auth/register', json={'email': email_c, 'password': 'TestC-1234'}, timeout=15)
    if r.status_code == 200:
        token_c = r.json()['access_token']
        hc = {'Authorization': f'Bearer {token_c}'}
        rg = requests.get(f'{BASE_URL}/conversazioni/{conv_id}/messaggi', headers=hc, timeout=15)
        _rec('CHAT', '6g GET as user C -> 403', rg.status_code == 403, f'status={rg.status_code}')
        rp = requests.post(f'{BASE_URL}/conversazioni/{conv_id}/messaggi',
                           json={'testo': 'intruder'}, headers=hc, timeout=15)
        _rec('CHAT', '6g POST as user C -> 403', rp.status_code == 403, f'status={rp.status_code}')


# -------------------------------------------------------------------
# 7. BACKWARD COMPATIBILITY
# -------------------------------------------------------------------
async def test_backward_compat_async():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    h = {'Authorization': f'Bearer {auth_state["token_a"]}'}
    legacy_data_url = DATA_URL_PNG

    # 7a profile legacy
    legacy_user_id = f'legacy-{uuid.uuid4().hex[:8]}'
    legacy_user_doc = {
        'id': legacy_user_id,
        'email': f'{legacy_user_id}@legacy.joy.it',
        'password_hash': '$2b$12$AbCdEfGhIjKlMnOpQrStUu',  # fake bcrypt-like (not used for auth)
        'created_at': '2024-01-01T00:00:00+00:00',
    }
    legacy_profile_doc = {
        'user_id': legacy_user_id,
        'nome': 'Profilo Legacy',
        'citta': 'Torino',
        'telefono': '',
        'foto_base64': legacy_data_url,  # legacy field; no foto_url
        'created_at': '2024-01-01T00:00:00+00:00',
        'updated_at': '2024-01-01T00:00:00+00:00',
    }
    await db.users.insert_one(legacy_user_doc)
    await db.profiles.insert_one(legacy_profile_doc)

    try:
        r = requests.get(f'{BASE_URL}/profile/{legacy_user_id}', headers=h, timeout=15)
        ok = r.status_code == 200 and r.json() and r.json().get('foto_url') == legacy_data_url
        _rec('COMPAT', '7a legacy profile foto_base64 -> foto_url', ok,
             f'status={r.status_code} body={r.text[:300]}')
    finally:
        # cleanup later (after 7b)
        pass

    # 7b dono legacy
    legacy_dono_id = f'legacy-dono-{uuid.uuid4().hex[:8]}'
    legacy_dono_doc = {
        'id': legacy_dono_id,
        'user_id': legacy_user_id,
        'titolo': 'Vecchia gioia',
        'descrizione': 'doc legacy',
        'categoria': 'altro',
        'lat': 45.0,
        'lng': 7.6,
        'foto_base64_list': [legacy_data_url],  # legacy field
        'ritirato': False,
        'created_at': '2024-01-01T00:00:00+00:00',
    }
    await db.doni.insert_one(legacy_dono_doc)

    try:
        r = requests.get(f'{BASE_URL}/doni/{legacy_dono_id}', headers=h, timeout=15)
        body = r.json() if r.status_code == 200 else {}
        ok = (
            r.status_code == 200
            and body.get('id') == legacy_dono_id
            and isinstance(body.get('foto_urls'), list)
            and legacy_data_url in body.get('foto_urls', [])
        )
        _rec('COMPAT', '7b legacy dono foto_base64_list -> foto_urls', ok,
             f'status={r.status_code} body={r.text[:300]}')
    finally:
        # cleanup
        await db.doni.delete_one({'id': legacy_dono_id})
        await db.profiles.delete_one({'user_id': legacy_user_id})
        await db.users.delete_one({'id': legacy_user_id})
        client.close()


def test_backward_compat():
    asyncio.run(test_backward_compat_async())


# -------------------------------------------------------------------
# Main
# -------------------------------------------------------------------
def main():
    test_health()
    if not test_auth():
        print('AUTH failed; continuing best-effort')
    test_profile()
    test_uploads()
    test_doni()
    test_chat()
    test_backward_compat()

    print('\n========== SUMMARY ==========')
    fails = [r for r in results if r[2].startswith('FAIL')]
    for area, name, status in results:
        print(f'[{area}] {name} -> {status}')
    print(f'\nTOTAL: {len(results)}  PASS: {len(results) - len(fails)}  FAIL: {len(fails)}')
    return 0 if not fails else 1


if __name__ == '__main__':
    sys.exit(main())
