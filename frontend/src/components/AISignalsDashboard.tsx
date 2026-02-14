'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { API_BASE_URL } from '../lib/config'
import { useLocale } from './LocaleProvider'

interface SignalData {
  coin: string
  signal: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
  reason: string
  model_version?: string
  data_source?: string
  is_stale?: boolean
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

function translateSignal(signal: SignalData['signal'], locale: 'zh-HK' | 'en'): string {
  if (locale === 'en') {
    if (signal === 'BUY') return 'Buy'
    if (signal === 'SELL') return 'Sell'
    return 'Hold'
  }
  if (signal === 'BUY') return '買入'
  if (signal === 'SELL') return '賣出'
  return '觀望'
}

function translateTrend(trend: string, locale: 'zh-HK' | 'en'): string {
  const key = trend.toLowerCase()
  if (locale === 'en') {
    if (key === 'uptrend') return 'Uptrend'
    if (key === 'downtrend') return 'Downtrend'
    if (key === 'sideways') return 'Sideways'
    return trend
  }
  if (key === 'uptrend') return '上升趨勢'
  if (key === 'downtrend') return '下降趨勢'
  if (key === 'sideways') return '盤整'
  return trend
}

function translateMacd(macd: string, locale: 'zh-HK' | 'en'): string {
  const key = macd.toLowerCase()
  if (locale === 'en') {
    if (key === 'bullish') return 'Bullish'
    if (key === 'bearish') return 'Bearish'
    if (key === 'neutral') return 'Neutral'
    return macd
  }
  if (key === 'bullish') return '多頭'
  if (key === 'bearish') return '空頭'
  if (key === 'neutral') return '中性'
  return macd
}

function translateVolatility(volatility: string, locale: 'zh-HK' | 'en'): string {
  const key = volatility.toLowerCase()
  if (locale === 'en') {
    if (key === 'low') return 'Low'
    if (key === 'medium') return 'Medium'
    if (key === 'high') return 'High'
    return volatility
  }
  if (key === 'low') return '低'
  if (key === 'medium') return '中'
  if (key === 'high') return '高'
  return volatility
}

function hasChineseText(value: string): boolean {
  return /[\u4E00-\u9FFF]/.test(value)
}

export default function AISignalsDashboard() {
  const { locale } = useLocale()
  const t = (zh: string, en: string) => (locale === 'en' ? en : zh)

  const [signals, setSignals] = useState<SignalData[]>([])
  const [selectedCoin, setSelectedCoin] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadSignals = useCallback(async () => {
    setError(null)

    try {
      const res = await fetch(`${API_BASE_URL}/ai/signals`, { cache: 'no-store' })
      if (!res.ok) {
        throw new Error(locale === 'en' ? 'Failed to load AI signals' : '載入 AI 訊號失敗')
      }
      const data = (await res.json()) as { data: SignalData[] }
      setSignals(data.data)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : locale === 'en' ? 'Failed to load data' : '載入失敗')
    } finally {
      setLoading(false)
    }
  }, [locale])

  const loadAnalysis = useCallback(
    async (coin: string) => {
      try {
        const res = await fetch(`${API_BASE_URL}/ai/signals/${coin}`, { cache: 'no-store' })
        if (!res.ok) {
          throw new Error(locale === 'en' ? 'Failed to load analysis' : '載入分析資料失敗')
        }
        const data = (await res.json()) as { data: { analysis: Analysis } }
        setAnalysis(data.data.analysis)
      } catch (err) {
        console.error(locale === 'en' ? 'Failed to load analysis:' : '載入分析資料失敗:', err)
      }
    },
    [locale]
  )

  useEffect(() => {
    void loadSignals()
  }, [loadSignals])

  useEffect(() => {
    if (selectedCoin) {
      void loadAnalysis(selectedCoin)
    }
  }, [selectedCoin, loadAnalysis])

  const topSignal = useMemo(() => signals[0], [signals])

