"""API Routes"""
from fastapi import APIRouter

from app.api.market import router as market_router
from app.api.whale import router as whale_router

router = APIRouter()
router.include_router(market_router)
router.include_router(whale_router)


@router.get("/status")
async def api_status():
    return {"status": "ok", "version": "0.1.0"}
