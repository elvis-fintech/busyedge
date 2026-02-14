"""AI Signals API 路由。"""
from __future__ import annotations

from fastapi import APIRouter, Query

from app.services.ai_signals import ai_signals_service

router = APIRouter(prefix="/ai", tags=["ai"])


@router.get("/signals")
async def get_all_signals():
    """取得所有幣種既交易信號。"""
    signals = await ai_signals_service.get_all_signals()
    return {"data": signals}


@router.get("/signals/{coin}")
async def get_coin_signal(coin: str):
    """取得特定幣種既交易信號。"""
    signal = await ai_signals_service.get_signal(coin)
    return {"data": signal}


@router.get("/analysis/{coin}")
async def get_coin_analysis(coin: str):
    """取得特定幣種既詳細AI分析。"""
    analysis = await ai_signals_service.get_analysis(coin)
    return {"data": analysis}
