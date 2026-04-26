from fastapi import APIRouter, Depends

from app.dependencies import get_current_user
from app.models import AuthenticatedUser, UserProfileUpsert
from app.services.supabase import fetch_user_profile, upsert_user_profile

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/me")
async def get_me(current_user: AuthenticatedUser = Depends(get_current_user)):
    return {"user": current_user.model_dump()}


@router.get("/profile")
async def get_profile(current_user: AuthenticatedUser = Depends(get_current_user)):
    profile = await fetch_user_profile(current_user.id)
    return {"profile": profile.model_dump() if profile else None}


@router.post("/profile")
async def create_or_update_profile(
    payload: UserProfileUpsert,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    profile = await upsert_user_profile(current_user, payload)
    return {"profile": profile.model_dump()}
