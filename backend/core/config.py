"""Core configuration loaded from .env via dotenv."""
import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')


class Settings:
    MONGO_URL: str = os.environ['MONGO_URL']
    DB_NAME: str = os.environ['DB_NAME']

    JWT_SECRET: str = os.environ.get('JWT_SECRET', 'joy-app-super-secret-change-me-in-prod')
    JWT_ALGORITHM: str = 'HS256'
    JWT_EXPIRE_DAYS: int = 30

    CLOUDINARY_CLOUD_NAME: str = os.environ.get('CLOUDINARY_CLOUD_NAME', '')
    CLOUDINARY_API_KEY: str = os.environ.get('CLOUDINARY_API_KEY', '')
    CLOUDINARY_API_SECRET: str = os.environ.get('CLOUDINARY_API_SECRET', '')


settings = Settings()
