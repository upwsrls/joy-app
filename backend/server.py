from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from pydantic import BaseModel, Field, EmailStr
from passlib.context import CryptContext
from jose import jwt, JWTError


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Auth config
SECRET_KEY = os.environ.get('JWT_SECRET', 'joy-app-super-secret-change-me-in-prod')
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_DAYS = 30

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
security = HTTPBearer(auto_error=False)

app = FastAPI(title='JOY API')
api = APIRouter(prefix='/api')


# ---------- Helpers ----------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def hash_password(p: str) -> str:
    return pwd_context.hash(p)


def verify_password(p: str, h: str) -> bool:
    try:
        return pwd_context.verify(p, h)
    except Exception:
        return False


def create_access_token(user_id: str) -> str:
    expire = now_utc() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    payload = {'sub': user_id, 'exp': expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if not creds:
        raise HTTPException(status_code=401, detail='Not authenticated')
    try:
        payload = jwt.decode(creds.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get('sub')
        if not user_id:
            raise HTTPException(status_code=401, detail='Invalid token')
    except JWTError:
        raise HTTPException(status_code=401, detail='Invalid or expired token')

    user = await db.users.find_one({'id': user_id}, {'_id': 0})
    if not user:
        raise HTTPException(status_code=401, detail='User not found')
    return user


# ---------- Models ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    user_id: str
    email: str


class UserOut(BaseModel):
    id: str
    email: str


class ProfileIn(BaseModel):
    nome: str
    citta: str
    telefono: Optional[str] = ''
    foto_base64: Optional[str] = None  # data URL or raw base64


class ProfileOut(BaseModel):
    user_id: str
    nome: str
    citta: str
    telefono: str = ''
    foto_base64: Optional[str] = None


class DonoIn(BaseModel):
    titolo: str
    descrizione: Optional[str] = ''
    categoria: str
    lat: float
    lng: float
    foto_base64_list: List[str] = Field(default_factory=list, max_length=3)


class DonoOut(BaseModel):
    id: str
    user_id: str
    titolo: str
    descrizione: str
    categoria: str
    lat: float
    lng: float
    foto_base64_list: List[str]
    ritirato: bool
    created_at: str
    donatore_nome: Optional[str] = None
    donatore_citta: Optional[str] = None


class ConversazioneOut(BaseModel):
    id: str
    altro_user_id: str
    altro_nome: str
    altro_citta: str
    ultimo_messaggio: str
    ultimo_at: str


class MessaggioIn(BaseModel):
    testo: str


class MessaggioOut(BaseModel):
    id: str
    conversazione_id: str
    mittente_id: str
    testo: str
    created_at: str


# ---------- Auth routes ----------
@api.get('/')
async def root():
    return {'message': 'JOY API ready'}


@api.post('/auth/register', response_model=TokenOut)
async def register(data: RegisterIn):
    email = data.email.lower().strip()
    existing = await db.users.find_one({'email': email})
    if existing:
        raise HTTPException(status_code=400, detail='Email già registrata')

    user_id = str(uuid.uuid4())
    user_doc = {
        'id': user_id,
        'email': email,
        'password_hash': hash_password(data.password),
        'created_at': now_utc().isoformat(),
    }
    await db.users.insert_one(user_doc)
    token = create_access_token(user_id)
    return TokenOut(access_token=token, user_id=user_id, email=email)


@api.post('/auth/login', response_model=TokenOut)
async def login(data: LoginIn):
    email = data.email.lower().strip()
    user = await db.users.find_one({'email': email})
    if not user or not verify_password(data.password, user['password_hash']):
        raise HTTPException(status_code=401, detail='Email o password non corretti')
    token = create_access_token(user['id'])
    return TokenOut(access_token=token, user_id=user['id'], email=user['email'])


@api.get('/auth/me', response_model=UserOut)
async def me(user=Depends(get_current_user)):
    return UserOut(id=user['id'], email=user['email'])


# ---------- Profile routes ----------
@api.get('/profile/me', response_model=Optional[ProfileOut])
async def get_my_profile(user=Depends(get_current_user)):
    p = await db.profiles.find_one({'user_id': user['id']}, {'_id': 0})
    if not p:
        return None
    return ProfileOut(**p)


@api.put('/profile/me', response_model=ProfileOut)
async def upsert_my_profile(data: ProfileIn, user=Depends(get_current_user)):
    profile_doc = {
        'user_id': user['id'],
        'nome': data.nome.strip(),
        'citta': data.citta.strip(),
        'telefono': (data.telefono or '').strip(),
        'foto_base64': data.foto_base64,
        'updated_at': now_utc().isoformat(),
    }
    await db.profiles.update_one(
        {'user_id': user['id']},
        {'$set': profile_doc, '$setOnInsert': {'created_at': now_utc().isoformat()}},
        upsert=True,
    )
    return ProfileOut(**profile_doc)


@api.get('/profile/{user_id}', response_model=Optional[ProfileOut])
async def get_user_profile(user_id: str, user=Depends(get_current_user)):
    p = await db.profiles.find_one({'user_id': user_id}, {'_id': 0})
    if not p:
        return None
    return ProfileOut(**p)


# ---------- Doni routes ----------
async def _enrich_dono(dono: dict) -> DonoOut:
    profile = await db.profiles.find_one({'user_id': dono['user_id']}, {'_id': 0, 'nome': 1, 'citta': 1})
    return DonoOut(
        id=dono['id'],
        user_id=dono['user_id'],
        titolo=dono['titolo'],
        descrizione=dono.get('descrizione', ''),
        categoria=dono['categoria'],
        lat=dono['lat'],
        lng=dono['lng'],
        foto_base64_list=dono.get('foto_base64_list', []),
        ritirato=dono.get('ritirato', False),
        created_at=dono['created_at'],
        donatore_nome=(profile or {}).get('nome'),
        donatore_citta=(profile or {}).get('citta'),
    )


@api.post('/doni', response_model=DonoOut)
async def crea_dono(data: DonoIn, user=Depends(get_current_user)):
    if len(data.foto_base64_list) == 0:
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
        'foto_base64_list': data.foto_base64_list[:3],
        'ritirato': False,
        'created_at': now_utc().isoformat(),
    }
    await db.doni.insert_one(doc)
    return await _enrich_dono(doc)


@api.get('/doni', response_model=List[DonoOut])
async def lista_doni(user=Depends(get_current_user)):
    cursor = db.doni.find({'ritirato': False}, {'_id': 0}).sort('created_at', -1)
    items = await cursor.to_list(500)
    return [await _enrich_dono(d) for d in items]


@api.get('/doni/miei', response_model=List[DonoOut])
async def miei_doni(user=Depends(get_current_user)):
    cursor = db.doni.find({'user_id': user['id'], 'ritirato': False}, {'_id': 0}).sort('created_at', -1)
    items = await cursor.to_list(200)
    return [await _enrich_dono(d) for d in items]


@api.get('/doni/{dono_id}', response_model=DonoOut)
async def dettaglio_dono(dono_id: str, user=Depends(get_current_user)):
    d = await db.doni.find_one({'id': dono_id}, {'_id': 0})
    if not d:
        raise HTTPException(status_code=404, detail='Gioia non trovata')
    return await _enrich_dono(d)


@api.delete('/doni/{dono_id}')
async def elimina_dono(dono_id: str, user=Depends(get_current_user)):
    d = await db.doni.find_one({'id': dono_id})
    if not d:
        raise HTTPException(status_code=404, detail='Gioia non trovata')
    if d['user_id'] != user['id']:
        raise HTTPException(status_code=403, detail='Non puoi eliminare questa gioia')
    await db.doni.update_one({'id': dono_id}, {'$set': {'ritirato': True}})
    return {'ok': True}


# ---------- Chat routes ----------
def _conv_id(a: str, b: str) -> str:
    return '__'.join(sorted([a, b]))


@api.get('/conversazioni', response_model=List[ConversazioneOut])
async def lista_conversazioni(user=Depends(get_current_user)):
    cursor = db.conversazioni.find(
        {'$or': [{'utente1': user['id']}, {'utente2': user['id']}]},
        {'_id': 0},
    ).sort('ultimo_at', -1)
    convs = await cursor.to_list(500)
    out: List[ConversazioneOut] = []
    for c in convs:
        altro_id = c['utente2'] if c['utente1'] == user['id'] else c['utente1']
        prof = await db.profiles.find_one({'user_id': altro_id}, {'_id': 0, 'nome': 1, 'citta': 1})
        last = await db.messaggi.find_one(
            {'conversazione_id': c['id']},
            {'_id': 0},
            sort=[('created_at', -1)],
        )
        out.append(ConversazioneOut(
            id=c['id'],
            altro_user_id=altro_id,
            altro_nome=(prof or {}).get('nome') or 'Utente JOY',
            altro_citta=(prof or {}).get('citta') or '',
            ultimo_messaggio=(last or {}).get('testo') or 'Nessun messaggio ancora',
            ultimo_at=(last or {}).get('created_at') or c.get('ultimo_at') or c['created_at'],
        ))
    return out


@api.post('/conversazioni/start/{altro_user_id}', response_model=ConversazioneOut)
async def start_conversazione(altro_user_id: str, user=Depends(get_current_user)):
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


@api.get('/conversazioni/{conv_id}/messaggi', response_model=List[MessaggioOut])
async def lista_messaggi(conv_id: str, user=Depends(get_current_user)):
    conv = await db.conversazioni.find_one({'id': conv_id}, {'_id': 0})
    if not conv or user['id'] not in (conv['utente1'], conv['utente2']):
        raise HTTPException(status_code=403, detail='Non autorizzato')
    cursor = db.messaggi.find({'conversazione_id': conv_id}, {'_id': 0}).sort('created_at', 1)
    items = await cursor.to_list(2000)
    return [MessaggioOut(**m) for m in items]


@api.post('/conversazioni/{conv_id}/messaggi', response_model=MessaggioOut)
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
    return MessaggioOut(**msg)


# ---------- App wiring ----------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*'],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event('startup')
async def on_startup():
    # Indexes
    await db.users.create_index('email', unique=True)
    await db.users.create_index('id', unique=True)
    await db.profiles.create_index('user_id', unique=True)
    await db.doni.create_index('id', unique=True)
    await db.doni.create_index('ritirato')
    await db.conversazioni.create_index('id', unique=True)
    await db.messaggi.create_index([('conversazione_id', 1), ('created_at', 1)])


@app.on_event('shutdown')
async def shutdown_db_client():
    client.close()
