"""Chat tests: conversazioni + messaggi"""
import requests
import uuid
from conftest import API


def test_start_conversation_with_self_returns_400(session, user_a):
    r = session.post(f"{API}/conversazioni/start/{user_a['user_id']}", headers=user_a['headers'])
    assert r.status_code == 400, r.text


def test_start_conversation_unknown_user_returns_404(session, user_a):
    fake = str(uuid.uuid4())
    r = session.post(f"{API}/conversazioni/start/{fake}", headers=user_a['headers'])
    assert r.status_code == 404


def test_start_conversation_deterministic(session, user_a, user_b):
    # ensure user_b has profile
    session.put(f"{API}/profile/me", json={'nome': 'UserB', 'citta': 'Roma'}, headers=user_b['headers'])

    r1 = session.post(f"{API}/conversazioni/start/{user_b['user_id']}", headers=user_a['headers'])
    assert r1.status_code == 200, r1.text
    cid_1 = r1.json()['id']

    # Same caller again -> same conversation
    r2 = session.post(f"{API}/conversazioni/start/{user_b['user_id']}", headers=user_a['headers'])
    assert r2.status_code == 200
    assert r2.json()['id'] == cid_1

    # Other side starts -> same id
    r3 = session.post(f"{API}/conversazioni/start/{user_a['user_id']}", headers=user_b['headers'])
    assert r3.status_code == 200
    assert r3.json()['id'] == cid_1

    # Other user enrichment
    assert r1.json()['altro_user_id'] == user_b['user_id']
    assert r1.json()['altro_nome'] == 'UserB'
    assert r1.json()['altro_citta'] == 'Roma'


def test_send_and_list_messages(session, user_a, user_b):
    r = session.post(f"{API}/conversazioni/start/{user_b['user_id']}", headers=user_a['headers'])
    cid = r.json()['id']

    m1 = session.post(f"{API}/conversazioni/{cid}/messaggi", json={'testo': 'Ciao!'}, headers=user_a['headers'])
    assert m1.status_code == 200, m1.text
    assert m1.json()['testo'] == 'Ciao!'
    assert m1.json()['mittente_id'] == user_a['user_id']

    m2 = session.post(f"{API}/conversazioni/{cid}/messaggi", json={'testo': 'Salve'}, headers=user_b['headers'])
    assert m2.status_code == 200

    # list
    g = session.get(f"{API}/conversazioni/{cid}/messaggi", headers=user_a['headers'])
    assert g.status_code == 200
    msgs = g.json()
    assert len(msgs) >= 2
    testi = [m['testo'] for m in msgs]
    assert 'Ciao!' in testi and 'Salve' in testi
    # ordered ascending by created_at
    assert msgs == sorted(msgs, key=lambda x: x['created_at'])


def test_non_participant_cannot_post_or_list(session, user_a, user_b, make_user):
    r = session.post(f"{API}/conversazioni/start/{user_b['user_id']}", headers=user_a['headers'])
    cid = r.json()['id']
    intruder = make_user('TEST_intruder')
    p = session.post(f"{API}/conversazioni/{cid}/messaggi", json={'testo': 'hi'}, headers=intruder['headers'])
    assert p.status_code == 403, p.text
    g = session.get(f"{API}/conversazioni/{cid}/messaggi", headers=intruder['headers'])
    assert g.status_code == 403


def test_empty_message_returns_400(session, user_a, user_b):
    r = session.post(f"{API}/conversazioni/start/{user_b['user_id']}", headers=user_a['headers'])
    cid = r.json()['id']
    p = session.post(f"{API}/conversazioni/{cid}/messaggi", json={'testo': '   '}, headers=user_a['headers'])
    assert p.status_code == 400


def test_lista_conversazioni_contains_started(session, user_a, user_b):
    r = session.post(f"{API}/conversazioni/start/{user_b['user_id']}", headers=user_a['headers'])
    cid = r.json()['id']
    # Send a message so ultimo_messaggio is populated
    session.post(f"{API}/conversazioni/{cid}/messaggi", json={'testo': 'Hello there'}, headers=user_a['headers'])

    L = session.get(f"{API}/conversazioni", headers=user_a['headers'])
    assert L.status_code == 200
    items = L.json()
    match = next((c for c in items if c['id'] == cid), None)
    assert match is not None
    assert match['altro_user_id'] == user_b['user_id']
    assert match['ultimo_messaggio'] == 'Hello there'


def test_chat_endpoints_require_auth():
    assert requests.get(f"{API}/conversazioni").status_code == 401
    assert requests.post(f"{API}/conversazioni/start/{uuid.uuid4()}").status_code == 401
    assert requests.get(f"{API}/conversazioni/abc__def/messaggi").status_code == 401
    assert requests.post(f"{API}/conversazioni/abc__def/messaggi", json={'testo': 'x'}).status_code == 401
