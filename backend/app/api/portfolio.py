"""Portfolio API 路由。"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.services.portfolio import portfolio_service

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


@router.get("")
async def get_portfolio():
    """取得投資組合摘要與所有倉位。"""
    data = await portfolio_service.get_portfolio()
    return {"data": data}


@router.get("/{coin}")
async def get_portfolio_position(coin: str):
    """取得特定幣種倉位。"""
    data = await portfolio_service.get_position(coin)
    if data is None:
        raise HTTPException(status_code=404, detail=f"Portfolio position not found: {coin}")
    return {"data": data}
