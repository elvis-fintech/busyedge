"""API Routes"""
from fastapi import APIRouter

from app.api.market import router as market_router
from app.api.whale import router as whale_router
from app.api.sentiment import router as sentiment_router

router = APIRouter()
router.include_router(market_router)
router.include_router(whale_router)
router.include_router(sentiment_router)


@router.get("/status")
async def api_status():
    return {"status": "ok", "version": "0.1.0"}
