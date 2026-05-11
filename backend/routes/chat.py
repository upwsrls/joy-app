"""Chat: conversazioni e messaggi 1:1."""
import uuid
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from core.database import db
from core.security import get_current_user, now_utc
from core.push import send_to_users, fire_and_forget
from routes.notifiche import mark_conversation_read

router = APIRouter(prefix='/conversazioni', tags=['chat'])


class ConversazioneOut(BaseModel):
    id: str
    altro_user_id: str
    altro_nome: str
    altro_citta: str
    ultimo_messaggio: str
    ultimo_at: str
    unread: int = 0


class MessaggioIn(BaseModel):
    testo: str


class MessaggioOut(BaseModel):
    id: str
    conversazione_id: str
    mittente_id: str
    testo: str
    created_at: str


def _conv_id(a: str, b: str) -> str:
    return '__'.join(sorted([a, b]))


@router.get('', response_model=List[ConversazioneOut])
async def lista(user=Depends(get_current_user)):
    convs = await db.conversazioni.find(
        {'$or': [{'utente1': user['id']}, {'utente2': user['id']}]},
        {'_id': 0},
    ).sort('ultimo_at', -1).to_list(500)

    out: List[ConversazioneOut] = []
    for c in convs:
        altro_id = c['utente2'] if c['utente1'] == user['id'] else c['utente1']
        prof = await db.profiles.find_one({'user_id': altro_id}, {'_id': 0, 'nome': 1, 'citta': 1})
        last = await db.messaggi.find_one(
            {'conversazione_id': c['id']},
            {'_id': 0},
            sort=[('created_at', -1)],
        )
        # Compute unread for this user in this conversation
        lr = await db.letture.find_one(
            {'user_id': user['id'], 'conv_id': c['id']}, {'_id': 0, 'last_read_at': 1}
        )
        q: dict = {'conversazione_id': c['id'], 'mittente_id': altro_id}
        if lr and lr.get('last_read_at'):
            q['created_at'] = {'$gt': lr['last_read_at']}
        unread = await db.messaggi.count_documents(q)
        out.append(ConversazioneOut(
            id=c['id'],
            altro_user_id=altro_id,
            altro_nome=(prof or {}).get('nome') or 'Utente JOY',
            altro_citta=(prof or {}).get('citta') or '',
            ultimo_messaggio=(last or {}).get('testo') or 'Nessun messaggio ancora',
            ultimo_at=(last or {}).get('created_at') or c.get('ultimo_at') or c['created_at'],
            unread=unread,
        ))
    return out


@router.post('/start/{altro_user_id}', response_model=ConversazioneOut)
async def start(altro_user_id: str, user=Depends(get_current_user)):
    if altro_user_id == user['id']:
        raise HTTPException(status_code=400, detail='Non puoi chattare con te stesso')

    other = await db.users.find_one({'id': altro_user_id})
    if not other:
        raise HTTPException(status_code=404, detail='Utente non trovato')

    cid = _conv_id(user['id'], altro_user_id)
    existing = await db.conversazioni.find_one({'id': cid}, {'_id': 0})
    if not existing:
        a, b = sorted([user['id'], altro_user_id])
        doc = {
            'id': cid,
            'utente1': a,
            'utente2': b,
            'created_at': now_utc().isoformat(),
            'ultimo_at': now_utc().isoformat(),
        }
        await db.conversazioni.insert_one(doc)
        existing = doc

    prof = await db.profiles.find_one({'user_id': altro_user_id}, {'_id': 0, 'nome': 1, 'citta': 1})
    return ConversazioneOut(
        id=existing['id'],
        altro_user_id=altro_user_id,
        altro_nome=(prof or {}).get('nome') or 'Utente JOY',
        altro_citta=(prof or {}).get('citta') or '',
        ultimo_messaggio='Inizia la conversazione!',
        ultimo_at=existing.get('ultimo_at') or existing['created_at'],
    )


@router.get('/{conv_id}/messaggi', response_model=List[MessaggioOut])
async def lista_messaggi(conv_id: str, user=Depends(get_current_user)):
    conv = await db.conversazioni.find_one({'id': conv_id}, {'_id': 0})
    if not conv or user['id'] not in (conv['utente1'], conv['utente2']):
        raise HTTPException(status_code=403, detail='Non autorizzato')
    items = await db.messaggi.find({'conversazione_id': conv_id}, {'_id': 0}).sort('created_at', 1).to_list(2000)
    # Opening the chat = marking it as read for this user
    await mark_conversation_read(user['id'], conv_id)
    return [MessaggioOut(**m) for m in items]


@router.post('/{conv_id}/messaggi', response_model=MessaggioOut)
async def invia_messaggio(conv_id: str, data: MessaggioIn, user=Depends(get_current_user)):
    conv = await db.conversazioni.find_one({'id': conv_id}, {'_id': 0})
    if not conv or user['id'] not in (conv['utente1'], conv['utente2']):
        raise HTTPException(status_code=403, detail='Non autorizzato')
    if not data.testo.strip():
        raise HTTPException(status_code=400, detail='Messaggio vuoto')

    msg = {
        'id': str(uuid.uuid4()),
        'conversazione_id': conv_id,
        'mittente_id': user['id'],
        'testo': data.testo.strip(),
        'created_at': now_utc().isoformat(),
    }
    await db.messaggi.insert_one(msg)
    await db.conversazioni.update_one(
        {'id': conv_id},
        {'$set': {'ultimo_at': msg['created_at']}},
    )

    # Push notification to the OTHER user
    altro_id = conv['utente2'] if conv['utente1'] == user['id'] else conv['utente1']
    sender_prof = await db.profiles.find_one({'user_id': user['id']}, {'_id': 0, 'nome': 1})
    sender_name = (sender_prof or {}).get('nome') or 'Utente JOY'
    fire_and_forget(send_to_users(
        [altro_id],
        title=f'💬 {sender_name}',
        body=msg['testo'][:140],
        data={'type': 'chat', 'conv_id': conv_id},
    ))

    return MessaggioOut(**msg)
