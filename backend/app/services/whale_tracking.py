"""Whale Tracking 服務 - 以 Blockchair Ethereum 即時交易資料為來源。"""
from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

import httpx
from fastapi import HTTPException


# 交易所地址（主要 ETH 錢包，地址統一小寫）
EXCHANGE_ADDRESSES = {
    "0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be": "Binance",
    "0x8ba1f109551bd432803012645ac136ddd64dba72": "Coinbase",
    "0x28c6c06298d514db089934071355e5743bf21d60": "Binance Cold",
    "0xa910f92acdaf488fa6ef021893d3ed2e39d388": "Kraken",
    "0xf584f8728b874a6a5c7a8d4d387c9aae9172d621": "Binance Hot",
    "0x21a31ee1afc51d94c2efccaa2092ad1028285549": "Binance Hot",
    "0x84024672ce60812b0ce1ece96e2ec113c6d8880a": "Binance",
}


class WhaleTrackingService:
    """追蹤大額鏈上轉賬（Whale Tracking）。"""

    BLOCKCHAIR_URL = "https://api.blockchair.com/ethereum/transactions"

    def __init__(self, timeout: float = 20.0) -> None:
        self.timeout = timeout
        self.exchange_addresses = EXCHANGE_ADDRESSES

    async def _fetch_transactions(
        self,
        min_value_usd: float,
        limit: int,
    ) -> list[dict[str, Any]]:
        safe_limit = max(1, min(limit, 50))
        query = f"failed(false),value_usd({int(min_value_usd)}..)"
        params = {"limit": str(safe_limit), "s": "time(desc)", "q": query}
        try:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                response = await client.get(self.BLOCKCHAIR_URL, params=params)
                response.raise_for_status()
            payload = response.json()
            return payload.get("data", [])
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Blockchair API 錯誤: {exc.response.status_code}",
            ) from exc
        except httpx.RequestError as exc:
            raise HTTPException(status_code=502, detail="無法連線 Blockchair API") from exc

    def _normalize_transaction(self, row: dict[str, Any]) -> dict[str, Any] | None:
        tx_hash = row.get("hash")
        sender = str(row.get("sender") or "").lower()
        recipient = str(row.get("recipient") or "").lower()
        value_usd = float(row.get("value_usd") or 0.0)
        value_wei = float(row.get("value") or 0.0)
        time_str = str(row.get("time") or "")

        if not tx_hash or not sender or not recipient or value_usd <= 0:
            return None

        sender_exchange = self.exchange_addresses.get(sender)
        recipient_exchange = self.exchange_addresses.get(recipient)

        try:
            timestamp = int(
                datetime.strptime(time_str, "%Y-%m-%d %H:%M:%S")
                .replace(tzinfo=UTC)
                .timestamp()
            )
        except ValueError:
            return None

        return {
            "hash": str(tx_hash),
            "from": sender,
            "to": recipient,
            "value_eth": round(value_wei / 1e18, 6),
            "value_usd": round(value_usd, 2),
            "timestamp": timestamp,
            "type": "inflow" if recipient_exchange else "outflow",
            "from_exchange": sender_exchange,
            "to_exchange": recipient_exchange,
        }

    async def get_recent_transactions(
        self, address: str | None = None, min_value_usd: float = 10000
    ) -> list[dict[str, Any]]:
        """取得最近大額轉賬。"""
        rows = await self._fetch_transactions(min_value_usd=min_value_usd, limit=50)
        transactions = [self._normalize_transaction(row) for row in rows]
        normalized = [tx for tx in transactions if tx is not None]

        if address:
            target = address.lower()
            normalized = [
                tx
                for tx in normalized
                if tx["from"] == target or tx["to"] == target
            ]

        return sorted(normalized, key=lambda x: x["timestamp"], reverse=True)

    async def get_exchange_flows(self) -> dict[str, Any]:
        """取得交易所資金流向 (In/Out Flow)。"""
        rows = await self._fetch_transactions(min_value_usd=20000, limit=50)
        flows: dict[str, dict[str, float]] = {
            exchange: {"inflow_eth": 0.0, "outflow_eth": 0.0, "net_eth": 0.0}
            for exchange in self.exchange_addresses.values()
        }
        flows["Others"] = {"inflow_eth": 0.0, "outflow_eth": 0.0, "net_eth": 0.0}

        for row in rows:
            tx = self._normalize_transaction(row)
            if tx is None:
                continue
            sender_exchange = tx.get("from_exchange") or "Others"
            recipient_exchange = tx.get("to_exchange") or "Others"
            value_eth = float(tx["value_eth"])

            flows[sender_exchange]["outflow_eth"] += value_eth
            flows[recipient_exchange]["inflow_eth"] += value_eth

        for exchange, data in flows.items():
            net = data["inflow_eth"] - data["outflow_eth"]
            flows[exchange] = {
                "inflow_eth": round(data["inflow_eth"], 2),
                "outflow_eth": round(data["outflow_eth"], 2),
                "net_eth": round(net, 2),
            }

        return flows

    async def get_whale_summary(self) -> dict[str, Any]:
        """取得鯨魚活動摘要 (Whale Activity Summary)。"""
        recent_tx = await self.get_recent_transactions(min_value_usd=10000)
        exchange_flows = await self.get_exchange_flows()

        total_inflow = sum(max(flow["net_eth"], 0) for flow in exchange_flows.values())
        total_outflow = sum(abs(min(flow["net_eth"], 0)) for flow in exchange_flows.values())
        large_tx_count = len([tx for tx in recent_tx if tx["value_usd"] >= 100000])

        return {
            "whale_transactions_24h": len(recent_tx),
            "large_transactions_100k": large_tx_count,
            "total_inflow_eth": round(total_inflow, 2),
            "total_outflow_eth": round(total_outflow, 2),
            "net_flow_eth": round(total_inflow - total_outflow, 2),
            "exchange_flows": exchange_flows,
            "data_source": "blockchair",
            "is_mock": False,
            "updated_at": datetime.now(UTC).isoformat(),
        }

    async def get_whale_wallets(self) -> list[dict[str, Any]]:
        """取得追蹤中的鯨魚錢包（最近大額交易對手方）。"""
        txs = await self.get_recent_transactions(min_value_usd=50000)
        stats: dict[str, dict[str, Any]] = {}

        for tx in txs:
            for key in ("from", "to"):
                address = tx[key]
                if address in self.exchange_addresses:
                    continue
                item = stats.setdefault(
                    address,
                    {
                        "address": address,
                        "label": "External Whale Wallet",
                        "total_received_eth": 0.0,
                        "total_sent_eth": 0.0,
                        "last_active": tx["timestamp"],
                    },
                )
                if key == "to":
                    item["total_received_eth"] += float(tx["value_eth"])
                else:
                    item["total_sent_eth"] += float(tx["value_eth"])
                item["last_active"] = max(item["last_active"], tx["timestamp"])

        wallets = list(stats.values())
        wallets.sort(key=lambda row: row["total_received_eth"] + row["total_sent_eth"], reverse=True)

        return [
            {
                "address": row["address"],
                "label": row["label"],
                "total_received_eth": round(row["total_received_eth"], 4),
                "total_sent_eth": round(row["total_sent_eth"], 4),
                "last_active": row["last_active"],
            }
            for row in wallets[:10]
        ]


whale_tracking_service = WhaleTrackingService()
