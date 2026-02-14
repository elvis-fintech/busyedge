'use client'

import { useCallback, useEffect, useState } from 'react'
import { API_BASE_URL } from '../lib/config'

interface SignalData {
  coin: string
  signal: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
  reason: string
  model_version?: string
  data_source?: string
  is_mock?: boolean
  generated_at: string
}

interface Analysis {
  market_analysis: {
    trend: string
    rsi: number
    macd: string
  }
  sentiment_analysis: {
    twitter: number
    reddit: number
    news: number
  }
  risk_assessment: {
    volatility: string
    risk_score: number
  }
}

function getSignalColor(signal: string): string {
  switch (signal) {
    case 'BUY':
      return 'bg-emerald-500'
    case 'SELL':
      return 'bg-rose-500'
    default:
      return 'bg-slate-500'
  }
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 70) return 'text-emerald-600'
  if (confidence >= 50) return 'text-amber-600'
  return 'text-rose-600'
}

export default function AISignalsDashboard() {
  const [signals, setSignals] = useState<SignalData[]>([])
  const [selectedCoin, setSelectedCoin] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const coins = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'BNB', 'ADA', 'AVAX']

  const loadSignals = useCallback(async () => {
    setError(null)

    try {
      const res = await fetch(`${API_BASE_URL}/ai/signals`)

      if (!res.ok) {
        throw new Error('Failed to fetch AI signals')
      }

      const data = await res.json()
      setSignals(data.data)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadAnalysis = useCallback(async (coin: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/ai/signals/${coin}`)

      if (!res.ok) {
        throw new Error('Failed to fetch analysis')
      }

      const data = await res.json()
      setAnalysis(data.data.analysis)
    } catch (err) {
      console.error('Failed to load analysis:', err)
    }
  }, [])

  useEffect(() => {
    void loadSignals()
  }, [loadSignals])

  useEffect(() => {
    if (selectedCoin) {
      void loadAnalysis(selectedCoin)
    }
  }, [selectedCoin, loadAnalysis])

  if (loading && signals.length === 0) {
    return (
      <section className="mx-auto w-full max-w-7xl px-6 py-16">
        <div className="mb-8 h-10 w-48 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800" />
          ))}
        </div>
      </section>
    )
  }

  if (error && signals.length === 0) {
    return (
      <section className="mx-auto w-full max-w-7xl px-6 py-16">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center shadow-sm dark:bg-red-900/20">
          <p className="font-semibold text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={() => void loadSignals()}
            className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            重試
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">🤖 AI Signals</h1>
        
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-sm text-slate-500 dark:text-slate-400">
              更新: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => void loadSignals()}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            重新整理
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
          更新失敗: {error}
        </p>
      )}

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
        <p>風險提示：AI 訊號僅供參考，並非投資建議。</p>
        <p className="mt-1">
          模型版本: {signals[0]?.model_version ?? 'unknown'} ·
          資料來源: {signals[0]?.data_source ?? 'unknown'} ·
          狀態: {signals[0]?.is_mock ? 'Mock Data' : 'Live Data'}
        </p>
      </div>

      {/* Signal Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {signals.map((signal) => (
          <button
            key={signal.coin}
            onClick={() => setSelectedCoin(signal.coin)}
            className={`rounded-xl border p-4 text-left transition-all hover:shadow-md ${
              selectedCoin === signal.coin
                ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
                : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-slate-900 dark:text-white">{signal.coin}</span>
              <span className={`rounded-full px-3 py-1 text-sm font-bold text-white ${getSignalColor(signal.signal)}`}>
                {signal.signal}
              </span>
            </div>
            <div className="mt-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">信心度</p>
              <p className={`text-2xl font-bold ${getConfidenceColor(signal.confidence)}`}>
                {signal.confidence}%
              </p>
            </div>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{signal.reason}</p>
          </button>
        ))}
      </div>

      {/* Selected Coin Analysis */}
      {selectedCoin && analysis && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              📈 {selectedCoin} 詳細分析
            </h2>
            <button
              onClick={() => setSelectedCoin(null)}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              ✕ 關閉
            </button>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Technical Analysis */}
            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700">
              <h3 className="mb-3 font-medium text-slate-900 dark:text-white">技術分析</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">趨勢</span>
                  <span className="font-medium text-slate-900 dark:text-white">{analysis.market_analysis.trend}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">RSI</span>
                  <span className="font-medium text-slate-900 dark:text-white">{analysis.market_analysis.rsi}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">MACD</span>
                  <span className="font-medium text-slate-900 dark:text-white">{analysis.market_analysis.macd}</span>
                </div>
              </div>
            </div>

            {/* Sentiment Analysis */}
            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700">
              <h3 className="mb-3 font-medium text-slate-900 dark:text-white">情緒分析</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Twitter</span>
                  <span className="font-medium text-slate-900 dark:text-white">{analysis.sentiment_analysis.twitter}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Reddit</span>
                  <span className="font-medium text-slate-900 dark:text-white">{analysis.sentiment_analysis.reddit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">News</span>
                  <span className="font-medium text-slate-900 dark:text-white">{analysis.sentiment_analysis.news}</span>
                </div>
              </div>
            </div>

            {/* Risk Assessment */}
            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700">
              <h3 className="mb-3 font-medium text-slate-900 dark:text-white">風險評估</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">波動性</span>
                  <span className="font-medium text-slate-900 dark:text-white">{analysis.risk_assessment.volatility}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">風險分數</span>
                  <span className="font-medium text-slate-900 dark:text-white">{analysis.risk_assessment.risk_score}/10</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
