"""Auth routes: register / login / me + password reset via OTP."""
import uuid
import secrets
import logging
from datetime import timedelta
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr, Field
from core.database import db
from core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    now_utc,
    pwd_context,
)

router = APIRouter(prefix='/auth', tags=['auth'])
logger = logging.getLogger(__name__)

OTP_TTL_MINUTES = 10
OTP_MAX_ATTEMPTS = 5


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


class ForgotIn(BaseModel):
    email: EmailStr


class VerifyOtpIn(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6)


class ResetPasswordIn(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6)
    new_password: str = Field(min_length=6)


@router.post('/register', response_model=TokenOut)
async def register(data: RegisterIn):
    email = data.email.lower().strip()
    existing = await db.users.find_one({'email': email})
    if existing:
        raise HTTPException(status_code=400, detail='Email già registrata')

    user_id = str(uuid.uuid4())
    await db.users.insert_one({
        'id': user_id,
        'email': email,
        'password_hash': hash_password(data.password),
        'created_at': now_utc().isoformat(),
    })
    return TokenOut(access_token=create_access_token(user_id), user_id=user_id, email=email)


@router.post('/login', response_model=TokenOut)
async def login(data: LoginIn):
    email = data.email.lower().strip()
    user = await db.users.find_one({'email': email})
    if not user or not verify_password(data.password, user['password_hash']):
        raise HTTPException(status_code=401, detail='Email o password non corretti')
    return TokenOut(access_token=create_access_token(user['id']), user_id=user['id'], email=user['email'])


@router.get('/me', response_model=UserOut)
async def me(user=Depends(get_current_user)):
    return UserOut(id=user['id'], email=user['email'])


@router.delete('/me')
async def cancella_account(user=Depends(get_current_user)):
    """Cancellazione definitiva dell'account (Apple Guideline 5.1.1).

    Strategia: anonimizza i contenuti dell'utente per preservare la coerenza
    della comunità (chat, recensioni date/ricevute), ma rimuove i suoi dati
    personali (profilo, push token, password, email) in modo che l'utente
    non sia più identificabile.
    """
    user_id = user['id']
    logger.warning('🗑️  Cancellazione account user_id=%s', user_id)

    # 1) Rimuovi credenziali e identità (l'utente non potrà più loggarsi)
    deleted_email = f'deleted-{user_id[:8]}@joy.local'
    await db.users.update_one(
        {'id': user_id},
        {'$set': {
            'email': deleted_email,
            'password_hash': '!deleted',
            'push_token': None,
            'deleted_at': now_utc().isoformat(),
            'deleted': True,
        }},
    )

    # 2) Rimuovi profilo (nome, foto, città, telefono)
    await db.profiles.delete_one({'user_id': user_id})

    # 3) "Ritira" tutti i suoi doni attivi (rimossi dalle liste pubbliche)
    await db.doni.update_many(
        {'user_id': user_id, 'ritirato': False},
        {'$set': {'ritirato': True, 'rimosso_da_account_cancellato': True}},
    )

    # 4) Rimuovi le sue letture / OTP / token push
    await db.password_resets.delete_many({'email': user.get('email', '')})
    await db.letture.delete_many({'user_id': user_id})

    # 5) Rimuovi i blocchi che riguardano l'utente
    await db.blocks.delete_many({'$or': [{'blocker_id': user_id}, {'blocked_id': user_id}]})

    # 6) Le recensioni date/ricevute vengono mantenute ma anonimizzate (autore mostrato come "Utente eliminato")
    # Nessuna update necessaria: il frontend rileva il profilo mancante e mostra il fallback.

    return {'ok': True, 'message': 'Account cancellato definitivamente.'}


