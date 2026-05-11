"""Recensioni (reviews) routes.

Flow:
1. A user (NOT the owner) calls POST /api/doni/{id}/ritira when they have actually
   received the gift in-person. This marks the dono as `ritirato_da` + `ritirato_at`
   and unlocks the review step.
2. The same user MUST then post a review (1-5 stars + optional comment) via
   POST /api/recensioni. One review per dono.
3. The donor's aggregate rating is exposed via GET /api/users/{id}/rating so the
   frontend can show "⭐ 4.8 (12)" next to the donor name.
"""
import uuid
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from core.database import db
from core.security import get_current_user, now_utc


router = APIRouter(tags=['recensioni'])


class RecensioneIn(BaseModel):
    dono_id: str
    stars: int = Field(..., ge=1, le=5)
    commento: Optional[str] = ''


class RecensioneOut(BaseModel):
    id: str
    dono_id: str
    donor_id: str           # who received the review (the gift donor)
    reviewer_id: str        # who wrote the review (the gift recipient)
    reviewer_nome: Optional[str] = None
    stars: int
    commento: str
    created_at: str


class RitiroOut(BaseModel):
    ok: bool
    dono_id: str
    needs_review: bool = True


@router.post('/doni/{dono_id}/ritira', response_model=RitiroOut)
async def ritira_dono(dono_id: str, user=Depends(get_current_user)):
    """Mark a dono as received by the current user. Unlocks the review step."""
    d = await db.doni.find_one({'id': dono_id})
    if not d:
        raise HTTPException(status_code=404, detail='Gioia non trovata')
    if d['user_id'] == user['id']:
        raise HTTPException(status_code=400, detail='Non puoi ritirare una tua gioia')
    if d.get('ritirato'):
        raise HTTPException(status_code=400, detail='Questa gioia è già stata ritirata')

    await db.doni.update_one(
        {'id': dono_id},
        {
            '$set': {
                'ritirato': True,
                'ritirato_da': user['id'],
                'ritirato_at': now_utc().isoformat(),
            }
        },
    )
    return RitiroOut(ok=True, dono_id=dono_id, needs_review=True)


@router.post('/recensioni', response_model=RecensioneOut)
async def crea_recensione(data: RecensioneIn, user=Depends(get_current_user)):
    d = await db.doni.find_one({'id': data.dono_id})
    if not d:
        raise HTTPException(status_code=404, detail='Gioia non trovata')
    if d.get('ritirato_da') != user['id']:
        raise HTTPException(status_code=403, detail='Puoi recensire solo gioie che hai ritirato tu')

    existing = await db.recensioni.find_one({'dono_id': data.dono_id, 'reviewer_id': user['id']})
    if existing:
        raise HTTPException(status_code=400, detail='Hai già recensito questa gioia')

    p = await db.profiles.find_one({'user_id': user['id']}, {'_id': 0, 'nome': 1})
    rec_id = str(uuid.uuid4())
    doc = {
        'id': rec_id,
        'dono_id': data.dono_id,
        'donor_id': d['user_id'],
        'reviewer_id': user['id'],
        'stars': int(data.stars),
        'commento': (data.commento or '').strip()[:500],
        'created_at': now_utc().isoformat(),
    }
    await db.recensioni.insert_one(doc)
    return RecensioneOut(reviewer_nome=(p or {}).get('nome'), **doc)


@router.get('/users/{user_id}/rating')
async def rating_donatore(user_id: str, user=Depends(get_current_user)):
    """Aggregate {avg, count} of reviews received by user_id."""
    pipeline = [
        {'$match': {'donor_id': user_id}},
        {'$group': {'_id': '$donor_id', 'avg': {'$avg': '$stars'}, 'count': {'$sum': 1}}},
    ]
    res = await db.recensioni.aggregate(pipeline).to_list(1)
    if not res:
        return {'avg': None, 'count': 0}
    return {'avg': round(res[0]['avg'], 1), 'count': res[0]['count']}


@router.get('/users/{user_id}/recensioni', response_model=List[RecensioneOut])
async def lista_recensioni_donatore(user_id: str, user=Depends(get_current_user)):
    items = await db.recensioni.find({'donor_id': user_id}, {'_id': 0}).sort('created_at', -1).to_list(50)
    out: List[RecensioneOut] = []
    for r in items:
        p = await db.profiles.find_one({'user_id': r['reviewer_id']}, {'_id': 0, 'nome': 1})
        out.append(RecensioneOut(reviewer_nome=(p or {}).get('nome'), **r))
    return out
