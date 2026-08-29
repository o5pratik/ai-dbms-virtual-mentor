from fastapi import APIRouter

from ..ai_tutor import fix_query
from ..models import FixRequest


router = APIRouter(prefix="/api", tags=["AI Tutor"])


@router.post("/fix")
def fix_sql(request: FixRequest) -> dict:
    return fix_query(request.query, request.database_error)
