from fastapi import APIRouter, HTTPException

from ..ddl_schema_analyzer import analyze_ddl_schema
from ..models import SchemaAnalyzeRequest


router = APIRouter(prefix="/api", tags=["Schema analysis"])


@router.post("/analyze-schema")
def analyze_schema_ddl(payload: SchemaAnalyzeRequest) -> dict:
    try:
        return analyze_ddl_schema(payload.sql)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
