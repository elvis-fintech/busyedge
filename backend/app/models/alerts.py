"""Alerts models - 價格提醒請求與回應模型。"""
from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field, field_validator


class AlertDirection(str, Enum):
    """提醒方向。"""

    ABOVE = "above"
    BELOW = "below"


class CreateAlertRequest(BaseModel):
    """建立提醒請求。"""

    symbol: str = Field(..., description="幣種 symbol，例如 BTC")
    target_price_usd: float = Field(..., gt=0, description="目標價格 (USD)")
    direction: AlertDirection = Field(default=AlertDirection.ABOVE)
    note: str | None = Field(default=None, max_length=120)

    @field_validator("symbol")
    @classmethod
    def normalize_symbol(cls, value: str) -> str:
        symbol = value.strip().upper()
        if not symbol:
            raise ValueError("symbol 不可為空")
        if len(symbol) > 12:
            raise ValueError("symbol 長度不可超過 12")
        return symbol


class AlertResponse(BaseModel):
    """提醒資料回傳格式。"""

    id: str
    symbol: str
    target_price_usd: float
    direction: AlertDirection
    note: str | None
    is_active: bool
    created_at: datetime
    last_checked_at: datetime | None
    last_triggered_at: datetime | None
    trigger_count: int


class CheckAlertsResponse(BaseModel):
    """批次檢查提醒結果。"""

    checked_count: int
    triggered_count: int
    triggered_alert_ids: list[str]
    checked_at: datetime
    delivery: str
