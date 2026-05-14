"""MongoDB client + collection helpers."""
from motor.motor_asyncio import AsyncIOMotorClient
from .config import settings

client = AsyncIOMotorClient(settings.MONGO_URL)
db = client[settings.DB_NAME]


async def ensure_indexes():
    await db.users.create_index('email', unique=True)
    await db.users.create_index('id', unique=True)
    await db.profiles.create_index('user_id', unique=True)
    await db.doni.create_index('id', unique=True)
    await db.doni.create_index('ritirato')
    await db.conversazioni.create_index('id', unique=True)
    await db.messaggi.create_index([('conversazione_id', 1), ('created_at', 1)])
    await db.recensioni.create_index([('dono_id', 1), ('reviewer_id', 1)], unique=True)
    await db.recensioni.create_index('donor_id')
    # Moderation (Apple compliance)
    await db.segnalazioni.create_index('id', unique=True)
    await db.segnalazioni.create_index([('target_type', 1), ('target_id', 1)])
    await db.segnalazioni.create_index([('reporter_id', 1), ('target_type', 1), ('target_id', 1)], unique=True)
    await db.blocks.create_index([('blocker_id', 1), ('blocked_id', 1)], unique=True)
    await db.blocks.create_index('blocked_id')
