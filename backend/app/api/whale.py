"""Whale Tracking API 路由。"""
from __future__ import annotations

from fastapi import APIRouter, Query

from app.services.whale_tracking import whale_tracking_service

router = APIRouter(prefix="/whale", tags=["whale"])


@router.get("/summary")
async def get_whale_summary():
    """取得鯨魚活動摘要。"""
    summary = await whale_tracking_service.get_whale_summary()
    return {"data": summary}


@router.get("/transactions")
async def get_whale_transactions(
    min_value_usd: float = Query(default=10000, ge=0, description="最低 USD 價值篩選")
):
    """取得最近大額轉賬。"""
    transactions = await whale_tracking_service.get_recent_transactions(
        min_value_usd=min_value_usd
    )
    return {"data": transactions}


@router.get("/exchange-flows")
async def get_exchange_flows():
    """取得交易所資金流向。"""
    flows = await whale_tracking_service.get_exchange_flows()
    return {"data": flows}


@router.get("/wallets")
async def get_whale_wallets():
    """取得追蹤中的鯨魚錢包。"""
    wallets = await whale_tracking_service.get_whale_wallets()
    return {"data": wallets}
