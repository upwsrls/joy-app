"""Backend tests for JOY V7a additions: Ritira + Recensioni + Donatore rating.

Runs end-to-end against EXPO_PUBLIC_BACKEND_URL/api.
"""
import sys
import uuid
import requests

FRONTEND_ENV = '/app/frontend/.env'


def _load_backend_url() -> str:
    base = None
    try:
        with open(FRONTEND_ENV, 'r') as f:
            for line in f:
                line = line.strip()
                if line.startswith('EXPO_PUBLIC_BACKEND_URL='):
                    base = line.split('=', 1)[1].strip().strip('"').strip("'")
                    break
    except FileNotFoundError:
        pass
    if not base:
        base = 'http://localhost:8001'
    return base.rstrip('/') + '/api'


API = _load_backend_url()
print(f'[i] Using API base: {API}')

# 1x1 transparent PNG base64
PNG_1x1 = (
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
)

results = []  # list of (name, ok, detail)


def record(name, ok, detail=''):
    tag = 'PASS' if ok else 'FAIL'
    print(f'[{tag}] {name} :: {detail}')
    results.append((name, ok, detail))


def _h(token: str):
    return {'Authorization': f'Bearer {token}'}


def register_user(email: str, password: str = 'test123') -> dict:
    r = requests.post(f'{API}/auth/register', json={'email': email, 'password': password}, timeout=30)
    assert r.status_code == 200, f'register {email}: {r.status_code} {r.text}'
    return r.json()


def login_user(email: str, password: str) -> dict:
    r = requests.post(f'{API}/auth/login', json={'email': email, 'password': password}, timeout=30)
    assert r.status_code == 200, f'login {email}: {r.status_code} {r.text}'
    return r.json()


def upsert_profile(token: str, nome: str, citta: str, telefono: str, foto_url: str):
    r = requests.put(
        f'{API}/profile/me',
        headers=_h(token),
        json={'nome': nome, 'citta': citta, 'telefono': telefono, 'foto_url': foto_url},
        timeout=30,
    )
    assert r.status_code == 200, f'profile/me: {r.status_code} {r.text}'
    return r.json()


def upload_image(token: str) -> str:
    r = requests.post(f'{API}/uploads/image', headers=_h(token), json={'base64': PNG_1x1}, timeout=60)
    assert r.status_code == 200, f'uploads/image: {r.status_code} {r.text}'
    body = r.json()
    assert body['secure_url'].startswith('https://res.cloudinary.com/drmrh9h7f/'), body
    return body['secure_url']


def create_dono(token: str, titolo: str, foto_urls):
    body = {
        'titolo': titolo,
        'descrizione': 'Test gioia V7a',
        'categoria': 'oggetti',
        'lat': 41.9028,
        'lng': 12.4964,
        'foto_urls': foto_urls,
    }
    r = requests.post(f'{API}/doni', headers=_h(token), json=body, timeout=60)
    assert r.status_code == 200, f'POST /doni: {r.status_code} {r.text}'
    return r.json()


