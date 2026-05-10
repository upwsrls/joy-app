"""Uploads tests: POST /api/uploads/image (Cloudinary)."""
import requests
from conftest import API


def test_upload_image_success_returns_cloudinary_url(session, user_a, tiny_png):
    r = session.post(
        f"{API}/uploads/image",
        json={'base64': tiny_png},
        headers=user_a['headers'],
        timeout=30,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert 'secure_url' in data and 'public_id' in data
    assert isinstance(data['secure_url'], str)
    assert data['secure_url'].startswith('https://res.cloudinary.com/drmrh9h7f/'), data['secure_url']
    # Folder should be user-scoped
    assert f"joy/{user_a['user_id']}" in data['public_id'], data['public_id']


def test_upload_image_empty_base64_returns_400(session, user_a):
    r = session.post(
        f"{API}/uploads/image",
        json={'base64': ''},
        headers=user_a['headers'],
    )
    assert r.status_code == 400, r.text


def test_upload_image_without_token_returns_401():
    r = requests.post(
        f"{API}/uploads/image",
        json={'base64': 'data:image/png;base64,abc'},
    )
    assert r.status_code == 401, r.text
