"""Fear & Greed Index 服務。"""
from __future__ import annotations

from datetime import datetime
from typing import Any

import httpx
from fastapi import HTTPException


class FearGreedService:
    """封裝 alternative.me Fear & Greed API。"""

    BASE_URL = "https://api.alternative.me/fng"

    def __init__(self, timeout: float = 10.0) -> None:
        self.timeout = timeout

    async def get_current(self) -> dict[str, Any]:
        """取得最新 Fear & Greed Index。"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(self.BASE_URL)
                response.raise_for_status()
            
            data = response.json()
            if not data.get("data"):
                raise HTTPException(status_code=502, detail="Fear & Greed API 無回傳數據")
            
            latest = data["data"][0]
            return {
                "value": int(latest["value"]),
                "value_classification": latest["value_classification"],
                "timestamp": int(latest["timestamp"]),
                "time_updated": latest["time_until_update"],
            }
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Fear & Greed API 錯誤: {exc.response.status_code}",
            ) from exc
        except httpx.RequestError as exc:
            raise HTTPException(status_code=502, detail="無法連線 Fear & Greed API") from exc

    async def get_history(self, days: int = 30) -> list[dict[str, Any]]:
        """取得歷史 Fear & Greed Index。"""
        try:
            # API 支持 limit 參數
            limit = min(days, 100)  # API 最多返回 100 條
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.BASE_URL}/?limit={limit}")
                response.raise_for_status()
            
            data = response.json()
            items = data.get("data", [])
            
            return [
                {
                    "value": int(item["value"]),
                    "value_classification": item["value_classification"],
                    "timestamp": int(item["timestamp"]),
                    "date": datetime.fromtimestamp(int(item["timestamp"])).strftime("%Y-%m-%d"),
                }
                for item in items
            ]
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Fear & Greed API 錯誤: {exc.response.status_code}",
            ) from exc
        except httpx.RequestError as exc:
            raise HTTPException(status_code=502, detail="無法連線 Fear & Greed API") from exc


fear_greed_service = FearGreedService()
