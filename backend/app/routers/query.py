from fastapi import APIRouter

from app.mock_data import MOCK_FACILITIES
from app.models import CrisisQueryRequest, CrisisQueryResponse

router = APIRouter(prefix="/api/query", tags=["query"])


@router.post("/crisis")
async def crisis_query(payload: CrisisQueryRequest) -> CrisisQueryResponse:
    return CrisisQueryResponse(
        query=payload.query,
        language=payload.language,
        facilities=MOCK_FACILITIES[:3],
        desert_alert={
            "district": "Palamu district, Jharkhand",
            "message": "Only two verified candidates within the preferred radius. Escalation and expansion logic should trigger here once the backend is online.",
        },
    )
