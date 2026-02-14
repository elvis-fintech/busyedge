"""Portfolio Tracker 服務 - 以環境變數持倉 + 即時行情計算。"""
from __future__ import annotations

import json
import os
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException

from app.services.market_data import coin_gecko_service


class PortfolioService:
    """投資組合服務（只使用真實行情，不回傳 mock 值）。"""

    COIN_ID_BY_SYMBOL = {
        "BTC": "bitcoin",
        "ETH": "ethereum",
        "SOL": "solana",
        "XRP": "ripple",
        "DOGE": "dogecoin",
        "BNB": "binancecoin",
        "ADA": "cardano",
        "AVAX": "avalanche-2",
    }

    def _load_positions_from_env(self) -> list[dict[str, Any]]:
        raw = os.getenv("PORTFOLIO_POSITIONS_JSON", "").strip()
        if not raw:
            raise HTTPException(
                status_code=503,
                detail="未設定 PORTFOLIO_POSITIONS_JSON，無法計算真實投資組合",
            )

        try:
            payload = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise HTTPException(
                status_code=500,
                detail="PORTFOLIO_POSITIONS_JSON 格式錯誤（需為 JSON 陣列）",
            ) from exc

        if not isinstance(payload, list) or not payload:
            raise HTTPException(
                status_code=500,
                detail="PORTFOLIO_POSITIONS_JSON 內容無效（需為非空陣列）",
            )

        positions: list[dict[str, Any]] = []
        for idx, item in enumerate(payload):
            if not isinstance(item, dict):
                raise HTTPException(
                    status_code=500,
                    detail=f"PORTFOLIO_POSITIONS_JSON 第 {idx + 1} 筆不是物件",
                )

            symbol = str(item.get("symbol", "")).upper().strip()
            if symbol not in self.COIN_ID_BY_SYMBOL:
                supported = ", ".join(sorted(self.COIN_ID_BY_SYMBOL))
                raise HTTPException(
                    status_code=500,
                    detail=f"不支援的幣種 {symbol}，目前支援: {supported}",
                )

            try:
                quantity = float(item.get("quantity"))
                avg_cost = float(item.get("avg_cost_usd"))
            except (TypeError, ValueError) as exc:
                raise HTTPException(
                    status_code=500,
                    detail=f"PORTFOLIO_POSITIONS_JSON 第 {idx + 1} 筆 quantity / avg_cost_usd 無法轉為數字",
                ) from exc

            if quantity <= 0 or avg_cost <= 0:
                raise HTTPException(
                    status_code=500,
                    detail=f"PORTFOLIO_POSITIONS_JSON 第 {idx + 1} 筆 quantity / avg_cost_usd 需大於 0",
                )

            positions.append(
                {
                    "coin": symbol,
                    "coin_id": self.COIN_ID_BY_SYMBOL[symbol],
                    "quantity": quantity,
                    "avg_cost_usd": avg_cost,
                }
            )

        return positions

    @staticmethod
    def _calculate_position(
        raw: dict[str, Any],
        current_price: float,
    ) -> dict[str, Any]:
        quantity = float(raw["quantity"])
        avg_cost = float(raw["avg_cost_usd"])

        cost_basis = quantity * avg_cost
        market_value = quantity * current_price
        pnl_usd = market_value - cost_basis
        pnl_pct = (pnl_usd / cost_basis * 100) if cost_basis > 0 else 0.0

        return {
            "coin": str(raw["coin"]).upper(),
            "quantity": quantity,
            "avg_cost_usd": round(avg_cost, 6),
            "current_price_usd": round(current_price, 6),
            "cost_basis_usd": round(cost_basis, 2),
            "market_value_usd": round(market_value, 2),
            "pnl_usd": round(pnl_usd, 2),
            "pnl_pct": round(pnl_pct, 2),
        }

    async def get_portfolio(self) -> dict[str, Any]:
        """取得整體投資組合。"""
        configured_positions = self._load_positions_from_env()
        coin_ids = [item["coin_id"] for item in configured_positions]
        price_rows = await coin_gecko_service.get_simple_prices(coin_ids)
        price_by_symbol = {
            str(item["symbol"]).upper(): float(item["price_usd"])
            for item in price_rows
            if item.get("price_usd") is not None
        }

        positions: list[dict[str, Any]] = []
        for row in configured_positions:
            symbol = row["coin"]
            current_price = price_by_symbol.get(symbol)
            if current_price is None:
                raise HTTPException(
                    status_code=502,
                    detail=f"無法取得 {symbol} 即時價格",
                )
            positions.append(self._calculate_position(row, current_price))

        total_cost = sum(position["cost_basis_usd"] for position in positions)
        total_value = sum(position["market_value_usd"] for position in positions)
        total_pnl = total_value - total_cost
        total_pnl_pct = (total_pnl / total_cost * 100) if total_cost > 0 else 0.0

        for position in positions:
            allocation_pct = (
                position["market_value_usd"] / total_value * 100 if total_value > 0 else 0.0
            )
            position["allocation_pct"] = round(allocation_pct, 2)

        positions.sort(key=lambda item: item["market_value_usd"], reverse=True)

        return {
            "positions": positions,
            "summary": {
                "total_positions": len(positions),
                "total_cost_usd": round(total_cost, 2),
                "total_value_usd": round(total_value, 2),
                "total_pnl_usd": round(total_pnl, 2),
                "total_pnl_pct": round(total_pnl_pct, 2),
            },
            "data_source": "coingecko+portfolio_env",
            "is_mock": False,
            "updated_at": datetime.now(UTC).isoformat(),
        }

    async def get_position(self, coin: str) -> dict[str, Any] | None:
        """取得單一幣種倉位。"""
        target = coin.upper()
        portfolio = await self.get_portfolio()

        position = next(
            (item for item in portfolio["positions"] if item["coin"] == target),
            None,
        )
        if not position:
            return None

        return {
            "position": position,
            "updated_at": portfolio["updated_at"],
        }


portfolio_service = PortfolioService()
