from fastapi import APIRouter

from ..schema_analyzer import analyze_schema


router = APIRouter(prefix="/api", tags=["Schema"])
router.add_api_route("/schema", analyze_schema, methods=["GET"])
