"""Sentiment Analysis API 路由。"""
from __future__ import annotations

from fastapi import APIRouter, Query

from app.services.sentiment import sentiment_service

router = APIRouter(prefix="/sentiment", tags=["sentiment"])


@router.get("/overall")
async def get_overall_sentiment():
    """取得整體市場情緒。"""
    data = await sentiment_service.get_overall_sentiment()
    return {"data": data}


@router.get("/coin")
async def get_coin_sentiment(
    coin: str | None = Query(default=None, description="幣種 symbol，例如 BTC, ETH")
):
    """取得特定幣種既情緒數據。"""
    data = await sentiment_service.get_coin_sentiment(coin)
    return {"data": data}


@router.get("/trending")
async def get_trending_topics():
    """取得Trending Topics。"""
    topics = await sentiment_service.get_trending_topics()
    return {"data": topics}


@router.get("/history")
async def get_sentiment_history(
    days: int = Query(default=7, ge=1, le=30, description="歷史天數")
):
    """取得情緒歷史數據。"""
    history = await sentiment_service.get_sentiment_history(days)
    return {"data": history}
