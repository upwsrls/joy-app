"""Profile tests: GET /api/profile/me, PUT /api/profile/me, GET /api/profile/{user_id}"""
import requests
import uuid
from conftest import API


def test_get_my_profile_returns_null_for_new_user(session, make_user):
    u = make_user('TEST_profnew')
    r = session.get(f"{API}/profile/me", headers=u['headers'])
    assert r.status_code == 200, r.text
    # Should be null (None) initially
    assert r.json() is None


def test_put_profile_then_get(session, user_a):
    payload = {
        'nome': 'Mario Rossi',
        'citta': 'Milano',
        'telefono': '+390123456789',
        'foto_base64': None,
    }
    r = session.put(f"{API}/profile/me", json=payload, headers=user_a['headers'])
    assert r.status_code == 200, r.text
    data = r.json()
    assert data['nome'] == 'Mario Rossi'
    assert data['citta'] == 'Milano'
    assert data['user_id'] == user_a['user_id']

    # GET to verify persistence
    g = session.get(f"{API}/profile/me", headers=user_a['headers'])
    assert g.status_code == 200
    gdata = g.json()
    assert gdata is not None
    assert gdata['nome'] == 'Mario Rossi'
    assert gdata['citta'] == 'Milano'
    assert gdata['telefono'] == '+390123456789'


def test_put_profile_missing_required_fields_returns_422(session, user_a):
    # nome missing
    r = session.put(f"{API}/profile/me", json={'citta': 'Roma'}, headers=user_a['headers'])
    assert r.status_code == 422
    # citta missing
    r = session.put(f"{API}/profile/me", json={'nome': 'Tizio'}, headers=user_a['headers'])
    assert r.status_code == 422


def test_put_profile_upserts_idempotent(session, user_a):
    # First PUT
    r1 = session.put(f"{API}/profile/me", json={'nome': 'A', 'citta': 'Roma'}, headers=user_a['headers'])
    assert r1.status_code == 200
    # Second PUT updates same record
    r2 = session.put(f"{API}/profile/me", json={'nome': 'A2', 'citta': 'Torino'}, headers=user_a['headers'])
    assert r2.status_code == 200
    assert r2.json()['nome'] == 'A2'
    assert r2.json()['citta'] == 'Torino'

    g = session.get(f"{API}/profile/me", headers=user_a['headers'])
    assert g.json()['nome'] == 'A2'
    assert g.json()['citta'] == 'Torino'


def test_get_profile_by_user_id(session, user_a, user_b):
    # ensure user_a has a profile
    session.put(f"{API}/profile/me", json={'nome': 'UserA', 'citta': 'Napoli'}, headers=user_a['headers'])
    # user_b reads user_a's profile
    r = session.get(f"{API}/profile/{user_a['user_id']}", headers=user_b['headers'])
    assert r.status_code == 200, r.text
    data = r.json()
    assert data is not None
    assert data['user_id'] == user_a['user_id']
    assert data['nome'] == 'UserA'
    assert data['citta'] == 'Napoli'


def test_get_profile_unknown_user_returns_null(session, user_a):
    fake = str(uuid.uuid4())
    r = session.get(f"{API}/profile/{fake}", headers=user_a['headers'])
    assert r.status_code == 200
    assert r.json() is None


def test_profile_endpoints_require_auth():
    assert requests.get(f"{API}/profile/me").status_code == 401
    assert requests.put(f"{API}/profile/me", json={'nome': 'X', 'citta': 'Y'}).status_code == 401
    assert requests.get(f"{API}/profile/{uuid.uuid4()}").status_code == 401
