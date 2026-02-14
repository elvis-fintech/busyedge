'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { API_BASE_URL } from '../lib/config'

type AlertDirection = 'above' | 'below'

interface AlertItem {
  id: string
  symbol: string
  target_price_usd: number
  direction: AlertDirection
  note: string | null
  is_active: boolean
  created_at: string
  last_checked_at: string | null
  last_triggered_at: string | null
  trigger_count: number
}

interface CheckResult {
  checked_count: number
  triggered_count: number
  triggered_alert_ids: string[]
  checked_at: string
  delivery: string
}

const SUPPORTED_COINS = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'BNB', 'ADA', 'AVAX']

function formatDirection(direction: AlertDirection): string {
  return direction === 'above' ? '高於' : '低於'
}

export default function AlertsDashboard() {
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [coin, setCoin] = useState('BTC')
  const [targetPrice, setTargetPrice] = useState('')
  const [direction, setDirection] = useState<AlertDirection>('above')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null)

  const loadAlerts = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/alerts`, { cache: 'no-store' })
      if (!res.ok) {
        throw new Error(`載入提醒失敗: ${res.status}`)
      }
      const payload = (await res.json()) as { data: AlertItem[] }
      setAlerts(payload.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入提醒失敗')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAlerts()
  }, [loadAlerts])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const parsedPrice = Number(targetPrice)
      if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
        throw new Error('請輸入有效目標價格')
      }

      const res = await fetch(`${API_BASE_URL}/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: coin,
          target_price_usd: parsedPrice,
          direction,
          note: note.trim() || null,
        }),
      })

      if (!res.ok) {
        const payload = (await res.json()) as { detail?: string }
        throw new Error(payload.detail ?? `建立失敗: ${res.status}`)
      }

      setTargetPrice('')
      setNote('')
      await loadAlerts()
    } catch (err) {
      setError(err instanceof Error ? err.message : '建立提醒失敗')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(alertId: string) {
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/alerts/${alertId}`, { method: 'DELETE' })
      if (!res.ok) {
        throw new Error(`刪除失敗: ${res.status}`)
      }
      await loadAlerts()
    } catch (err) {
      setError(err instanceof Error ? err.message : '刪除提醒失敗')
    }
  }

  async function runCheck() {
    setChecking(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/alerts/check`, { method: 'POST' })
      if (!res.ok) {
        throw new Error(`檢查失敗: ${res.status}`)
      }
      const payload = (await res.json()) as { data: CheckResult }
      setCheckResult(payload.data)
      await loadAlerts()
    } catch (err) {
      setError(err instanceof Error ? err.message : '提醒檢查失敗')
    } finally {
      setChecking(false)
    }
  }

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">🔔 Alerts</h1>
        <button
          onClick={() => void runCheck()}
          disabled={checking}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          {checking ? '檢查中...' : '立即檢查提醒'}
        </button>
      </div>

      <p className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-200">
        提示：提醒在命中後會自動停用，避免重覆發送。若要接 Telegram，請設定 `TELEGRAM_BOT_TOKEN` 同 `TELEGRAM_CHAT_ID`。
      </p>

      {error && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
          {error}
        </p>
      )}

      {checkResult && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="font-medium text-slate-900 dark:text-white">
            最近檢查: {new Date(checkResult.checked_at).toLocaleString()}
          </p>
          <p className="mt-1 text-slate-600 dark:text-slate-300">
            已檢查 {checkResult.checked_count} 筆、觸發 {checkResult.triggered_count} 筆、通知狀態 {checkResult.delivery}
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 text-xl font-semibold text-slate-900 dark:text-white">建立提醒</h2>
        <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-4">
          <select
            value={coin}
            onChange={(e) => setCoin(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          >
            {SUPPORTED_COINS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as AlertDirection)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          >
            <option value="above">價格高於</option>
            <option value="below">價格低於</option>
          </select>

          <input
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            placeholder="目標價格 (USD)"
            inputMode="decimal"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          />

          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? '提交中...' : '建立提醒'}
          </button>

          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="備註（可選）"
            className="md:col-span-4 rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          />
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 text-xl font-semibold text-slate-900 dark:text-white">提醒列表</h2>

        {loading ? (
          <p className="text-slate-500 dark:text-slate-400">載入中...</p>
        ) : alerts.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400">暫時未有提醒。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
              <thead className="bg-slate-50 text-left text-slate-600 dark:bg-slate-700/40 dark:text-slate-300">
                <tr>
                  <th className="px-3 py-2 font-medium">幣種</th>
                  <th className="px-3 py-2 font-medium">條件</th>
                  <th className="px-3 py-2 font-medium">狀態</th>
                  <th className="px-3 py-2 font-medium">觸發次數</th>
                  <th className="px-3 py-2 font-medium">建立時間</th>
                  <th className="px-3 py-2 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {alerts.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">{item.symbol}</td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                      {formatDirection(item.direction)} ${item.target_price_usd.toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          item.is_active
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {item.is_active ? '啟用中' : '已停用'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{item.trigger_count}</td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => void handleDelete(item.id)}
                        className="rounded-md border border-rose-300 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-900/20"
                      >
                        刪除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
