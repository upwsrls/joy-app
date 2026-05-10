"""Backward-compatibility tests: legacy DB documents with old field names.

Directly seed Mongo with legacy docs (foto_base64 on profile, foto_base64_list on dono)
and verify the V2 routes rehydrate them as foto_url / foto_urls in the API response.
"""
import os
import sys
import uuid
import pytest
import requests
from datetime import datetime, timezone
from pymongo import MongoClient
from dotenv import load_dotenv

# Load backend .env so we use the same DB the running backend reads
from pathlib import Path
load_dotenv(Path('/app/backend/.env'))

from conftest import API  # noqa: E402

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']


@pytest.fixture(scope='module')
def mdb():
    c = MongoClient(MONGO_URL)
    yield c[DB_NAME]
    c.close()


def test_profile_legacy_foto_base64_rehydrated_as_foto_url(session, make_user, mdb):
    u = make_user('TEST_legacyprof')
    legacy_b64 = 'data:image/png;base64,LEGACYPROFILEBLOB'
    # Direct insert of a legacy profile (no foto_url field, only foto_base64)
    mdb.profiles.delete_one({'user_id': u['user_id']})
    mdb.profiles.insert_one({
        'user_id': u['user_id'],
        'nome': 'LegacyUser',
        'citta': 'Genova',
        'telefono': '',
        'foto_base64': legacy_b64,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat(),
    })

    r = session.get(f"{API}/profile/me", headers=u['headers'])
    assert r.status_code == 200, r.text
    data = r.json()
    assert data is not None
    assert data['nome'] == 'LegacyUser'
    assert data['foto_url'] == legacy_b64, f"foto_url should be rehydrated from legacy foto_base64, got: {data}"

    # Cleanup
    mdb.profiles.delete_one({'user_id': u['user_id']})


def test_dono_legacy_foto_base64_list_rehydrated_as_foto_urls(session, make_user, mdb):
    u = make_user('TEST_legacydono')
    legacy_list = ['data:image/png;base64,LEGACYDONO1', 'data:image/png;base64,LEGACYDONO2']
    dono_id = str(uuid.uuid4())
    mdb.doni.insert_one({
        'id': dono_id,
        'user_id': u['user_id'],
        'titolo': 'LegacyDono',
        'descrizione': 'old schema',
        'categoria': 'cibo',
        'lat': 0.0,
        'lng': 0.0,
        'foto_base64_list': legacy_list,
        'ritirato': False,
        'created_at': datetime.now(timezone.utc).isoformat(),
    })

    # GET /api/doni list should expose foto_urls (rehydrated)
    r = session.get(f"{API}/doni", headers=u['headers'])
    assert r.status_code == 200, r.text
    found = next((d for d in r.json() if d['id'] == dono_id), None)
    assert found is not None
    assert found['foto_urls'] == legacy_list

    # GET /api/doni/{id} likewise
    g = session.get(f"{API}/doni/{dono_id}", headers=u['headers'])
    assert g.status_code == 200
    assert g.json()['foto_urls'] == legacy_list

    # GET /api/doni/miei likewise
    m = session.get(f"{API}/doni/miei", headers=u['headers'])
    assert m.status_code == 200
    found_m = next((d for d in m.json() if d['id'] == dono_id), None)
    assert found_m is not None
    assert found_m['foto_urls'] == legacy_list

    # Cleanup
    mdb.doni.delete_one({'id': dono_id})