  if (loading && signals.length === 0) {
    return (
      <section className="mx-auto w-full max-w-7xl px-6 py-16">
        <div className="mb-8 h-10 w-48 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
            />
          ))}
        </div>
      </section>
    )
  }

  if (error && signals.length === 0) {
    return (
      <section className="mx-auto w-full max-w-7xl px-6 py-16">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center shadow-sm dark:border-red-800 dark:bg-red-900/20">
          <p className="font-semibold text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={() => void loadSignals()}
            className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            {t('重試', 'Retry')}
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">🤖 {t('AI 訊號', 'AI Signals')}</h1>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {t('更新', 'Updated')}:{' '}
              {lastUpdated.toLocaleTimeString(locale === 'en' ? 'en-US' : 'zh-HK')}
            </span>
          )}
          <button
            onClick={() => void loadSignals()}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            {t('重新整理', 'Refresh')}
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
          {t('更新失敗', 'Update failed')}: {error}
        </p>
      )}

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
        <p>{t('風險提示：AI 訊號僅供參考，並非投資建議。', 'Risk warning: AI signals are for reference only and not investment advice.')}</p>
        <p className="mt-1">
          {t('模型版本', 'Model')}:{' '}
          <span className="font-medium">{topSignal?.model_version ?? '--'}</span>{' '}
          · {t('資料來源', 'Data source')}:{' '}
          <span className="font-medium">{topSignal?.data_source ?? '--'}</span>{' '}
          · {t('狀態', 'Status')}:{' '}
          <span className="font-medium">
            {topSignal?.is_stale
              ? t('快取回退（非最新）', 'Cached fallback (not latest)')
              : t('即時資料', 'Live data')}
          </span>
        </p>
      </div>

      {signals.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {t('暫時未有可用 AI 訊號。', 'No AI signals are currently available.')}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {signals.map((signal) => {
            const fallbackReason =
              locale === 'en' && hasChineseText(signal.reason)
                ? `${translateSignal(signal.signal, locale)} signal with ${signal.confidence}% confidence.`
                : signal.reason

            return (
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
                    {translateSignal(signal.signal, locale)}
                  </span>
                </div>
                <div className="mt-3">
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t('信心度', 'Confidence')}</p>
                  <p className={`text-2xl font-bold ${getConfidenceColor(signal.confidence)}`}>
                    {signal.confidence}%
                  </p>
                </div>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{fallbackReason}</p>
              </button>
            )
          })}
        </div>
      )}

      {selectedCoin && analysis && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              📈 {selectedCoin} {t('詳細分析', 'Detailed Analysis')}
            </h2>
            <button
              onClick={() => setSelectedCoin(null)}
              className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
            >
              ✕ {t('關閉', 'Close')}
            </button>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700">
              <h3 className="mb-3 font-medium text-slate-900 dark:text-white">{t('技術分析', 'Technical Analysis')}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-300">{t('趨勢', 'Trend')}</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {translateTrend(analysis.market_analysis.trend, locale)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-300">RSI</span>
                  <span className="font-medium text-slate-900 dark:text-white">{analysis.market_analysis.rsi}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-300">MACD</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {translateMacd(analysis.market_analysis.macd, locale)}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700">
              <h3 className="mb-3 font-medium text-slate-900 dark:text-white">{t('情緒分析', 'Sentiment Analysis')}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-300">Twitter</span>
                  <span className="font-medium text-slate-900 dark:text-white">{analysis.sentiment_analysis.twitter}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-300">Reddit</span>
                  <span className="font-medium text-slate-900 dark:text-white">{analysis.sentiment_analysis.reddit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-300">News</span>
                  <span className="font-medium text-slate-900 dark:text-white">{analysis.sentiment_analysis.news}</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700">
              <h3 className="mb-3 font-medium text-slate-900 dark:text-white">{t('風險評估', 'Risk Assessment')}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-300">{t('波動性', 'Volatility')}</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {translateVolatility(analysis.risk_assessment.volatility, locale)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-300">{t('風險分數', 'Risk Score')}</span>
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
