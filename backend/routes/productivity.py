from fastapi import APIRouter, HTTPException

from ..models import DeleteSavedRequest, ProgressRequest, SaveQueryRequest
from ..productivity_store import clear_history, delete_saved, list_history, list_progress, list_saved, save_query, update_progress


router = APIRouter(prefix="/api", tags=["Productivity"])


@router.get("/history")
def history() -> dict:
    return {"items": list_history()}


@router.delete("/history")
def remove_history() -> dict:
    clear_history()
    return {"success": True}


@router.get("/saved")
def saved_queries() -> dict:
    return {"items": list_saved()}


@router.post("/saved")
def create_saved_query(request: SaveQueryRequest) -> dict:
    if not request.query.lstrip().upper().startswith(("SELECT", "WITH")):
        raise HTTPException(status_code=400, detail="Only read-only SELECT or WITH queries can be saved.")
    return {"success": True, "id": save_query(request.name.strip(), request.query.strip())}


@router.delete("/saved")
def remove_saved_query(request: DeleteSavedRequest) -> dict:
    delete_saved(request.id)
    return {"success": True}


@router.get("/progress")
def progress() -> dict:
    return {"items": list_progress()}


@router.post("/progress")
def set_progress(request: ProgressRequest) -> dict:
    update_progress(request.topic_id, request.completed)
    return {"success": True}
