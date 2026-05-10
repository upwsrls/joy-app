import os
import pytest
import requests
import uuid

# Use the public ingress URL like a real client would
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://mood-tracker-619.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

# A tiny 1x1 PNG base64 (data URL) used as photo payload
TINY_PNG_B64 = (
    "data:image/png;base64,"
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
)


@pytest.fixture(scope='session')
def base_url():
    return BASE_URL


@pytest.fixture(scope='session')
def api_url():
    return API


@pytest.fixture(scope='session')
def session():
    s = requests.Session()
    s.headers.update({'Content-Type': 'application/json'})
    return s


def _auth_headers(token: str):
    return {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}


@pytest.fixture(scope='session')
def make_user(session):
    """Factory that registers a fresh user and returns dict with email,password,user_id,token."""
    created = []

    def _make(prefix='TEST_user'):
        email = f"{prefix}_{uuid.uuid4().hex[:8]}@joy.it".lower()
        password = 'pass1234'
        r = session.post(f"{API}/auth/register", json={'email': email, 'password': password})
        assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
        data = r.json()
        info = {
            'email': email,
            'password': password,
            'user_id': data['user_id'],
            'token': data['access_token'],
            'headers': _auth_headers(data['access_token']),
        }
        created.append(info)
        return info

    return _make


@pytest.fixture(scope='session')
def user_a(make_user):
    return make_user('TEST_userA')


@pytest.fixture(scope='session')
def user_b(make_user):
    return make_user('TEST_userB')


@pytest.fixture(scope='session')
def tiny_png():
    return TINY_PNG_B64
