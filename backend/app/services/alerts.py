"""Alerts service - 價格提醒與 Telegram 通知。"""
from __future__ import annotations

import os
from datetime import UTC, datetime
from uuid import uuid4

import httpx

from app.models.alerts import AlertDirection, AlertResponse, CreateAlertRequest
from app.services.market_data import coin_gecko_service


class AlertsService:
    """管理價格提醒（記憶體儲存版本）。"""

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

    def __init__(self) -> None:
        self._alerts: dict[str, AlertResponse] = {}

    def _now(self) -> datetime:
        return datetime.now(UTC)

    def _telegram_credentials(self) -> tuple[str | None, str | None]:
        return os.getenv("TELEGRAM_BOT_TOKEN"), os.getenv("TELEGRAM_CHAT_ID")

    async def list_alerts(self) -> list[AlertResponse]:
        alerts = sorted(
            self._alerts.values(),
            key=lambda item: item.created_at,
            reverse=True,
        )
        return alerts

    async def create_alert(self, payload: CreateAlertRequest) -> AlertResponse:
        symbol = payload.symbol.upper()
        if symbol not in self.COIN_ID_BY_SYMBOL:
            supported = ", ".join(sorted(self.COIN_ID_BY_SYMBOL))
            raise ValueError(f"不支援的幣種 {symbol}，目前支援: {supported}")

        alert = AlertResponse(
            id=f"alt_{uuid4().hex[:10]}",
            symbol=symbol,
            target_price_usd=round(payload.target_price_usd, 4),
            direction=payload.direction,
            note=payload.note,
            is_active=True,
            created_at=self._now(),
            last_checked_at=None,
            last_triggered_at=None,
            trigger_count=0,
        )
        self._alerts[alert.id] = alert
        return alert

    async def delete_alert(self, alert_id: str) -> bool:
        if alert_id not in self._alerts:
            return False
        del self._alerts[alert_id]
        return True

    def _is_triggered(self, alert: AlertResponse, current_price: float) -> bool:
        if alert.direction == AlertDirection.ABOVE:
            return current_price >= alert.target_price_usd
        return current_price <= alert.target_price_usd

    async def _send_telegram_message(self, message: str) -> str:
        bot_token, chat_id = self._telegram_credentials()
        if not bot_token or not chat_id:
            return "telegram_not_configured"

        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    url,
                    json={"chat_id": chat_id, "text": message},
                )
                response.raise_for_status()
            return "sent"
        except httpx.HTTPError:
            return "send_failed"

    async def check_alerts(self) -> dict[str, object]:
        active_alerts = [item for item in self._alerts.values() if item.is_active]
        if not active_alerts:
            return {
                "checked_count": 0,
                "triggered_count": 0,
                "triggered_alert_ids": [],
                "checked_at": self._now(),
                "delivery": "skipped",
            }

        coin_ids = list(
            {
                self.COIN_ID_BY_SYMBOL[item.symbol]
                for item in active_alerts
                if item.symbol in self.COIN_ID_BY_SYMBOL
            }
        )
        prices = await coin_gecko_service.get_simple_prices(coin_ids)
        price_by_symbol = {entry["symbol"].upper(): float(entry["price_usd"]) for entry in prices if entry.get("price_usd") is not None}

        checked_at = self._now()
        triggered_ids: list[str] = []
        delivery_status = "not_triggered"

        for alert in active_alerts:
            alert.last_checked_at = checked_at
            current_price = price_by_symbol.get(alert.symbol)
            if current_price is None:
                continue

            if not self._is_triggered(alert, current_price):
                continue

            alert.is_active = False
            alert.last_triggered_at = checked_at
            alert.trigger_count += 1
            triggered_ids.append(alert.id)

            direction_text = "高於" if alert.direction == AlertDirection.ABOVE else "低於"
            note_text = f"\n備註: {alert.note}" if alert.note else ""
            message = (
                f"BusyEdge 價格提醒觸發\n"
                f"幣種: {alert.symbol}\n"
                f"現價: ${current_price:,.4f}\n"
                f"條件: {direction_text} ${alert.target_price_usd:,.4f}"
                f"{note_text}"
            )
            # 只要有一則通知成功，就回報 sent
            send_result = await self._send_telegram_message(message)
            if send_result == "sent":
                delivery_status = "sent"
            elif delivery_status != "sent":
                delivery_status = send_result

        return {
            "checked_count": len(active_alerts),
            "triggered_count": len(triggered_ids),
            "triggered_alert_ids": triggered_ids,
            "checked_at": checked_at,
            "delivery": delivery_status,
        }


alerts_service = AlertsService()
