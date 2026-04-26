from fastapi import APIRouter

from app.mock_data import MOCK_FACILITIES
from app.models import CrisisQueryRequest, CrisisQueryResponse

router = APIRouter(prefix="/api/query", tags=["query"])


@router.post("/crisis")
async def crisis_query(payload: CrisisQueryRequest) -> CrisisQueryResponse:
    """
    Schema for incoming crisis query requests.

    CrisisQueryRequest:
    - query: str = Field(min_length=3)
    - language: str = "auto"
    - user_location: str | None (e.g. "42.364601729904244,-71.06120426845533")
    """
    return CrisisQueryResponse(
        query=payload.query,
        language=payload.language,
        facilities=MOCK_FACILITIES[:3],
        desert_alert={
            "district": "Palamu district, Jharkhand",
            "message": "Only two verified candidates within the preferred radius. Escalation and expansion logic should trigger here once the backend is online.",
        },
    )
