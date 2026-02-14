# 知識庫

## 2026-02-14 AI Signals 規則化改造

- 目標：把 `ai_signals` 從隨機輸出改為可重現、可解釋的規則引擎。
- 實作：
  - 並行拉取 `CoinGecko` 價格變化、`Funding`、`Fear & Greed`。
  - 用加權分數計算 `BUY/HOLD/SELL`：市場動能 55%、恐懼貪婪 30%、資金費率 15%。
  - 信心分數由偏離中性區間幅度決定，範圍限制為 52-95。
- 防禦策略：
  - 上游來源失敗時自動切 fallback（基準價格 + 中性值），`is_mock=true` 並於 `data_source` 標記來源。
  - 不支援幣種回傳可預期的 `HOLD` 結果，避免 API 500。
- 輸出透明化：
  - 回傳 `model_version`, `data_source`, `is_mock`，前端可直接展示資料可信度狀態。
