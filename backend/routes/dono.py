"""Doni (gifts) routes."""
import uuid
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from core.database import db
from core.security import get_current_user, now_utc
from core.cloudinary_service import safe_destroy

router = APIRouter(prefix='/doni', tags=['doni'])


class DonoIn(BaseModel):
    titolo: str
    descrizione: Optional[str] = ''
    categoria: str
    lat: float
    lng: float
    foto_urls: List[str] = Field(default_factory=list, max_length=3)


class DonoOut(BaseModel):
    id: str
    user_id: str
    titolo: str
    descrizione: str
    categoria: str
    lat: float
    lng: float
    foto_urls: List[str]
    ritirato: bool
    ritirato_da: Optional[str] = None
    ritirato_at: Optional[str] = None
    created_at: str
    donatore_nome: Optional[str] = None
    donatore_citta: Optional[str] = None
    donatore_telefono: Optional[str] = None
    donatore_rating_avg: Optional[float] = None
    donatore_rating_count: int = 0


async def _rating(user_id: str) -> dict:
    pipeline = [
        {'$match': {'donor_id': user_id}},
        {'$group': {'_id': '$donor_id', 'avg': {'$avg': '$stars'}, 'count': {'$sum': 1}}},
    ]
    res = await db.recensioni.aggregate(pipeline).to_list(1)
    if not res:
        return {'avg': None, 'count': 0}
    return {'avg': round(res[0]['avg'], 1), 'count': res[0]['count']}


async def _enrich(dono: dict) -> DonoOut:
    p = await db.profiles.find_one(
        {'user_id': dono['user_id']},
        {'_id': 0, 'nome': 1, 'citta': 1, 'telefono': 1},
    )
    rating = await _rating(dono['user_id'])
    # Backward compat with previous schema (foto_base64_list)
    foto = dono.get('foto_urls') or dono.get('foto_base64_list') or []
    return DonoOut(
        id=dono['id'],
        user_id=dono['user_id'],
        titolo=dono['titolo'],
        descrizione=dono.get('descrizione', ''),
        categoria=dono['categoria'],
        lat=dono['lat'],
        lng=dono['lng'],
        foto_urls=foto,
        ritirato=dono.get('ritirato', False),
        ritirato_da=dono.get('ritirato_da'),
        ritirato_at=dono.get('ritirato_at'),
        created_at=dono['created_at'],
        donatore_nome=(p or {}).get('nome'),
        donatore_citta=(p or {}).get('citta'),
        donatore_telefono=(p or {}).get('telefono'),
        donatore_rating_avg=rating['avg'],
        donatore_rating_count=rating['count'],
    )


@router.post('', response_model=DonoOut)
async def crea_dono(data: DonoIn, user=Depends(get_current_user)):
    if len(data.foto_urls) == 0:
        raise HTTPException(status_code=400, detail='Aggiungi almeno una foto')
    dono_id = str(uuid.uuid4())
    doc = {
        'id': dono_id,
        'user_id': user['id'],
        'titolo': data.titolo.strip(),
        'descrizione': (data.descrizione or '').strip(),
        'categoria': data.categoria,
        'lat': data.lat,
        'lng': data.lng,
        'foto_urls': data.foto_urls[:3],
        'ritirato': False,
        'created_at': now_utc().isoformat(),
    }
    await db.doni.insert_one(doc)
    return await _enrich(doc)


@router.get('', response_model=List[DonoOut])
async def lista_doni(user=Depends(get_current_user)):
    items = await db.doni.find({'ritirato': False}, {'_id': 0}).sort('created_at', -1).to_list(500)
    return [await _enrich(d) for d in items]


@router.get('/miei', response_model=List[DonoOut])
async def miei_doni(user=Depends(get_current_user)):
    items = await db.doni.find({'user_id': user['id'], 'ritirato': False}, {'_id': 0}).sort('created_at', -1).to_list(200)
    return [await _enrich(d) for d in items]


@router.get('/{dono_id}', response_model=DonoOut)
async def dettaglio_dono(dono_id: str, user=Depends(get_current_user)):
    d = await db.doni.find_one({'id': dono_id}, {'_id': 0})
    if not d:
        raise HTTPException(status_code=404, detail='Gioia non trovata')
    return await _enrich(d)


@router.delete('/{dono_id}')
async def elimina_dono(dono_id: str, user=Depends(get_current_user)):
    d = await db.doni.find_one({'id': dono_id})
    if not d:
        raise HTTPException(status_code=404, detail='Gioia non trovata')
    if d['user_id'] != user['id']:
        raise HTTPException(status_code=403, detail='Non puoi eliminare questa gioia')

    # Best-effort: delete photos from Cloudinary
    for url in d.get('foto_urls', []) or []:
        if url and url.startswith('http'):
            safe_destroy(url)

    await db.doni.update_one({'id': dono_id}, {'$set': {'ritirato': True}})
    return {'ok': True}
