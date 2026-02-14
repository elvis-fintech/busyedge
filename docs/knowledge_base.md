# 知識庫

## 2026-02-14 真實資料策略統一

- 目標：移除 mock/fabricated fallback，改為「live data + cache fallback」。
- 調整範圍：
  - `market_data`：加入短 TTL 快取與子集合切片，減少 CoinGecko 429。
  - `fear_greed`：失敗時只回「最後成功快取」，無快取就拋錯。
  - `market` API：回應統一提供 `is_stale / data_source / stale_reasons`。
  - `portfolio`：改由 `PORTFOLIO_POSITIONS_JSON` + 即時行情計算，未設定回 503。
  - `sentiment`：改由 CoinGecko + Fear&Greed 推導分數；社群 mention/article 無資料時回 `null`。
  - `whale_tracking`：改用 Blockchair 交易資料，`is_mock=false`。
  - `ai_signals`：移除 baseline fake fallback，缺資料時跳過或回錯。

## 2026-02-15 可用性強化（非假資料）

- 問題：
  - CoinGecko 暫時不可用時，`/api/ai/signals` 可能 502。
  - `/api/sentiment/trending` 失敗會影響前端整體情緒頁。
- 實作：
  - `ai_signals`：若完整幣組無快取，退回任一可用快取，允許部份幣種先產生訊號。
  - `sentiment`：trending 來源失敗時回空陣列 `[]`，避免整頁失敗。
- 原則：
  - 只回真實來源結果或明確不可用狀態。
  - 不再生成虛擬價格、中性假值或隨機文本。
