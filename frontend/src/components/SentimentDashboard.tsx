'use client'

import { useCallback, useEffect, useState } from 'react'
import { API_BASE_URL } from '../lib/config'

interface SentimentData {
  overall_score: number
  overall_label: string
  twitter_sentiment: {
    score: number
    label: string
    mention_count: number
    change_24h: number
  }
  reddit_sentiment: {
    score: number
    label: string
    mention_count: number
    change_24h: number
  }
  news_sentiment: {
    score: number
    label: string
    article_count: number
    change_24h: number
  }
  updated_at: string
}

interface CoinSentiment {
  coin: string
  score: number
  label: string
  mentions_24h: number
  twitter: {
    sentiment: string
    mentions: number
    posts: { author: string; text: string; likes: number }[]
  }
  reddit: {
    sentiment: string
    mentions: number
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

function getSentimentLabel(score: number): string {
  if (score <= 25) return 'Extreme Fear'
  if (score <= 45) return 'Fear'
  if (score <= 55) return 'Neutral'
  if (score <= 75) return 'Greed'
  return 'Extreme Greed'
}

export default function SentimentDashboard() {
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
        fetch(`${API_BASE_URL}/sentiment/overall`),
        fetch(`${API_BASE_URL}/sentiment/coin?coin=${selectedCoin}`),
        fetch(`${API_BASE_URL}/sentiment/trending`),
      ])

      if (!sentimentRes.ok || !coinRes.ok || !trendingRes.ok) {
        throw new Error('Failed to fetch sentiment data')
      }

      const sentimentData = await sentimentRes.json()
      const coinData = await coinRes.json()
      const trendingData = await trendingRes.json()

      setSentiment(sentimentData.data)
      setCoinSentiment(coinData.data)
      setTrending(trendingData.data)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }, [selectedCoin])

  useEffect(() => {
    void loadData()
  }, [loadData])

  if (loading && !sentiment) {
    return (
      <section className="mx-auto w-full max-w-7xl px-6 py-16">
        <div className="mb-8 h-10 w-48 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800" />
          ))}
        </div>
      </section>
    )
  }

  if (error && !sentiment) {
    return (
      <section className="mx-auto w-full max-w-7xl px-6 py-16">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center shadow-sm dark:bg-red-900/20">
          <p className="font-semibold text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={() => void loadData()}
            className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            重試
          </button>
        </div>
      </section>
    )
  }

  if (!sentiment) return null

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">💭 Sentiment</h1>
        
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-sm text-slate-500 dark:text-slate-400">
              更新: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => void loadData()}
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

      {/* Overall Sentiment */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 text-xl font-semibold text-slate-900 dark:text-white">Overall Market Sentiment</h2>
        
        <div className="flex items-center gap-6">
          <div className={`flex h-24 w-24 items-center justify-center rounded-full ${getSentimentColor(sentiment.overall_score)} text-3xl font-bold text-white`}>
            {sentiment.overall_score}
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{sentiment.overall_label}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              數據來源: Twitter, Reddit, News
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700">
            <p className="text-sm text-slate-500 dark:text-slate-400">Twitter</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{sentiment.twitter_sentiment.label}</p>
            <p className="text-sm text-slate-500">{sentiment.twitter_sentiment.mention_count.toLocaleString()} mentions</p>
            <p className={`text-sm ${sentiment.twitter_sentiment.change_24h >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {sentiment.twitter_sentiment.change_24h >= 0 ? '+' : ''}{sentiment.twitter_sentiment.change_24h}%
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700">
            <p className="text-sm text-slate-500 dark:text-slate-400">Reddit</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{sentiment.reddit_sentiment.label}</p>
            <p className="text-sm text-slate-500">{sentiment.reddit_sentiment.mention_count.toLocaleString()} mentions</p>
            <p className={`text-sm ${sentiment.reddit_sentiment.change_24h >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {sentiment.reddit_sentiment.change_24h >= 0 ? '+' : ''}{sentiment.reddit_sentiment.change_24h}%
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700">
            <p className="text-sm text-slate-500 dark:text-slate-400">News</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{sentiment.news_sentiment.label}</p>
            <p className="text-sm text-slate-500">{sentiment.news_sentiment.article_count} articles</p>
            <p className={`text-sm ${sentiment.news_sentiment.change_24h >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {sentiment.news_sentiment.change_24h >= 0 ? '+' : ''}{sentiment.news_sentiment.change_24h}%
            </p>
          </div>
        </div>
      </div>

      {/* Coin Selector & Detail */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Coin Sentiment</h2>
          <select
            value={selectedCoin}
            onChange={(e) => setSelectedCoin(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          >
            {coins.map(coin => (
              <option key={coin} value={coin}>{coin}</option>
            ))}
          </select>
        </div>

        {coinSentiment && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className={`h-16 w-16 rounded-full ${getSentimentColor(coinSentiment.score)} flex items-center justify-center text-2xl font-bold text-white`}>
                {coinSentiment.score}
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{coinSentiment.coin}</p>
                <p className="text-slate-500 dark:text-slate-400">{coinSentiment.label} · {coinSentiment.mentions_24h.toLocaleString()} mentions</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700">
                <p className="mb-2 font-medium text-slate-900 dark:text-white">Twitter</p>
                {coinSentiment.twitter.posts.map((post, i) => (
                  <div key={i} className="mb-2 rounded border border-slate-200 p-2 dark:border-slate-600">
                    <p className="text-sm text-slate-700 dark:text-slate-300">{post.text}</p>
                    <p className="text-xs text-slate-500">👍 {post.likes}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700">
                <p className="mb-2 font-medium text-slate-900 dark:text-white">Reddit</p>
                {coinSentiment.reddit.posts.map((post, i) => (
                  <div key={i} className="mb-2 rounded border border-slate-200 p-2 dark:border-slate-600">
                    <p className="text-sm text-slate-700 dark:text-slate-300">{post.title}</p>
                    <p className="text-xs text-slate-500">⬆ {post.score}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Trending Topics */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 text-xl font-semibold text-slate-900 dark:text-white">🔥 Trending Topics</h2>
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
              <span className="text-sm text-slate-500">{topic.volume.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
