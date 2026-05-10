"""Doni (gifts) tests: POST/GET/DELETE /api/doni - V2 schema (foto_urls)."""
import requests
import uuid
from conftest import API

# A representative Cloudinary-like URL (no need to actually be reachable for create flow)
FAKE_CLOUDINARY_URL = 'https://res.cloudinary.com/drmrh9h7f/image/upload/v1700000000/joy/test/sample.jpg'


def _make_dono(session, user, foto_url=FAKE_CLOUDINARY_URL, titolo='TEST_dono', categoria='cibo'):
    payload = {
        'titolo': titolo,
        'descrizione': 'Test descrizione',
        'categoria': categoria,
        'lat': 45.4642,
        'lng': 9.1900,
        'foto_urls': [foto_url],
    }
    return session.post(f"{API}/doni", json=payload, headers=user['headers'])


def test_create_dono_success(session, user_a):
    session.put(f"{API}/profile/me", json={'nome': 'DonatoreA', 'citta': 'Bologna'}, headers=user_a['headers'])
    r = _make_dono(session, user_a, titolo='Pasta')
    assert r.status_code == 200, r.text
    d = r.json()
    assert d['titolo'] == 'Pasta'
    assert d['user_id'] == user_a['user_id']
    assert d['ritirato'] is False
    assert isinstance(d['foto_urls'], list) and len(d['foto_urls']) == 1
    assert d['foto_urls'][0] == FAKE_CLOUDINARY_URL
    assert d['donatore_nome'] == 'DonatoreA'
    assert d['donatore_citta'] == 'Bologna'
    assert d['lat'] == 45.4642 and d['lng'] == 9.1900


def test_create_dono_no_photos_returns_400(session, user_a):
    payload = {'titolo': 'No photo', 'categoria': 'cibo', 'lat': 0, 'lng': 0, 'foto_urls': []}
    r = session.post(f"{API}/doni", json=payload, headers=user_a['headers'])
    assert r.status_code == 400, r.text


def test_get_dono_by_id_404(session, user_a):
    fake = str(uuid.uuid4())
    r = session.get(f"{API}/doni/{fake}", headers=user_a['headers'])
    assert r.status_code == 404


def test_get_dono_by_id_success(session, user_a):
    r = _make_dono(session, user_a, titolo='Libro')
    assert r.status_code == 200
    dono_id = r.json()['id']
    g = session.get(f"{API}/doni/{dono_id}", headers=user_a['headers'])
    assert g.status_code == 200
    body = g.json()
    assert body['id'] == dono_id
    assert body['titolo'] == 'Libro'
    assert FAKE_CLOUDINARY_URL in body['foto_urls']


def test_lista_doni_includes_created_with_foto_urls(session, user_a):
    r = _make_dono(session, user_a, titolo='Giocattolo_TEST')
    assert r.status_code == 200
    dono_id = r.json()['id']
    g = session.get(f"{API}/doni", headers=user_a['headers'])
    assert g.status_code == 200
    items = g.json()
    match = next((d for d in items if d['id'] == dono_id), None)
    assert match is not None
    assert isinstance(match['foto_urls'], list) and len(match['foto_urls']) >= 1
    assert all(d['ritirato'] is False for d in items)
    # Every item must expose foto_urls (incl. backward-compat-rehydrated old gifts)
    assert all('foto_urls' in d and isinstance(d['foto_urls'], list) for d in items)


def test_miei_doni_only_returns_own(session, user_a, user_b):
    ra = _make_dono(session, user_a, titolo='OwnedByA')
    rb = _make_dono(session, user_b, titolo='OwnedByB')
    assert ra.status_code == 200 and rb.status_code == 200
    a_id = ra.json()['id']
    b_id = rb.json()['id']
    list_a = session.get(f"{API}/doni/miei", headers=user_a['headers']).json()
    ids_a = [d['id'] for d in list_a]
    assert a_id in ids_a
    assert b_id not in ids_a
    assert all(d['user_id'] == user_a['user_id'] for d in list_a)


def test_delete_dono_owner_then_not_in_list(session, user_a):
    r = _make_dono(session, user_a, titolo='ToDelete')
    dono_id = r.json()['id']
    d = session.delete(f"{API}/doni/{dono_id}", headers=user_a['headers'])
    assert d.status_code == 200
    assert d.json().get('ok') is True
    g = session.get(f"{API}/doni", headers=user_a['headers'])
    ids = [x['id'] for x in g.json()]
    assert dono_id not in ids
    m = session.get(f"{API}/doni/miei", headers=user_a['headers']).json()
    assert dono_id not in [x['id'] for x in m]


def test_delete_dono_not_owner_returns_403(session, user_a, user_b):
    r = _make_dono(session, user_a, titolo='ProtectedFromB')
    dono_id = r.json()['id']
    d = session.delete(f"{API}/doni/{dono_id}", headers=user_b['headers'])
    assert d.status_code == 403, d.text


def test_delete_unknown_dono_returns_404(session, user_a):
    fake = str(uuid.uuid4())
    d = session.delete(f"{API}/doni/{fake}", headers=user_a['headers'])
    assert d.status_code == 404


def test_doni_endpoints_require_auth():
    assert requests.get(f"{API}/doni").status_code == 401
    assert requests.get(f"{API}/doni/miei").status_code == 401
    assert requests.post(
        f"{API}/doni",
        json={'titolo': 'x', 'categoria': 'c', 'lat': 0, 'lng': 0, 'foto_urls': [FAKE_CLOUDINARY_URL]},
    ).status_code == 401
    assert requests.delete(f"{API}/doni/{uuid.uuid4()}").status_code == 401
