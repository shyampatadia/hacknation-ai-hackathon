from fastapi import APIRouter

from app.mock_data import MOCK_FACILITIES

router = APIRouter(prefix="/api/facilities", tags=["facilities"])


@router.get("")
async def list_facilities():
    return {"facilities": [facility.model_dump() for facility in MOCK_FACILITIES]}
