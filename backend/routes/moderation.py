"""Moderation routes: report content and block users (Apple App Store
compliance — Guideline 1.2 / UGC moderation).

Endpoints (all require auth):
- POST   /api/segnalazioni              — report a dono / recensione / user
- POST   /api/blocks/{user_id}          — block another user
- DELETE /api/blocks/{user_id}          — unblock
- GET    /api/blocks                    — list users I have blocked

Blocked users' content is automatically filtered out from doni listings in
`routes/dono.py` via the `blocked_ids_for(user_id)` helper exposed here.
"""
import uuid
import logging
from typing import List, Literal, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from core.database import db
from core.security import get_current_user, now_utc

router = APIRouter(tags=['moderation'])
logger = logging.getLogger(__name__)


# ---------- Models ----------

TargetType = Literal['dono', 'recensione', 'utente', 'messaggio']

REPORT_REASONS = [
    'spam',
    'contenuto_offensivo',
    'truffa',
    'inappropriato',
    'minorenne',
    'altro',
]


class SegnalazioneIn(BaseModel):
    target_type: TargetType
    target_id: str
    reason: str = Field(..., description='Uno dei valori in REPORT_REASONS')
    note: Optional[str] = Field(default='', max_length=500)


class SegnalazioneOut(BaseModel):
    id: str
    target_type: str
    target_id: str
    reason: str
    status: str
    created_at: str


class BlockedUserOut(BaseModel):
    user_id: str
    nome: Optional[str] = None
    citta: Optional[str] = None
    blocked_at: str


# ---------- Helpers (used by other routers too) ----------

async def blocked_ids_for(user_id: str) -> set:
    """Return the set of user_ids that `user_id` has blocked AND those who
    have blocked `user_id` — so content disappears symmetrically."""
    cur = db.blocks.find(
        {'$or': [{'blocker_id': user_id}, {'blocked_id': user_id}]},
        {'_id': 0, 'blocker_id': 1, 'blocked_id': 1},
    )
    ids = set()
    async for b in cur:
        if b['blocker_id'] == user_id:
            ids.add(b['blocked_id'])
        else:
            ids.add(b['blocker_id'])
    return ids


# ---------- Segnalazioni ----------

@router.post('/segnalazioni', response_model=SegnalazioneOut)
async def crea_segnalazione(data: SegnalazioneIn, user=Depends(get_current_user)):
    if data.reason not in REPORT_REASONS:
        raise HTTPException(status_code=400, detail=f'Motivo non valido. Scegli tra: {", ".join(REPORT_REASONS)}')

    # Anti-spam: max 1 segnalazione per stessa coppia (reporter, target)
    existing = await db.segnalazioni.find_one({
        'reporter_id': user['id'],
        'target_type': data.target_type,
        'target_id': data.target_id,
    })
    if existing:
        return SegnalazioneOut(
            id=existing['id'],
            target_type=existing['target_type'],
            target_id=existing['target_id'],
            reason=existing['reason'],
            status=existing.get('status', 'pending'),
            created_at=existing['created_at'],
        )

    seg_id = str(uuid.uuid4())
    doc = {
        'id': seg_id,
        'reporter_id': user['id'],
        'target_type': data.target_type,
        'target_id': data.target_id,
        'reason': data.reason,
        'note': (data.note or '').strip(),
        'status': 'pending',
        'created_at': now_utc().isoformat(),
    }
    await db.segnalazioni.insert_one(doc)
    logger.warning(
        '🚨 Segnalazione: user=%s target=%s/%s motivo=%s',
        user['id'], data.target_type, data.target_id, data.reason,
    )
    return SegnalazioneOut(
        id=seg_id,
        target_type=data.target_type,
        target_id=data.target_id,
        reason=data.reason,
        status='pending',
        created_at=doc['created_at'],
    )


# ---------- Blocks ----------

@router.post('/blocks/{target_user_id}')
async def blocca_utente(target_user_id: str, user=Depends(get_current_user)):
    if target_user_id == user['id']:
        raise HTTPException(status_code=400, detail='Non puoi bloccare te stesso')

    target = await db.users.find_one({'id': target_user_id}, {'_id': 0, 'id': 1})
    if not target:
        raise HTTPException(status_code=404, detail='Utente non trovato')

    await db.blocks.update_one(
        {'blocker_id': user['id'], 'blocked_id': target_user_id},
        {'$set': {
            'blocker_id': user['id'],
            'blocked_id': target_user_id,
            'created_at': now_utc().isoformat(),
        }},
        upsert=True,
    )
    return {'ok': True, 'blocked_id': target_user_id}


@router.delete('/blocks/{target_user_id}')
async def sblocca_utente(target_user_id: str, user=Depends(get_current_user)):
    await db.blocks.delete_one({'blocker_id': user['id'], 'blocked_id': target_user_id})
    return {'ok': True, 'unblocked_id': target_user_id}


@router.get('/blocks', response_model=List[BlockedUserOut])
async def lista_bloccati(user=Depends(get_current_user)):
    cur = db.blocks.find({'blocker_id': user['id']}, {'_id': 0}).sort('created_at', -1)
    items: List[BlockedUserOut] = []
    async for b in cur:
        p = await db.profiles.find_one(
            {'user_id': b['blocked_id']},
            {'_id': 0, 'nome': 1, 'citta': 1},
        )
        items.append(BlockedUserOut(
            user_id=b['blocked_id'],
            nome=(p or {}).get('nome'),
            citta=(p or {}).get('citta'),
            blocked_at=b.get('created_at', ''),
        ))
    return items
