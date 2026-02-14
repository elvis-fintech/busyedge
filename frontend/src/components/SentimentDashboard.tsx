'use client'

import { useCallback, useEffect, useState } from 'react'
import { API_BASE_URL } from '../lib/config'
import { useLocale } from './LocaleProvider'

interface SentimentBlock {
  score: number
  label: string
  mention_count?: number | null
  article_count?: number | null
  change_24h: number
}

interface SentimentData {
  overall_score: number
  overall_label: string
  twitter_sentiment: SentimentBlock
  reddit_sentiment: SentimentBlock
  news_sentiment: SentimentBlock
  data_source?: string
  is_stale?: boolean
  updated_at: string
}

interface CoinSentiment {
  coin: string
  score: number
  label: string
  mentions_24h: number | null
  twitter: {
    sentiment: string
    mentions: number | null
    posts: { author: string; text: string; likes: number }[]
  }
  reddit: {
    sentiment: string
    mentions: number | null
    posts: { author: string; title: string; score: number }[]
  }
  news: {
    sentiment: string
    articles: { title: string; source: string }[]
  }
}

interface TrendingTopic {
  topic: string
  sentiment: string
  volume: number
  change: number
}

function getSentimentColor(score: number): string {
  if (score <= 25) return 'bg-red-500'
  if (score <= 45) return 'bg-orange-500'
  if (score <= 55) return 'bg-yellow-500'
  if (score <= 75) return 'bg-lime-500'
  return 'bg-green-500'
}

function fallbackLabelByScore(score: number): string {
  if (score <= 25) return 'Extreme Fear'
  if (score <= 45) return 'Fear'
  if (score <= 55) return 'Neutral'
  if (score <= 75) return 'Greed'
  return 'Extreme Greed'
}

function translateSentimentLabel(label: string, score: number, locale: 'zh-HK' | 'en'): string {
  const resolved = label || fallbackLabelByScore(score)
  if (locale === 'en') return resolved

  const map: Record<string, string> = {
    'Extreme Fear': '極度恐懼',
    Fear: '恐懼',
    Neutral: '中性',
    Greed: '貪婪',
    'Extreme Greed': '極度貪婪',
    Bullish: '偏多',
    Bearish: '偏空',
    Positive: '正面',
    Negative: '負面',
    bullish: '偏多',
    bearish: '偏空',
    positive: '正面',
    negative: '負面',
  }

  return map[resolved] ?? resolved
}

function formatNullableCount(value: number | null | undefined, locale: 'zh-HK' | 'en'): string {
  if (value === null || value === undefined) {
    return '--'
  }
  return value.toLocaleString(locale === 'en' ? 'en-US' : 'zh-HK')
}

