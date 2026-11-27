import { useState } from 'react';
import {
  BookOpen,
  Cloud,
  CloudOff,
  Flame,
  Layers,
  Moon,
  Play,
  Settings,
  Sun,
  Trophy,
} from 'lucide-react';
import { FlashcardSession } from './components/FlashcardSession';
import { Heatmap } from './components/Heatmap';
import { SettingsModal } from './components/SettingsModal';
import { VocabBrowser } from './components/VocabBrowser';
import { useAppStore } from './hooks/useAppStore';

type ActiveTab = 'dashboard' | 'study' | 'vocab';

export default function App() {
  const store = useAppStore();
  const [tab, setTab] = useState<ActiveTab>('dashboard');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const totalTodayTarget =
    store.stats.todayReviewedCount + store.dailyQueue.queue.length;
  const progressPct =
    totalTodayTarget === 0
      ? 100
      : Math.min(100, Math.round((store.stats.todayReviewedCount / totalTodayTarget) * 100));

  return (
    <div className="min-h-screen pb-14">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-[#f8f5f0]/85 backdrop-blur-md dark:border-stone-800/80 dark:bg-[#141210]/85">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3.5">
          <button
            type="button"
            onClick={() => setTab('dashboard')}
            className="flex items-center gap-2.5 text-left"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-900 font-jp-serif text-lg font-bold text-[#f8f5f0] dark:bg-rose-700 dark:text-white">
              語
            </div>
            <div>
              <div className="font-jp-serif text-base font-bold leading-tight">Kotoba SRS</div>
              <div className="text-[11px] text-stone-500 dark:text-stone-400">
                JLPT 雙卡間隔重複
              </div>
            </div>
          </button>

          <nav className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTab('dashboard')}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                tab === 'dashboard'
                  ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                  : 'text-stone-600 hover:bg-stone-200/70 dark:text-stone-300 dark:hover:bg-stone-800'
              }`}
            >
              儀表板
            </button>
            <button
              type="button"
              onClick={() => setTab('vocab')}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                tab === 'vocab'
                  ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                  : 'text-stone-600 hover:bg-stone-200/70 dark:text-stone-300 dark:hover:bg-stone-800'
              }`}
            >
              字庫
            </button>

            <div className="mx-1 h-4 w-px bg-stone-200 dark:bg-stone-800" />

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              title="同步狀態與設定"
              className="inline-flex items-center gap-1 rounded-xl border border-stone-200/90 bg-white px-2.5 py-1.5 text-xs text-stone-600 transition hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              {store.syncMode === 'cloud-synced' ? (
                <Cloud className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <CloudOff className="h-3.5 w-3.5 text-stone-400" />
              )}
              <span className="hidden sm:inline">
                {store.syncMode === 'cloud-synced'
                  ? '雲端已同步'
                  : store.syncMode === 'cloud-syncing'
                    ? '同步中'
                    : '本機模式'}
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                store.updateSettings({
                  theme: store.settings.theme === 'dark' ? 'light' : 'dark',
                })
              }
              title="切換深淺色主題"
              className="rounded-xl p-2 text-stone-600 transition hover:bg-stone-200/70 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              {store.settings.theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              title="學習設定"
              className="rounded-xl p-2 text-stone-600 transition hover:bg-stone-200/70 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              <Settings className="h-4 w-4" />
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 pt-7">
        {tab === 'study' && (
          <FlashcardSession
            queue={store.dailyQueue.queue}
            buriedCount={store.dailyQueue.buriedCount}
            vocabMap={store.vocabMap}
            settings={store.settings}
            onRate={store.rateCard}
            onExit={() => setTab('dashboard')}
          />
        )}

        {tab === 'vocab' && (
          <VocabBrowser
            allVocab={store.allVocab}
            cards={store.cards}
            settings={store.settings}
            onImport={store.importCustomVocab}
          />
        )}

        {tab === 'dashboard' && (
          <div className="space-y-6">
            {/* Hero Study Card */}
            <section className="rounded-3xl border border-stone-200/90 bg-white p-6 shadow-xs sm:p-8 dark:border-stone-800 dark:bg-stone-900">
              <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-800 dark:bg-rose-950/70 dark:text-rose-200">
                    啟用等級：{store.settings.activeLevels.join(' · ')}
                  </div>
                  <h1 className="font-jp-serif text-3xl font-bold tracking-tight">
                    今日待複習 {store.dailyQueue.queue.length} 張卡片
                  </h1>
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    到期複習 <strong>{store.dailyQueue.dueReviewCards.length}</strong> 張 · 今日新卡{' '}
                    <strong>{store.dailyQueue.newCards.length}</strong> 張（上限{' '}
                    {store.settings.dailyNewLimit}）
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setTab('study')}
                  disabled={store.dailyQueue.queue.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-700 px-6 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-rose-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-stone-300 dark:disabled:bg-stone-800 dark:disabled:text-stone-500"
                >
                  <Play className="h-5 w-5 fill-current" />
                  {store.dailyQueue.queue.length > 0 ? '開始今日複習' : '今日進度已完成'}
                </button>
              </div>

              {/* Today Progress Bar */}
              <div className="mt-6 space-y-2">
                <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                  <span>今日完成進度</span>
                  <span>
                    {store.stats.todayReviewedCount} / {totalTodayTarget} ({progressPct}%)
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                  <div
                    className="h-full rounded-full bg-rose-700 transition-all duration-500 dark:bg-rose-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            </section>

            {/* Stats Row */}
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-stone-200/90 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
                <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                  <Flame className="h-4 w-4 text-rose-600" />
                  連續打卡
                </div>
                <div className="mt-2 font-jp-serif text-2xl font-bold">
                  {store.stats.currentStreak}{' '}
                  <span className="text-xs font-normal text-stone-400">天</span>
                </div>
              </div>

              <div className="rounded-2xl border border-stone-200/90 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
                <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  已熟練卡片
                </div>
                <div className="mt-2 font-jp-serif text-2xl font-bold">
                  {store.stats.masteredCards}{' '}
                  <span className="text-xs font-normal text-stone-400">張</span>
                </div>
              </div>

              <div className="rounded-2xl border border-stone-200/90 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
                <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                  <Layers className="h-4 w-4 text-sky-600" />
                  雙卡總數
                </div>
                <div className="mt-2 font-jp-serif text-2xl font-bold">
                  {Object.keys(store.cards).length}{' '}
                  <span className="text-xs font-normal text-stone-400">張</span>
                </div>
              </div>

              <div className="rounded-2xl border border-stone-200/90 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
                <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                  <BookOpen className="h-4 w-4 text-emerald-600" />
                  累計複習
                </div>
                <div className="mt-2 font-jp-serif text-2xl font-bold">
                  {store.stats.totalReviews}{' '}
                  <span className="text-xs font-normal text-stone-400">次</span>
                </div>
              </div>
            </section>

            {/* Heatmap */}
            <section className="rounded-3xl border border-stone-200/90 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
              <Heatmap days={store.stats.heatmap} />
            </section>
          </div>
        )}
      </main>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={store.settings}
        onUpdateSettings={store.updateSettings}
        user={store.user}
        syncMode={store.syncMode}
        syncError={store.syncError}
        onManualSync={store.manualSync}
      />
    </div>
  );
}
