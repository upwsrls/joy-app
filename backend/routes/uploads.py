"""Image upload routes (Cloudinary)."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from core.security import get_current_user
from core.cloudinary_service import upload_base64, is_configured

router = APIRouter(prefix='/uploads', tags=['uploads'])


class UploadIn(BaseModel):
    base64: str
    folder: str = 'joy/uploads'


class UploadOut(BaseModel):
    secure_url: str
    public_id: str


@router.post('/image', response_model=UploadOut)
async def upload_image(data: UploadIn, user=Depends(get_current_user)):
    if not is_configured():
        raise HTTPException(status_code=503, detail='Storage immagini non configurato')
    if not data.base64:
        raise HTTPException(status_code=400, detail='Immagine vuota')
    # Cap 12 MB raw base64 (~9 MB binary)
    if len(data.base64) > 12 * 1024 * 1024:
        raise HTTPException(status_code=413, detail='Immagine troppo grande (max ~9 MB)')

    # Force user-scoped folder
    folder = f'joy/{user["id"]}'
    try:
        res = upload_base64(data.base64, folder=folder)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f'Upload fallito: {e}') from e

    return UploadOut(secure_url=res['secure_url'], public_id=res['public_id'])