def main():
    # --- REGRESSION: existing endpoints ---
    try:
        rA = login_user('test1@joy.it', 'test123')
        tokenA = rA['access_token']
        userA_id = rA['user_id']
        record('login test1@joy.it (user A)', True, f'user_id={userA_id}')
    except Exception as e:
        record('login test1@joy.it (user A)', False, str(e))
        return _finish()

    try:
        r = requests.get(f'{API}/auth/me', headers=_h(tokenA), timeout=30)
        ok = r.status_code == 200 and r.json().get('id') == userA_id
        record('GET /auth/me', ok, f'status={r.status_code}')
    except Exception as e:
        record('GET /auth/me', False, str(e))

    try:
        r = requests.get(f'{API}/profile/me', headers=_h(tokenA), timeout=30)
        record('GET /profile/me (user A)', r.status_code == 200, f'status={r.status_code}')
        pA = r.json() or {}
        if not pA or not pA.get('nome') or not pA.get('telefono'):
            upsert_profile(tokenA, 'Alessandro Bianchi', 'Roma', '+393331112233',
                           'https://res.cloudinary.com/drmrh9h7f/image/upload/v1/joy/placeholder.png')
    except Exception as e:
        record('GET /profile/me (user A)', False, str(e))

    try:
        r = requests.get(f'{API}/doni', headers=_h(tokenA), timeout=30)
        record('GET /doni list (regression)', r.status_code == 200 and isinstance(r.json(), list),
               f'status={r.status_code}, n={len(r.json()) if r.status_code==200 else "?"}')
    except Exception as e:
        record('GET /doni list (regression)', False, str(e))

    # --- Create fresh users B, C, D ---
    suffix = uuid.uuid4().hex[:8]
    emails = {
        'B': f'beatrice.ricciardi+{suffix}@joy.it',
        'C': f'carlo.moretti+{suffix}@joy.it',
        'D': f'davide.sartori+{suffix}@joy.it',
    }
    users = {}
    try:
        for k, em in emails.items():
            reg = register_user(em, 'test123')
            users[k] = {'token': reg['access_token'], 'id': reg['user_id'], 'email': em}
        record('register users B/C/D', True,
               f"B={users['B']['id'][:8]} C={users['C']['id'][:8]} D={users['D']['id'][:8]}")
    except Exception as e:
        record('register users B/C/D', False, str(e))
        return _finish()

    try:
        upsert_profile(users['B']['token'], 'Beatrice Ricciardi', 'Milano', '+393334445566',
                       'https://res.cloudinary.com/drmrh9h7f/image/upload/v1/joy/avatarB.png')
        upsert_profile(users['C']['token'], 'Carlo Moretti', 'Torino', '+393336667788',
                       'https://res.cloudinary.com/drmrh9h7f/image/upload/v1/joy/avatarC.png')
        upsert_profile(users['D']['token'], 'Davide Sartori', 'Napoli', '+393338889900',
                       'https://res.cloudinary.com/drmrh9h7f/image/upload/v1/joy/avatarD.png')
        record('PUT /profile/me for B/C/D', True)
    except Exception as e:
        record('PUT /profile/me for B/C/D', False, str(e))
        return _finish()

    # --- Upload images via A and create two doni ---
    try:
        url1 = upload_image(tokenA)
        url2 = upload_image(tokenA)
        record('POST /uploads/image x2 (Cloudinary)', True, 'urls ok')
    except Exception as e:
        record('POST /uploads/image x2 (Cloudinary)', False, str(e))
        return _finish()

    try:
        dono1 = create_dono(tokenA, f'Libri di filosofia {suffix}', [url1])
        dono2 = create_dono(tokenA, f'Bicicletta vintage {suffix}', [url2])
        for d, label in [(dono1, 'dono1'), (dono2, 'dono2')]:
            missing = [k for k in ['ritirato_da', 'ritirato_at', 'donatore_telefono',
                                   'donatore_rating_avg', 'donatore_rating_count'] if k not in d]
            assert not missing, f'{label} missing fields: {missing} body={d}'
            assert d['ritirato_da'] is None and d['ritirato_at'] is None, f'{label} ritirato_* must start null'
            assert d['donatore_rating_count'] == 0, f'{label} rating_count must start 0'
            # rating_avg may be None when no reviews yet for user A; if test1 has prior reviews this may be non-null.
        record('POST /doni x2 includes V7a fields with defaults', True)
    except Exception as e:
        record('POST /doni x2 includes V7a fields with defaults', False, str(e))
        return _finish()

    dono1_id = dono1['id']
    dono2_id = dono2['id']

    # A cannot ritire own dono
    try:
        r = requests.post(f'{API}/doni/{dono1_id}/ritira', headers=_h(tokenA), timeout=30)
        record('A ritira own dono -> 400', r.status_code == 400,
               f'status={r.status_code} body={r.text[:120]}')
    except Exception as e:
        record('A ritira own dono -> 400', False, str(e))

    # Non-existing id
    try:
        r = requests.post(f'{API}/doni/{uuid.uuid4()}/ritira', headers=_h(users['B']['token']), timeout=30)
        record('Ritira non-existing dono -> 404', r.status_code == 404, f'status={r.status_code}')
    except Exception as e:
        record('Ritira non-existing dono -> 404', False, str(e))

    # B ritira dono1 -> 200
    try:
        r = requests.post(f'{API}/doni/{dono1_id}/ritira', headers=_h(users['B']['token']), timeout=30)
        ok = (r.status_code == 200 and r.json().get('ok') is True
              and r.json().get('dono_id') == dono1_id and r.json().get('needs_review') is True)
        record('B ritira dono1 -> 200 + needs_review', ok, f'status={r.status_code} body={r.text[:200]}')
    except Exception as e:
        record('B ritira dono1 -> 200 + needs_review', False, str(e))

    # B re-ritira -> 400
    try:
        r = requests.post(f'{API}/doni/{dono1_id}/ritira', headers=_h(users['B']['token']), timeout=30)
        record('B re-ritira dono1 -> 400', r.status_code == 400, f'status={r.status_code}')
    except Exception as e:
        record('B re-ritira dono1 -> 400', False, str(e))

    # GET /doni list must not include dono1 now
    try:
        r = requests.get(f'{API}/doni', headers=_h(tokenA), timeout=30)
        ids = [d['id'] for d in r.json()] if r.status_code == 200 else []
        record('GET /doni excludes ritirato dono1', dono1_id not in ids, f'present={dono1_id in ids}')
    except Exception as e:
        record('GET /doni excludes ritirato dono1', False, str(e))

    # GET /doni/{dono1_id} still accessible, ritirato fields populated
    try:
        r = requests.get(f'{API}/doni/{dono1_id}', headers=_h(users['B']['token']), timeout=30)
        body = r.json() if r.status_code == 200 else {}
        ok = (r.status_code == 200 and body.get('ritirato') is True
              and body.get('ritirato_da') == users['B']['id'] and body.get('ritirato_at'))
        record('GET /doni/{id} after ritiro has ritirato_da/at', ok,
               f'status={r.status_code} ritirato_da={body.get("ritirato_da")} ritirato_at={body.get("ritirato_at")}')
    except Exception as e:
        record('GET /doni/{id} after ritiro has ritirato_da/at', False, str(e))

    # C tries to review without ritiro -> 403
    try:
        r = requests.post(f'{API}/recensioni', headers=_h(users['C']['token']),
                          json={'dono_id': dono1_id, 'stars': 5, 'commento': 'Bellissimo'}, timeout=30)
        record('C reviews without ritiro -> 403', r.status_code == 403,
               f'status={r.status_code} body={r.text[:160]}')
    except Exception as e:
        record('C reviews without ritiro -> 403', False, str(e))

    # B reviews dono1 with stars=5 -> 200
    try:
        r = requests.post(f'{API}/recensioni', headers=_h(users['B']['token']),
                          json={'dono_id': dono1_id, 'stars': 5,
                                'commento': 'Donatore gentilissimo, libri perfetti!'}, timeout=30)
        body = r.json() if r.status_code == 200 else {}
        ok = (r.status_code == 200 and body.get('donor_id') == userA_id
              and body.get('reviewer_id') == users['B']['id'] and body.get('stars') == 5
              and body.get('reviewer_nome') == 'Beatrice Ricciardi'
              and isinstance(body.get('stars'), int))
        record('B reviews dono1 stars=5 -> 200', ok, f'status={r.status_code} body={r.text[:250]}')
    except Exception as e:
        record('B reviews dono1 stars=5 -> 200', False, str(e))

    # Duplicate B review -> 400
    try:
        r = requests.post(f'{API}/recensioni', headers=_h(users['B']['token']),
                          json={'dono_id': dono1_id, 'stars': 4, 'commento': 'duplicato'}, timeout=30)
        record('B duplicate review -> 400', r.status_code == 400,
               f'status={r.status_code} body={r.text[:160]}')
    except Exception as e:
        record('B duplicate review -> 400', False, str(e))

    # stars=0 -> 422
    try:
        r = requests.post(f'{API}/recensioni', headers=_h(users['B']['token']),
                          json={'dono_id': dono1_id, 'stars': 0}, timeout=30)
        record('Recensione stars=0 -> 422', r.status_code == 422, f'status={r.status_code}')
    except Exception as e:
        record('Recensione stars=0 -> 422', False, str(e))

    # stars=6 -> 422
    try:
        r = requests.post(f'{API}/recensioni', headers=_h(users['B']['token']),
                          json={'dono_id': dono1_id, 'stars': 6}, timeout=30)
        record('Recensione stars=6 -> 422', r.status_code == 422, f'status={r.status_code}')
    except Exception as e:
        record('Recensione stars=6 -> 422', False, str(e))

    # GET /users/{A}/rating -> avg 5.0, count 1
    try:
        r = requests.get(f'{API}/users/{userA_id}/rating', headers=_h(tokenA), timeout=30)
        body = r.json() if r.status_code == 200 else {}
        ok = r.status_code == 200 and body.get('avg') == 5.0 and body.get('count') == 1
        record('GET /users/{A}/rating after B 5* -> {5.0,1}', ok, f'status={r.status_code} body={body}')
    except Exception as e:
        record('GET /users/{A}/rating after B 5* -> {5.0,1}', False, str(e))

    # D ritira dono2 and rates 3
    try:
        r = requests.post(f'{API}/doni/{dono2_id}/ritira', headers=_h(users['D']['token']), timeout=30)
        record('D ritira dono2 -> 200', r.status_code == 200, f'status={r.status_code}')
    except Exception as e:
        record('D ritira dono2 -> 200', False, str(e))

    try:
        r = requests.post(f'{API}/recensioni', headers=_h(users['D']['token']),
                          json={'dono_id': dono2_id, 'stars': 3, 'commento': 'Bici ok'}, timeout=30)
        record('D reviews dono2 stars=3 -> 200', r.status_code == 200,
               f'status={r.status_code} body={r.text[:200]}')
    except Exception as e:
        record('D reviews dono2 stars=3 -> 200', False, str(e))

    # rating -> avg 4.0, count 2
    try:
        r = requests.get(f'{API}/users/{userA_id}/rating', headers=_h(tokenA), timeout=30)
        body = r.json() if r.status_code == 200 else {}
        ok = r.status_code == 200 and body.get('avg') == 4.0 and body.get('count') == 2
        record('GET /users/{A}/rating after D 3* -> {4.0,2}', ok, f'status={r.status_code} body={body}')
    except Exception as e:
        record('GET /users/{A}/rating after D 3* -> {4.0,2}', False, str(e))

    # GET /doni/{dono2_id} donatore_rating_avg=4.0 count=2
    try:
        r = requests.get(f'{API}/doni/{dono2_id}', headers=_h(users['D']['token']), timeout=30)
        body = r.json() if r.status_code == 200 else {}
        ok = (r.status_code == 200 and body.get('donatore_rating_avg') == 4.0
              and body.get('donatore_rating_count') == 2 and body.get('donatore_telefono'))
        record('GET /doni/{dono2} avg=4.0 count=2 + donatore_telefono', ok,
               f'status={r.status_code} avg={body.get("donatore_rating_avg")} '
               f'count={body.get("donatore_rating_count")} tel={body.get("donatore_telefono")}')
    except Exception as e:
        record('GET /doni/{dono2} avg=4.0 count=2 + donatore_telefono', False, str(e))

    # Non-existing user_id rating -> {avg:null, count:0}
    try:
        fake_id = str(uuid.uuid4())
        r = requests.get(f'{API}/users/{fake_id}/rating', headers=_h(tokenA), timeout=30)
        body = r.json() if r.status_code == 200 else {}
        ok = r.status_code == 200 and body.get('avg') is None and body.get('count') == 0
        record('GET /users/{fake}/rating -> {null,0} not 404', ok, f'status={r.status_code} body={body}')
    except Exception as e:
        record('GET /users/{fake}/rating -> {null,0} not 404', False, str(e))

    # GET /users/{A}/recensioni -> 2 items with reviewer_nome
    try:
        r = requests.get(f'{API}/users/{userA_id}/recensioni', headers=_h(tokenA), timeout=30)
        items = r.json() if r.status_code == 200 else []
        names = [i.get('reviewer_nome') for i in items]
        has_B = 'Beatrice Ricciardi' in names
        has_D = 'Davide Sartori' in names
        ok = r.status_code == 200 and isinstance(items, list) and len(items) >= 2 and has_B and has_D
        record('GET /users/{A}/recensioni includes B and D with reviewer_nome', ok,
               f'status={r.status_code} n={len(items)} sample={names[:5]}')
    except Exception as e:
        record('GET /users/{A}/recensioni includes B and D with reviewer_nome', False, str(e))

    # Auth required on recensioni endpoints
    try:
        r = requests.post(f'{API}/doni/{dono1_id}/ritira', timeout=30)
        record('POST /doni/{id}/ritira without token -> 401/403', r.status_code in (401, 403),
               f'status={r.status_code}')
    except Exception as e:
        record('POST /doni/{id}/ritira without token -> 401/403', False, str(e))

    try:
        r = requests.post(f'{API}/recensioni', json={'dono_id': dono1_id, 'stars': 5}, timeout=30)
        record('POST /recensioni without token -> 401/403', r.status_code in (401, 403),
               f'status={r.status_code}')
    except Exception as e:
        record('POST /recensioni without token -> 401/403', False, str(e))

    return _finish()


def _finish():
    print('\n================ SUMMARY ================')
    passed = sum(1 for _, ok, _ in results if ok)
    total = len(results)
    for name, ok, _ in results:
        tag = 'PASS' if ok else 'FAIL'
        print(f'  [{tag}] {name}')
    print(f'\nTotal: {passed}/{total} passed')
    return 0 if passed == total else 1


if __name__ == '__main__':
    sys.exit(main() or 0)
