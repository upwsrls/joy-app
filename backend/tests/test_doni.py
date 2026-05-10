"""Doni (gifts) tests: POST/GET/DELETE /api/doni"""
import requests
import uuid
from conftest import API


def _make_dono(session, user, tiny_png, titolo='TEST_dono', categoria='cibo'):
    payload = {
        'titolo': titolo,
        'descrizione': 'Test descrizione',
        'categoria': categoria,
        'lat': 45.4642,
        'lng': 9.1900,
        'foto_base64_list': [tiny_png],
    }
    return session.post(f"{API}/doni", json=payload, headers=user['headers'])


def test_create_dono_success(session, user_a, tiny_png):
    # Set profile first so enrichment populates donatore_nome
    session.put(f"{API}/profile/me", json={'nome': 'DonatoreA', 'citta': 'Bologna'}, headers=user_a['headers'])
    r = _make_dono(session, user_a, tiny_png, titolo='Pasta')
    assert r.status_code == 200, r.text
    d = r.json()
    assert d['titolo'] == 'Pasta'
    assert d['user_id'] == user_a['user_id']
    assert d['ritirato'] is False
    assert len(d['foto_base64_list']) == 1
    assert d['donatore_nome'] == 'DonatoreA'
    assert d['donatore_citta'] == 'Bologna'
    assert d['lat'] == 45.4642 and d['lng'] == 9.1900


def test_create_dono_no_photos_returns_400(session, user_a):
    payload = {'titolo': 'No photo', 'categoria': 'cibo', 'lat': 0, 'lng': 0, 'foto_base64_list': []}
    r = session.post(f"{API}/doni", json=payload, headers=user_a['headers'])
    assert r.status_code == 400, r.text


def test_get_dono_by_id_404(session, user_a):
    fake = str(uuid.uuid4())
    r = session.get(f"{API}/doni/{fake}", headers=user_a['headers'])
    assert r.status_code == 404


def test_get_dono_by_id_success(session, user_a, tiny_png):
    r = _make_dono(session, user_a, tiny_png, titolo='Libro')
    assert r.status_code == 200
    dono_id = r.json()['id']
    g = session.get(f"{API}/doni/{dono_id}", headers=user_a['headers'])
    assert g.status_code == 200
    assert g.json()['id'] == dono_id
    assert g.json()['titolo'] == 'Libro'


def test_lista_doni_includes_created(session, user_a, tiny_png):
    r = _make_dono(session, user_a, tiny_png, titolo='Giocattolo_TEST')
    assert r.status_code == 200
    dono_id = r.json()['id']
    g = session.get(f"{API}/doni", headers=user_a['headers'])
    assert g.status_code == 200
    ids = [d['id'] for d in g.json()]
    assert dono_id in ids
    # verify ritirato=false filter for all
    assert all(d['ritirato'] is False for d in g.json())


def test_miei_doni_only_returns_own(session, user_a, user_b, tiny_png):
    ra = _make_dono(session, user_a, tiny_png, titolo='OwnedByA')
    rb = _make_dono(session, user_b, tiny_png, titolo='OwnedByB')
    assert ra.status_code == 200 and rb.status_code == 200
    a_id = ra.json()['id']
    b_id = rb.json()['id']

    list_a = session.get(f"{API}/doni/miei", headers=user_a['headers']).json()
    ids_a = [d['id'] for d in list_a]
    assert a_id in ids_a
    assert b_id not in ids_a
    assert all(d['user_id'] == user_a['user_id'] for d in list_a)


def test_delete_dono_owner_then_not_in_list(session, user_a, tiny_png):
    r = _make_dono(session, user_a, tiny_png, titolo='ToDelete')
    dono_id = r.json()['id']
    d = session.delete(f"{API}/doni/{dono_id}", headers=user_a['headers'])
    assert d.status_code == 200
    assert d.json().get('ok') is True

    # Should NOT be in lista_doni
    g = session.get(f"{API}/doni", headers=user_a['headers'])
    ids = [x['id'] for x in g.json()]
    assert dono_id not in ids

    # Should NOT be in miei
    m = session.get(f"{API}/doni/miei", headers=user_a['headers']).json()
    assert dono_id not in [x['id'] for x in m]


def test_delete_dono_not_owner_returns_403(session, user_a, user_b, tiny_png):
    r = _make_dono(session, user_a, tiny_png, titolo='ProtectedFromB')
    dono_id = r.json()['id']
    d = session.delete(f"{API}/doni/{dono_id}", headers=user_b['headers'])
    assert d.status_code == 403, d.text


def test_delete_unknown_dono_returns_404(session, user_a):
    fake = str(uuid.uuid4())
    d = session.delete(f"{API}/doni/{fake}", headers=user_a['headers'])
    assert d.status_code == 404


def test_doni_endpoints_require_auth(tiny_png):
    assert requests.get(f"{API}/doni").status_code == 401
    assert requests.get(f"{API}/doni/miei").status_code == 401
    assert requests.post(f"{API}/doni", json={'titolo': 'x', 'categoria': 'c', 'lat': 0, 'lng': 0, 'foto_base64_list': [tiny_png]}).status_code == 401
    assert requests.delete(f"{API}/doni/{uuid.uuid4()}").status_code == 401
