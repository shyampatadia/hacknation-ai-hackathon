from fastapi import APIRouter

from app.mock_data import MOCK_DISTRICTS

router = APIRouter(prefix="/api/map", tags=["map"])


@router.get("/deserts")
async def list_deserts():
    return {"districts": [district.model_dump() for district in MOCK_DISTRICTS]}