# ---------- Password reset (OTP) ----------
@router.post('/forgot-password')
async def forgot_password(data: ForgotIn):
    """Genera un OTP a 6 cifre, lo memorizza hashato, e (per ora) lo stampa in console.
    Risponde sempre 200 per non rivelare se l'email esiste."""
    email = data.email.lower().strip()
    user = await db.users.find_one({'email': email})

    if user:
        otp = f'{secrets.randbelow(1_000_000):06d}'
        otp_hash = pwd_context.hash(otp)
        expires = now_utc() + timedelta(minutes=OTP_TTL_MINUTES)
        await db.password_resets.update_one(
            {'email': email},
            {'$set': {
                'email': email,
                'otp_hash': otp_hash,
                'expires_at': expires.isoformat(),
                'attempts': 0,
                'used': False,
                'created_at': now_utc().isoformat(),
            }},
            upsert=True,
        )
        # TODO: integrare invio email reale (SendGrid/Resend). Per ora log.
        logger.warning('═' * 60)
        logger.warning('🔑 [JOY] Password reset OTP per %s : %s (valido %d min)', email, otp, OTP_TTL_MINUTES)
        logger.warning('═' * 60)

    return {
        'ok': True,
        'message': "Se l'email è registrata, riceverai un codice a 6 cifre.",
        'ttl_minutes': OTP_TTL_MINUTES,
    }


async def _consume_otp(email: str, otp: str) -> dict:
    """Verifica e consuma un OTP. Solleva HTTPException se non valido."""
    record = await db.password_resets.find_one({'email': email})
    if not record:
        raise HTTPException(status_code=400, detail='Codice non valido o scaduto')
    if record.get('used'):
        raise HTTPException(status_code=400, detail='Codice già utilizzato')
    try:
        from datetime import datetime
        expires = datetime.fromisoformat(record['expires_at'])
        if expires < now_utc():
            raise HTTPException(status_code=400, detail='Codice scaduto, richiedine uno nuovo')
    except (KeyError, ValueError):
        raise HTTPException(status_code=400, detail='Codice non valido')

    if record.get('attempts', 0) >= OTP_MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail='Troppi tentativi, richiedi un nuovo codice')

    if not pwd_context.verify(otp, record['otp_hash']):
        await db.password_resets.update_one({'email': email}, {'$inc': {'attempts': 1}})
        raise HTTPException(status_code=400, detail='Codice non corretto')

    return record


@router.post('/verify-otp')
async def verify_otp(data: VerifyOtpIn):
    """Verifica solo se l'OTP è valido (senza consumarlo). Utile per UX a step."""
    email = data.email.lower().strip()
    record = await db.password_resets.find_one({'email': email})
    if not record or record.get('used'):
        raise HTTPException(status_code=400, detail='Codice non valido o scaduto')

    from datetime import datetime
    try:
        expires = datetime.fromisoformat(record['expires_at'])
        if expires < now_utc():
            raise HTTPException(status_code=400, detail='Codice scaduto, richiedine uno nuovo')
    except (KeyError, ValueError):
        raise HTTPException(status_code=400, detail='Codice non valido')

    if record.get('attempts', 0) >= OTP_MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail='Troppi tentativi, richiedi un nuovo codice')

    if not pwd_context.verify(data.otp, record['otp_hash']):
        await db.password_resets.update_one({'email': email}, {'$inc': {'attempts': 1}})
        raise HTTPException(status_code=400, detail='Codice non corretto')

    return {'ok': True}


@router.post('/reset-password', response_model=TokenOut)
async def reset_password(data: ResetPasswordIn):
    """Verifica OTP, aggiorna password, fa login. Restituisce un nuovo JWT."""
    email = data.email.lower().strip()
    user = await db.users.find_one({'email': email})
    if not user:
        # Stessa risposta del caso OTP errato per non rivelare presenza
        raise HTTPException(status_code=400, detail='Codice non valido o scaduto')

    await _consume_otp(email, data.otp)

    await db.users.update_one(
        {'id': user['id']},
        {'$set': {'password_hash': hash_password(data.new_password)}},
    )
    await db.password_resets.update_one(
        {'email': email},
        {'$set': {'used': True}},
    )
    logger.info('Password aggiornata per %s', email)
    return TokenOut(access_token=create_access_token(user['id']), user_id=user['id'], email=user['email'])
