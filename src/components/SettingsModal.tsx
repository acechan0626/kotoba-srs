import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Cloud, CloudOff, LogOut, RefreshCw, X } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../services/supabase';
import { getTTSProvider } from '../services/tts';
import type { JlptLevel, SyncMode, UserSettings } from '../types';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (patch: Partial<UserSettings>) => void;
  user: User | null;
  syncMode: SyncMode;
  syncError: string | null;
  onManualSync: () => Promise<void>;
}

const ALL_LEVELS: JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

export function SettingsModal({
  open,
  onClose,
  settings,
  onUpdateSettings,
  user,
  syncMode,
  syncError,
  onManualSync,
}: SettingsModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authMsg, setAuthMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const toggleLevel = (lvl: JlptLevel) => {
    const exists = settings.activeLevels.includes(lvl);
    const next = exists
      ? settings.activeLevels.filter((x) => x !== lvl)
      : [...settings.activeLevels, lvl];
    if (next.length === 0) return; // keep at least 1 level
    onUpdateSettings({ activeLevels: next });
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setAuthMsg(null);
    try {
      if (authMode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setAuthMsg('登入成功，已開始同步雲端進度！');
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setAuthMsg('註冊成功！若專案有開啟信箱驗證，請至信箱點擊確認連結後登入。');
      }
    } catch (err) {
      setAuthMsg(err instanceof Error ? err.message : '驗證失敗');
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setAuthMsg('已登出帳號（本機紀錄仍保留）');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-stone-200 bg-white p-6 shadow-xl dark:border-stone-800 dark:bg-stone-900">
        <div className="flex items-center justify-between border-b border-stone-100 pb-4 dark:border-stone-800">
          <h2 className="font-jp-serif text-xl font-bold">學習設定與雲端同步</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-6">
          {/* JLPT Levels */}
          <div>
            <label className="text-sm font-semibold">啟用的 JLPT 等級</label>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              今日複習佇列僅會從勾選的等級出題（至少選一個）
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {ALL_LEVELS.map((lvl) => {
                const active = settings.activeLevels.includes(lvl);
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => toggleLevel(lvl)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      active
                        ? 'bg-rose-700 text-white'
                        : 'border border-stone-200 bg-stone-50 text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300'
                    }`}
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Daily New Limit */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold">每日新字卡片上限</label>
              <span className="text-sm font-bold text-rose-700 dark:text-rose-300">
                {settings.dailyNewLimit} 張 / 天
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={60}
              step={5}
              value={settings.dailyNewLimit}
              onChange={(e) => onUpdateSettings({ dailyNewLimit: Number(e.target.value) })}
              className="mt-2 w-full accent-rose-700"
            />
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-stone-200/80 p-3.5 dark:border-stone-800">
              <div>
                <div className="text-sm font-medium">同源雙卡同日分散 (Bury Siblings)</div>
                <div className="text-xs text-stone-500 dark:text-stone-400">
                  同一天內不會連續考同一單字的漢字卡與語境卡
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.burySiblings}
                onChange={(e) => onUpdateSettings({ burySiblings: e.target.checked })}
                className="h-4 w-4 accent-rose-700"
              />
            </label>

            <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-stone-200/80 p-3.5 dark:border-stone-800">
              <div>
                <div className="text-sm font-medium">翻面自動朗讀日文發音</div>
                <div className="text-xs text-stone-500 dark:text-stone-400">
                  目前語音引擎：{getTTSProvider().name}
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.autoPlayAudio}
                onChange={(e) => onUpdateSettings({ autoPlayAudio: e.target.checked })}
                className="h-4 w-4 accent-rose-700"
              />
            </label>

            <div className="flex items-center justify-between rounded-2xl border border-stone-200/80 p-3.5 dark:border-stone-800">
              <div className="text-sm font-medium">日文朗讀語速</div>
              <div className="flex gap-1.5">
                {[0.75, 0.9, 1.0, 1.15].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => onUpdateSettings({ ttsRate: rate })}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                      settings.ttsRate === rate
                        ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                        : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Supabase Cloud Sync */}
          <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 dark:border-stone-800 dark:bg-stone-950/60">
            <div className="flex items-center gap-2 text-sm font-semibold">
              {isSupabaseConfigured ? (
                <Cloud className="h-4 w-4 text-emerald-600" />
              ) : (
                <CloudOff className="h-4 w-4 text-stone-400" />
              )}
              Supabase 跨裝置雲端同步
            </div>

            {!isSupabaseConfigured ? (
              <p className="mt-2 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
                目前為<strong>本機模式 (Local Mode)</strong>，所有學習進度已儲存在瀏覽器中。
                若要開啟手機與電腦跨裝置同步，請建立免費 Supabase 專案，執行{' '}
                <code className="rounded bg-stone-200 px-1 dark:bg-stone-800">
                  supabase/schema.sql
                </code>
                ，並在 <code>.env</code> 填入 <code>VITE_SUPABASE_URL</code> 與{' '}
                <code>VITE_SUPABASE_ANON_KEY</code>。
              </p>
            ) : user ? (
              <div className="mt-3 space-y-3">
                <div className="text-xs text-stone-600 dark:text-stone-300">
                  已登入：<strong>{user.email}</strong>
                  <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {syncMode === 'cloud-syncing' ? '同步中...' : '已同步'}
                  </span>
                </div>
                {syncError && <p className="text-xs text-rose-600">{syncError}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void onManualSync()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium dark:border-stone-700 dark:bg-stone-900"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    立即同步
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 dark:border-rose-900 dark:text-rose-300"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    登出
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAuth} className="mt-3 space-y-2.5">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs dark:border-stone-700 dark:bg-stone-900"
                />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="密碼（至少 6 碼）"
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs dark:border-stone-700 dark:bg-stone-900"
                />
                {authMsg && <p className="text-xs text-rose-700 dark:text-rose-300">{authMsg}</p>}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setAuthMode((m) => (m === 'signin' ? 'signup' : 'signin'))}
                    className="text-xs text-stone-500 underline"
                  >
                    {authMode === 'signin' ? '還沒有帳號？點此註冊' : '已有帳號？改用登入'}
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="rounded-xl bg-stone-900 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900"
                  >
                    {authMode === 'signin' ? '登入同步' : '註冊帳號'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