export default function SentimentDashboard() {
  const { locale } = useLocale()
  const t = (zh: string, en: string) => (locale === 'en' ? en : zh)

  const [sentiment, setSentiment] = useState<SentimentData | null>(null)
  const [coinSentiment, setCoinSentiment] = useState<CoinSentiment | null>(null)
  const [trending, setTrending] = useState<TrendingTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCoin, setSelectedCoin] = useState('BTC')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const coins = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'BNB', 'ADA', 'AVAX']

  const loadData = useCallback(async () => {
    setError(null)

    try {
      const [sentimentRes, coinRes, trendingRes] = await Promise.all([
        fetch(`${API_BASE_URL}/sentiment/overall`, { cache: 'no-store' }),
        fetch(`${API_BASE_URL}/sentiment/coin?coin=${selectedCoin}`, { cache: 'no-store' }),
        fetch(`${API_BASE_URL}/sentiment/trending`, { cache: 'no-store' }),
      ])

      if (!sentimentRes.ok || !coinRes.ok || !trendingRes.ok) {
        throw new Error(locale === 'en' ? 'Failed to load sentiment data' : '載入情緒資料失敗')
      }

      const sentimentData = (await sentimentRes.json()) as { data: SentimentData }
      const coinData = (await coinRes.json()) as { data: CoinSentiment }
      const trendingData = (await trendingRes.json()) as { data: TrendingTopic[] }

      setSentiment(sentimentData.data)
      setCoinSentiment(coinData.data)
      setTrending(trendingData.data)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : locale === 'en' ? 'Failed to load data' : '載入失敗')
    } finally {
      setLoading(false)
    }
  }, [locale, selectedCoin])

  useEffect(() => {
    void loadData()
  }, [loadData])

  if (loading && !sentiment) {
    return (
      <section className="mx-auto w-full max-w-7xl px-6 py-16">
        <div className="mb-8 h-10 w-48 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
            />
          ))}
        </div>
      </section>
    )
  }

  if (error && !sentiment) {
    return (
      <section className="mx-auto w-full max-w-7xl px-6 py-16">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center shadow-sm dark:border-red-800 dark:bg-red-900/20">
          <p className="font-semibold text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={() => void loadData()}
            className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            {t('重試', 'Retry')}
          </button>
        </div>
      </section>
    )
  }

  if (!sentiment) return null

  const localeCode = locale === 'en' ? 'en-US' : 'zh-HK'

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">💭 {t('市場情緒', 'Market Sentiment')}</h1>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {t('更新', 'Updated')}: {lastUpdated.toLocaleTimeString(localeCode)}
            </span>
          )}
          <button
            onClick={() => void loadData()}
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

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 text-xl font-semibold text-slate-900 dark:text-white">{t('整體市場情緒', 'Overall Sentiment')}</h2>

        <div className="flex items-center gap-6">
          <div className={`flex h-24 w-24 items-center justify-center rounded-full ${getSentimentColor(sentiment.overall_score)} text-3xl font-bold text-white`}>
            {sentiment.overall_score}
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {translateSentimentLabel(sentiment.overall_label, sentiment.overall_score, locale)}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('資料來源', 'Data source')}: {sentiment.data_source ?? '--'}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('狀態', 'Status')}:{' '}
              {sentiment.is_stale
                ? t('快取回退（非最新）', 'Cached fallback (not latest)')
                : t('即時資料', 'Live data')}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700">
            <p className="text-sm text-slate-500 dark:text-slate-300">Twitter</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              {translateSentimentLabel(sentiment.twitter_sentiment.label, sentiment.twitter_sentiment.score, locale)}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {formatNullableCount(sentiment.twitter_sentiment.mention_count, locale)} {t('則提及', 'mentions')}
            </p>
            <p className={`text-sm ${sentiment.twitter_sentiment.change_24h >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {sentiment.twitter_sentiment.change_24h >= 0 ? '+' : ''}
              {sentiment.twitter_sentiment.change_24h}%
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700">
            <p className="text-sm text-slate-500 dark:text-slate-300">Reddit</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              {translateSentimentLabel(sentiment.reddit_sentiment.label, sentiment.reddit_sentiment.score, locale)}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {formatNullableCount(sentiment.reddit_sentiment.mention_count, locale)} {t('則提及', 'mentions')}
            </p>
            <p className={`text-sm ${sentiment.reddit_sentiment.change_24h >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {sentiment.reddit_sentiment.change_24h >= 0 ? '+' : ''}
              {sentiment.reddit_sentiment.change_24h}%
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700">
            <p className="text-sm text-slate-500 dark:text-slate-300">News</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              {translateSentimentLabel(sentiment.news_sentiment.label, sentiment.news_sentiment.score, locale)}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {formatNullableCount(sentiment.news_sentiment.article_count, locale)} {t('篇文章', 'articles')}
            </p>
            <p className={`text-sm ${sentiment.news_sentiment.change_24h >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {sentiment.news_sentiment.change_24h >= 0 ? '+' : ''}
              {sentiment.news_sentiment.change_24h}%
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{t('幣種情緒', 'Coin Sentiment')}</h2>
          <select
            value={selectedCoin}
            onChange={(e) => setSelectedCoin(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          >
            {coins.map((coin) => (
              <option key={coin} value={coin}>
                {coin}
              </option>
            ))}
          </select>
        </div>

        {coinSentiment && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className={`flex h-16 w-16 items-center justify-center rounded-full ${getSentimentColor(coinSentiment.score)} text-2xl font-bold text-white`}>
                {coinSentiment.score}
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{coinSentiment.coin}</p>
                <p className="text-slate-500 dark:text-slate-400">
                  {translateSentimentLabel(coinSentiment.label, coinSentiment.score, locale)} ·{' '}
                  {formatNullableCount(coinSentiment.mentions_24h, locale)} {t('則提及', 'mentions')}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700">
                <p className="mb-2 font-medium text-slate-900 dark:text-white">Twitter</p>
                {coinSentiment.twitter.posts.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-300">
                    {t('目前未接入可驗證 Twitter 帖文資料。', 'No verified Twitter posts are connected yet.')}
                  </p>
                ) : (
                  coinSentiment.twitter.posts.map((post, i) => (
                    <div key={i} className="mb-2 rounded border border-slate-200 p-2 dark:border-slate-600">
                      <p className="text-sm text-slate-700 dark:text-slate-200">{post.text}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">👍 {post.likes}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700">
                <p className="mb-2 font-medium text-slate-900 dark:text-white">Reddit</p>
                {coinSentiment.reddit.posts.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-300">
                    {t('目前未接入可驗證 Reddit 帖文資料。', 'No verified Reddit posts are connected yet.')}
                  </p>
                ) : (
                  coinSentiment.reddit.posts.map((post, i) => (
                    <div key={i} className="mb-2 rounded border border-slate-200 p-2 dark:border-slate-600">
                      <p className="text-sm text-slate-700 dark:text-slate-200">{post.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">⬆ {post.score}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 text-xl font-semibold text-slate-900 dark:text-white">🔥 {t('熱門話題', 'Trending Topics')}</h2>
        {trending.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('目前未有可用話題資料。', 'No trending topic data is available right now.')}
          </p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {trending.map((topic, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-700"
              >
                <span className="font-medium text-slate-900 dark:text-white">{topic.topic}</span>
                <span className={`text-sm ${topic.change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {topic.change >= 0 ? '↑' : '↓'} {Math.abs(topic.change)}%
                </span>
                <span className="text-sm text-slate-500 dark:text-slate-300">
                  {topic.volume.toLocaleString(localeCode)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
