'use client'

import { useState } from 'react'
import { useTheme } from './ThemeProvider'
import { useLocale } from './LocaleProvider'

interface SidebarProps {
  activeTab: 'market' | 'whale' | 'sentiment' | 'ai' | 'portfolio' | 'alerts'
  onTabChange: (tab: 'market' | 'whale' | 'sentiment' | 'ai' | 'portfolio' | 'alerts') => void
}

const navItems = [
  { id: 'market' as const, zh: '市場', en: 'Market', icon: '📊' },
  { id: 'whale' as const, zh: '巨鯨追蹤', en: 'Whale', icon: '🐋' },
  { id: 'sentiment' as const, zh: '市場情緒', en: 'Sentiment', icon: '💭' },
  { id: 'ai' as const, zh: 'AI 訊號', en: 'AI Signals', icon: '🤖' },
  { id: 'portfolio' as const, zh: '投資組合', en: 'Portfolio', icon: '💼' },
  { id: 'alerts' as const, zh: '價格提醒', en: 'Alerts', icon: '🔔' },
]

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false)
  const { locale } = useLocale()
  const t = (zh: string, en: string) => (locale === 'en' ? en : zh)

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed left-4 top-4 z-50 rounded-lg bg-white p-2 shadow-md dark:bg-slate-800 lg:hidden"
        aria-label={t('切換選單', 'Toggle menu')}
      >
        <svg className="h-6 w-6 text-slate-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {isMobileOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 h-screen w-64 border-r border-slate-200 bg-white transition-all duration-300 dark:border-slate-700 dark:bg-slate-900 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 ${isDesktopCollapsed ? 'lg:w-16' : 'lg:w-64'}`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-700">
            <h1 className={`text-xl font-bold text-slate-900 dark:text-white ${isDesktopCollapsed ? 'lg:hidden' : ''}`}>
              BusyEdge
            </h1>
            <button
              onClick={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
              className="hidden rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800 lg:block"
              aria-label={t('收合側邊欄', 'Collapse sidebar')}
            >
              <svg className={`h-5 w-5 text-slate-500 transition-transform ${isDesktopCollapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id)
                  setIsMobileOpen(false)
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                  activeTab === item.id
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className={`font-medium ${isDesktopCollapsed ? 'lg:hidden' : ''}`}>{t(item.zh, item.en)}</span>
              </button>
            ))}
          </nav>

          <div className="space-y-1 border-t border-slate-200 p-2 dark:border-slate-700">
            <LocaleToggle isDesktopCollapsed={isDesktopCollapsed} />
            <ThemeToggle isDesktopCollapsed={isDesktopCollapsed} />
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  )
}

function ThemeToggle({ isDesktopCollapsed }: { isDesktopCollapsed: boolean }) {
  const { theme, toggleTheme } = useTheme()
  const { locale } = useLocale()
  const t = (zh: string, en: string) => (locale === 'en' ? en : zh)

  return (
    <button
      onClick={toggleTheme}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 ${
        isDesktopCollapsed ? 'lg:justify-center' : ''
      }`}
      aria-label={theme === 'light' ? t('切換為深色模式', 'Switch to dark mode') : t('切換為淺色模式', 'Switch to light mode')}
    >
      {theme === 'light' ? (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      ) : (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )}
      <span className={`font-medium ${isDesktopCollapsed ? 'lg:hidden' : ''}`}>
        {theme === 'light' ? t('深色模式', 'Dark Mode') : t('淺色模式', 'Light Mode')}
      </span>
    </button>
  )
}

function LocaleToggle({ isDesktopCollapsed }: { isDesktopCollapsed: boolean }) {
  const { locale, toggleLocale } = useLocale()

  return (
    <button
      onClick={toggleLocale}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 ${
        isDesktopCollapsed ? 'lg:justify-center' : ''
      }`}
      aria-label={locale === 'en' ? 'Switch to Chinese' : '切換至英文'}
    >
      <span className="text-base">🌐</span>
      <span className={`font-medium ${isDesktopCollapsed ? 'lg:hidden' : ''}`}>
        {locale === 'en' ? 'English' : '繁中'}
      </span>
    </button>
  )
}
