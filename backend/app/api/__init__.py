"""API Routes"""
from fastapi import APIRouter

from app.api.market import router as market_router

router = APIRouter()
router.include_router(market_router)


@router.get("/status")
async def api_status():
    return {"status": "ok", "version": "0.1.0"}
