"""Slim FastAPI entrypoint. All logic lives under core/ and routes/."""
import logging
from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware

from core.database import client, ensure_indexes
from routes.auth import router as auth_router
from routes.profile import router as profile_router
from routes.uploads import router as uploads_router
from routes.dono import router as dono_router
from routes.chat import router as chat_router
from routes.recensioni import router as recensioni_router
from routes.notifiche import router as notifiche_router


app = FastAPI(title='JOY API', version='2.0.0')
api = APIRouter(prefix='/api')


@api.get('/')
async def root():
    return {'message': 'JOY API ready', 'version': '2.0.0'}


api.include_router(auth_router)
api.include_router(profile_router)
api.include_router(uploads_router)
api.include_router(dono_router)
api.include_router(chat_router)
api.include_router(recensioni_router)
api.include_router(notifiche_router)

app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*'],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')


@app.on_event('startup')
async def on_startup():
    await ensure_indexes()


@app.on_event('shutdown')
async def on_shutdown():
    client.close()
