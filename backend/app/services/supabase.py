from typing import Any

import httpx
from fastapi import HTTPException, status

from app.config import get_settings
from app.models import AuthenticatedUser, UserProfile, UserProfileUpsert


async def fetch_authenticated_user(access_token: str) -> AuthenticatedUser:
    settings = get_settings()
    auth_url = f"{settings.supabase_url}/auth/v1/user"

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(
            auth_url,
            headers={
                "apikey": settings.supabase_publishable_key,
                "Authorization": f"Bearer {access_token}",
            },
        )

    if response.status_code != status.HTTP_200_OK:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Supabase access token.")

    payload = response.json()

    return AuthenticatedUser(
        id=payload["id"],
        email=payload["email"],
        role=payload.get("role", "authenticated"),
        last_sign_in_at=payload.get("last_sign_in_at"),
    )


async def fetch_user_profile(user_id: str) -> UserProfile | None:
    settings = get_settings()
    rest_url = f"{settings.supabase_url}/rest/v1/user_profiles"

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(
            rest_url,
            params={"id": f"eq.{user_id}", "select": "*"},
            headers={
                "apikey": settings.supabase_service_role_key,
                "Authorization": f"Bearer {settings.supabase_service_role_key}",
            },
        )

    if response.status_code != status.HTTP_200_OK:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to fetch user profile from Supabase.")

    rows = response.json()
    if not rows:
        return None

    return UserProfile.model_validate(rows[0])


async def upsert_user_profile(user: AuthenticatedUser, payload: UserProfileUpsert) -> UserProfile:
    settings = get_settings()
    rest_url = f"{settings.supabase_url}/rest/v1/user_profiles"
    body = [
        {
            "id": user.id,
            "email": user.email,
            "role": payload.role,
            "full_name": payload.full_name,
            "organization": payload.organization,
            "district": payload.district,
            "state": payload.state,
            "language": payload.language,
        }
    ]

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(
            rest_url,
            params={"on_conflict": "id"},
            json=body,
            headers={
                "apikey": settings.supabase_service_role_key,
                "Authorization": f"Bearer {settings.supabase_service_role_key}",
                "Prefer": "resolution=merge-duplicates,return=representation",
            },
        )

    if response.status_code not in {status.HTTP_200_OK, status.HTTP_201_CREATED}:
        detail = _extract_error_detail(response)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail)

    rows = response.json()
    return UserProfile.model_validate(rows[0])


def _extract_error_detail(response: httpx.Response) -> str:
    try:
        payload: dict[str, Any] = response.json()
        return str(payload.get("message") or payload.get("hint") or payload.get("details") or "Supabase request failed.")
    except ValueError:
        return "Supabase request failed."
