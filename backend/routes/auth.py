"""Auth routes: register / login / me."""
import uuid
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr, Field
from core.database import db
from core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    now_utc,
)

router = APIRouter(prefix='/auth', tags=['auth'])


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
