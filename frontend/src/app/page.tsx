'use client'

import { useState } from 'react'
import MarketDashboard from '../components/MarketDashboard'
import WhaleDashboard from '../components/WhaleDashboard'

type Tab = 'market' | 'whale'

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('market')

  return (
    <main className="min-h-screen bg-slate-100">
      {/* Tab Navigation */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl px-6">
          <nav className="-mb-px flex gap-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('market')}
              className={`border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                activeTab === 'market'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              📊 Market
            </button>
            <button
              onClick={() => setActiveTab('whale')}
              className={`border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                activeTab === 'whale'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              🐋 Whale
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'market' && <MarketDashboard />}
      {activeTab === 'whale' && <WhaleDashboard />}
    </main>
  )
}
