"""Portfolio Tracker 服務 - 倉位與損益計算。"""
from __future__ import annotations

from datetime import UTC, datetime
from typing import Any


class PortfolioService:
    """投資組合服務 (Mock Data)。"""

    MOCK_POSITIONS = [
        {"coin": "BTC", "quantity": 0.85, "avg_cost_usd": 56200.0, "current_price_usd": 63780.0},
        {"coin": "ETH", "quantity": 8.2, "avg_cost_usd": 2940.0, "current_price_usd": 3210.0},
        {"coin": "SOL", "quantity": 120.0, "avg_cost_usd": 102.5, "current_price_usd": 114.3},
        {"coin": "AVAX", "quantity": 180.0, "avg_cost_usd": 38.6, "current_price_usd": 34.2},
    ]

    @staticmethod
    def _calculate_position(raw: dict[str, Any]) -> dict[str, Any]:
        quantity = float(raw["quantity"])
        avg_cost = float(raw["avg_cost_usd"])
        current_price = float(raw["current_price_usd"])

        cost_basis = quantity * avg_cost
        market_value = quantity * current_price
        pnl_usd = market_value - cost_basis
        pnl_pct = (pnl_usd / cost_basis * 100) if cost_basis > 0 else 0.0

        return {
            "coin": str(raw["coin"]).upper(),
            "quantity": quantity,
            "avg_cost_usd": avg_cost,
            "current_price_usd": current_price,
            "cost_basis_usd": round(cost_basis, 2),
            "market_value_usd": round(market_value, 2),
            "pnl_usd": round(pnl_usd, 2),
            "pnl_pct": round(pnl_pct, 2),
        }

    async def get_portfolio(self) -> dict[str, Any]:
        """取得整體投資組合。"""
        positions = [self._calculate_position(raw) for raw in self.MOCK_POSITIONS]

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
            "data_source": "mock_positions",
            "is_mock": True,
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
