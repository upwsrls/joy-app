"""Push token + unread/notifications routes.

- POST /api/users/me/push-token  (body: {token}) -> store device token.
- DELETE /api/users/me/push-token -> clear on logout.
- GET /api/notifiche/unread-count -> {messages: int, total: int} for home banner.

Unread is computed from db.letture: each {user_id, conv_id, last_read_at}.
Messages newer than last_read_at, sent by the OTHER user, count as unread.
"""
from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from core.database import db
from core.security import get_current_user, now_utc

router = APIRouter(tags=['notifiche'])


class PushTokenIn(BaseModel):
    token: Optional[str] = None


@router.post('/users/me/push-token')
async def register_push_token(data: PushTokenIn, user=Depends(get_current_user)):
    token = (data.token or '').strip() or None
    await db.users.update_one(
        {'id': user['id']},
        {'$set': {'push_token': token, 'push_token_updated_at': now_utc().isoformat()}},
    )
    return {'ok': True, 'has_token': bool(token)}


@router.delete('/users/me/push-token')
async def clear_push_token(user=Depends(get_current_user)):
    await db.users.update_one({'id': user['id']}, {'$set': {'push_token': None}})
    return {'ok': True}


@router.get('/notifiche/unread-count')
async def unread_count(user=Depends(get_current_user)):
    """Return total unread chat messages across all my conversations."""
    convs = await db.conversazioni.find(
        {'$or': [{'utente1': user['id']}, {'utente2': user['id']}]},
        {'_id': 0, 'id': 1, 'utente1': 1, 'utente2': 1},
    ).to_list(500)
    if not convs:
        return {'messages': 0, 'total': 0, 'per_conversation': {}}

    # last_read_at per conversation for this user
    letture = await db.letture.find(
        {'user_id': user['id'], 'conv_id': {'$in': [c['id'] for c in convs]}},
        {'_id': 0},
    ).to_list(500)
    last_read = {l['conv_id']: l.get('last_read_at') for l in letture}

    total = 0
    per_conv = {}
    for c in convs:
        other_id = c['utente2'] if c['utente1'] == user['id'] else c['utente1']
        q = {
            'conversazione_id': c['id'],
            'mittente_id': other_id,
        }
        lr = last_read.get(c['id'])
        if lr:
            q['created_at'] = {'$gt': lr}
        n = await db.messaggi.count_documents(q)
        if n:
            per_conv[c['id']] = n
            total += n
    return {'messages': total, 'total': total, 'per_conversation': per_conv}


async def mark_conversation_read(user_id: str, conv_id: str):
    """Mark all messages in conv_id as read for user_id (called when they open the chat)."""
    await db.letture.update_one(
        {'user_id': user_id, 'conv_id': conv_id},
        {'$set': {'last_read_at': now_utc().isoformat()}},
        upsert=True,
    )
