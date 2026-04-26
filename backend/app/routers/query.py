from fastapi import APIRouter

from app.mock_data import MOCK_FACILITIES
from app.models import AgentQueryRequest, AgentQueryResponse, CrisisQueryRequest, CrisisQueryResponse

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

@router.post("/agent")
async def agent_query(payload: AgentQueryRequest) -> AgentQueryResponse:
    """
    Schema for incoming agent query requests.

    AgentQueryRequest:
    - payload: str = Field(min_length=1)
    """
    # Hard code an example agent response, that responds about the closest available facility in the MOCK_FACILITIES dataset. 
    # And concerns about the desert score of the district that facility is in.
    return AgentQueryResponse(
        agent_response="The closest available facility to the crisis location is 'Sadar Hospital' in Palamu district, which is approximately 5 km away. However, please note that Palamu district has a desert score of 8, indicating a high level of resource scarcity and potential challenges in accessing care. It is advisable to consider alternative facilities or escalate the query to ensure timely and effective assistance for the crisis at hand."
    )
