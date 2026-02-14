"""Fear & Greed Index 服務。"""
from __future__ import annotations

from copy import deepcopy
from datetime import UTC, datetime
from typing import Any

import httpx
from fastapi import HTTPException


class FearGreedService:
    """封裝 alternative.me Fear & Greed API。"""

    BASE_URL = "https://api.alternative.me/fng"

    def __init__(self, timeout: float = 10.0) -> None:
        self.timeout = timeout
        self._current_cache: dict[str, Any] | None = None
        self._history_cache: dict[int, list[dict[str, Any]]] = {}

    def get_cached_current(self) -> dict[str, Any] | None:
        if self._current_cache is None:
            return None
        return deepcopy(self._current_cache)

    def get_cached_history(self, days: int) -> list[dict[str, Any]] | None:
        cached = self._history_cache.get(days)
        if cached is None:
            return None
        return deepcopy(cached)

    async def get_current(self) -> dict[str, Any]:
        """取得最新 Fear & Greed Index。"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                response = await client.get(self.BASE_URL)
                response.raise_for_status()
            
            data = response.json()
            if not data.get("data"):
                raise HTTPException(status_code=502, detail="Fear & Greed API 無回傳數據")
            
            latest = data["data"][0]
            latest_timestamp = int(latest["timestamp"])
            result = {
                "value": int(latest["value"]),
                "value_classification": latest["value_classification"],
                "timestamp": latest_timestamp,
                "time_updated": datetime.fromtimestamp(latest_timestamp, UTC).strftime("%Y-%m-%d %H:%M:%S UTC"),
            }
            self._current_cache = deepcopy(result)
            return result
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
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                response = await client.get(f"{self.BASE_URL}/?limit={limit}")
                response.raise_for_status()
            
            data = response.json()
            items = data.get("data", [])
            
            history = [
                {
                    "value": int(item["value"]),
                    "value_classification": item["value_classification"],
                    "timestamp": int(item["timestamp"]),
                    "date": datetime.fromtimestamp(int(item["timestamp"])).strftime("%Y-%m-%d"),
                }
                for item in items
            ]
            self._history_cache[days] = deepcopy(history)
            return history
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Fear & Greed API 錯誤: {exc.response.status_code}",
            ) from exc
        except httpx.RequestError as exc:
            raise HTTPException(status_code=502, detail="無法連線 Fear & Greed API") from exc

    async def get_current_safe(self) -> dict[str, Any]:
        """取得最新 Fear & Greed Index（失敗時改用最後成功快取）。"""
        try:
            data = await self.get_current()
            data["is_stale"] = False
            data["data_source"] = "alternative_me"
            return data
        except HTTPException as exc:
            cached = self.get_cached_current()
            if cached is None:
                raise exc
            cached["is_stale"] = True
            cached["data_source"] = "alternative_me_cache"
            cached["fallback_reason"] = exc.detail
            return cached

    async def get_history_safe(self, days: int = 30) -> list[dict[str, Any]]:
        """取得歷史 Fear & Greed Index（失敗時改用最後成功快取）。"""
        try:
            return await self.get_history(days)
        except HTTPException as exc:
            cached = self.get_cached_history(days)
            if cached is None:
                raise exc
            return cached


fear_greed_service = FearGreedService()
