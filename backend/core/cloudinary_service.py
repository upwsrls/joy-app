"""Cloudinary upload helpers."""
import logging
import re
from typing import Optional
import cloudinary
import cloudinary.uploader
from .config import settings

logger = logging.getLogger(__name__)

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True,
)


def is_configured() -> bool:
    return bool(
        settings.CLOUDINARY_CLOUD_NAME
        and settings.CLOUDINARY_API_KEY
        and settings.CLOUDINARY_API_SECRET
    )


def upload_base64(data_url_or_b64: str, folder: str = 'joy/uploads') -> dict:
    """Upload a base64 (or data URL) image to Cloudinary.

    Returns: { secure_url, public_id, width, height }
    Raises ValueError on failure.
    """
    if not is_configured():
        raise RuntimeError('Cloudinary credentials non configurate')
    if not data_url_or_b64:
        raise ValueError('Empty image payload')

    payload = data_url_or_b64
    if not payload.startswith('data:'):
        # cloudinary accepts pure base64 if prefixed with data: scheme
        payload = f'data:image/jpeg;base64,{payload}'

    res = cloudinary.uploader.upload(
        payload,
        folder=folder,
        resource_type='image',
        unique_filename=True,
        overwrite=False,
    )
    return {
        'secure_url': res.get('secure_url'),
        'public_id': res.get('public_id'),
        'width': res.get('width'),
        'height': res.get('height'),
    }


def public_id_from_url(secure_url: str) -> Optional[str]:
    """Best-effort extract Cloudinary public_id (with folder) from a secure URL.
    Example URL:
      https://res.cloudinary.com/<cloud>/image/upload/v1234567890/joy/uploads/abc123.jpg
    -> joy/uploads/abc123
    """
    if not secure_url:
        return None
    m = re.search(r'/upload/(?:v\d+/)?(.+?)\.[a-zA-Z0-9]+(?:\?.*)?$', secure_url)
    return m.group(1) if m else None


def safe_destroy(secure_url: str) -> bool:
    """Delete by URL; returns True if Cloudinary reported ok, False otherwise (best-effort)."""
    pid = public_id_from_url(secure_url)
    if not pid:
        return False
    try:
        res = cloudinary.uploader.destroy(pid, resource_type='image', invalidate=True)
        return res.get('result') == 'ok'
    except Exception as e:
        logger.warning('Cloudinary destroy failed for %s: %s', pid, e)
        return False
