"""Profile routes: get/update own profile, get other user's profile."""
from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from core.database import db
from core.security import get_current_user, now_utc

router = APIRouter(prefix='/profile', tags=['profile'])


class ProfileIn(BaseModel):
    nome: str
    citta: str
    telefono: Optional[str] = ''
    foto_url: Optional[str] = None


class ProfileOut(BaseModel):
    user_id: str
    nome: str
    citta: str
    telefono: str = ''
    foto_url: Optional[str] = None


@router.get('/me', response_model=Optional[ProfileOut])
async def get_my_profile(user=Depends(get_current_user)):
    p = await db.profiles.find_one({'user_id': user['id']}, {'_id': 0})
    if not p:
        return None
    # Backward compat: expose old base64 field as foto_url if missing
    if 'foto_url' not in p and p.get('foto_base64'):
        p['foto_url'] = p['foto_base64']
    return ProfileOut(**p)


@router.put('/me', response_model=ProfileOut)
async def upsert_my_profile(data: ProfileIn, user=Depends(get_current_user)):
    profile_doc = {
        'user_id': user['id'],
        'nome': data.nome.strip(),
        'citta': data.citta.strip(),
        'telefono': (data.telefono or '').strip(),
        'foto_url': data.foto_url,
        'updated_at': now_utc().isoformat(),
    }
    await db.profiles.update_one(
        {'user_id': user['id']},
        {'$set': profile_doc, '$setOnInsert': {'created_at': now_utc().isoformat()}},
        upsert=True,
    )
    return ProfileOut(**profile_doc)


@router.get('/{user_id}', response_model=Optional[ProfileOut])
async def get_user_profile(user_id: str, user=Depends(get_current_user)):
    p = await db.profiles.find_one({'user_id': user_id}, {'_id': 0})
    if not p:
        return None
    if 'foto_url' not in p and p.get('foto_base64'):
        p['foto_url'] = p['foto_base64']
    return ProfileOut(**p)
