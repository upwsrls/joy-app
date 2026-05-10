"""Auth flow tests: /api/auth/register, /api/auth/login, /api/auth/me"""
import uuid
import requests
from conftest import API


def test_health_root():
    r = requests.get(f"{API}/")
    assert r.status_code == 200
    assert r.json().get('message')


def test_register_success_returns_jwt(session):
    email = f"TEST_reg_{uuid.uuid4().hex[:8]}@joy.it".lower()
    r = session.post(f"{API}/auth/register", json={'email': email, 'password': 'secret123'})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data['token_type'] == 'bearer'
    assert data['email'] == email
    assert isinstance(data['user_id'], str)
    assert isinstance(data['access_token'], str) and len(data['access_token']) > 20


def test_register_duplicate_email_returns_400(session):
    email = f"TEST_dup_{uuid.uuid4().hex[:8]}@joy.it"
    r1 = session.post(f"{API}/auth/register", json={'email': email, 'password': 'secret123'})
    assert r1.status_code == 200
    r2 = session.post(f"{API}/auth/register", json={'email': email, 'password': 'secret123'})
    assert r2.status_code == 400, r2.text


def test_register_short_password_returns_422(session):
    email = f"TEST_short_{uuid.uuid4().hex[:8]}@joy.it"
    r = session.post(f"{API}/auth/register", json={'email': email, 'password': '123'})
    assert r.status_code == 422, r.text


def test_register_invalid_email_returns_422(session):
    r = session.post(f"{API}/auth/register", json={'email': 'not-an-email', 'password': 'secret123'})
    assert r.status_code == 422


def test_login_success(session, user_a):
    r = session.post(f"{API}/auth/login", json={'email': user_a['email'], 'password': user_a['password']})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data['user_id'] == user_a['user_id']
    assert data['email'] == user_a['email']
    assert data['access_token']


def test_login_wrong_password_returns_401(session, user_a):
    r = session.post(f"{API}/auth/login", json={'email': user_a['email'], 'password': 'wrong-password'})
    assert r.status_code == 401, r.text


def test_login_unknown_email_returns_401(session):
    r = session.post(f"{API}/auth/login", json={'email': 'TEST_noexist_xyz@joy.it', 'password': 'whatever123'})
    assert r.status_code == 401


def test_me_with_valid_token(session, user_a):
    r = session.get(f"{API}/auth/me", headers=user_a['headers'])
    assert r.status_code == 200, r.text
    data = r.json()
    assert data['id'] == user_a['user_id']
    assert data['email'] == user_a['email']


def test_me_without_token_returns_401(session):
    r = requests.get(f"{API}/auth/me")
    assert r.status_code == 401


def test_me_invalid_token_returns_401(session):
    r = requests.get(f"{API}/auth/me", headers={'Authorization': 'Bearer invalid.token.here'})
    assert r.status_code == 401


def test_pre_existing_user_login():
    """Pre-seeded user mentioned in test_credentials.md"""
    r = requests.post(f"{API}/auth/login", json={'email': 'test1@joy.it', 'password': 'test123'})
    assert r.status_code == 200, r.text
    assert r.json()['email'] == 'test1@joy.it'
