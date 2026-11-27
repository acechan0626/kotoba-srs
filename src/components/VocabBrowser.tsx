import { useMemo, useState } from 'react';
import { Download, Search, Upload, Volume2 } from 'lucide-react';
import { makeCardId } from '../services/srs';
import { getTTSProvider } from '../services/tts';
import { exportVocabToJson, parseImportedVocab } from '../utils/vocabImport';
import type { JlptLevel, UserCard, UserSettings, VocabItem } from '../types';

interface VocabBrowserProps {
  allVocab: VocabItem[];
  cards: Record<string, UserCard>;
  settings: UserSettings;
  onImport: (items: VocabItem[]) => void;
}

const LEVELS: Array<'ALL' | JlptLevel> = ['ALL', 'N5', 'N4', 'N3', 'N2', 'N1'];

const SAMPLE_CSV = `kanji,kana,jlptLevel,partOfSpeech,meaningZh,exampleJa,exampleZh
習慣,しゅうかん,N4,名詞,習慣,毎日単語を復習する習慣をつける。,養成每天複習單字的習慣。`;

export function VocabBrowser({ allVocab, cards, settings, onImport }: VocabBrowserProps) {
  const [selectedLevel, setSelectedLevel] = useState<'ALL' | JlptLevel>('ALL');
  const [query, setQuery] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allVocab.filter((v) => {
      if (selectedLevel !== 'ALL' && v.jlptLevel !== selectedLevel) return false;
      if (!q) return true;
      return (
        (v.kanji && v.kanji.toLowerCase().includes(q)) ||
        v.kana.toLowerCase().includes(q) ||
        v.meaningZh.toLowerCase().includes(q)
      );
    });
  }, [allVocab, selectedLevel, query]);

  const handleImportSubmit = () => {
    const { items, errors } = parseImportedVocab(importText);
    if (items.length > 0) {
      onImport(items);
      setImportText('');
      setImportMessage(
        `成功匯入 ${items.length} 個單字並自動生成 SRS 雙卡！${errors.length ? `（略過 ${errors.length} 筆格式錯誤）` : ''}`
      );
    } else {
      setImportMessage(errors[0] ?? '沒有可匯入的單字');
    }
  };

  const handleExport = () => {
    const blob = new Blob([exportVocabToJson(allVocab)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kotoba-srs-vocab-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-jp-serif text-2xl font-bold">JLPT 字庫總覽</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            共 {allVocab.length} 個單字 · 含漢字單字自動生成「漢字卡 + 語境卡」
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShowImport((v) => !v);
              setImportMessage(null);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-3.5 py-2 text-xs font-medium text-white transition hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
          >
            <Upload className="h-3.5 w-3.5" />
            匯入 JSON / CSV
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            <Download className="h-3.5 w-3.5" />
            匯出字庫
          </button>
        </div>
      </div>

      {showImport && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs dark:border-stone-800 dark:bg-stone-900">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">批次匯入單字（支援 JSON 陣列或 CSV）</h3>
            <button
              type="button"
              onClick={() => setImportText(SAMPLE_CSV)}
              className="text-xs text-rose-700 underline hover:text-rose-800 dark:text-rose-400"
            >
              填入 CSV 範例
            </button>
          </div>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            CSV 欄位順序：<code>kanji,kana,jlptLevel,partOfSpeech,meaningZh,exampleJa,exampleZh</code>
          </p>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={5}
            placeholder="貼上 JSON 或 CSV 內容..."
            className="mt-3 w-full rounded-xl border border-stone-200 bg-stone-50 p-3 font-mono text-xs focus:border-rose-500 focus:outline-none dark:border-stone-700 dark:bg-stone-950"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            {importMessage ? (
              <span className="text-xs text-emerald-700 dark:text-emerald-400">{importMessage}</span>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={handleImportSubmit}
              className="rounded-xl bg-rose-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-800"
            >
              確認匯入
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {LEVELS.map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setSelectedLevel(lvl)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                selectedLevel === lvl
                  ? 'bg-rose-700 text-white'
                  : 'bg-stone-200/70 text-stone-700 hover:bg-stone-300/70 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700'
              }`}
            >
              {lvl === 'ALL' ? '全部' : lvl}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋漢字、假名或中文釋義..."
            className="w-full rounded-xl border border-stone-200 bg-white py-2 pr-3 pl-9 text-sm focus:border-rose-500 focus:outline-none dark:border-stone-800 dark:bg-stone-900"
          />
        </div>
      </div>

      {/* List */}
      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((item) => {
          const kanjiCard = cards[makeCardId(item.id, 'kanji_to_meaning')];
          const ctxCard = cards[makeCardId(item.id, 'context_to_meaning')];
          return (
            <div
              key={item.id}
              className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs dark:border-stone-800 dark:bg-stone-900"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-jp-serif text-xl font-bold">
                      {item.kanji ?? item.kana}
                    </span>
                    {item.kanji && (
                      <span className="font-jp-sans text-sm text-rose-700 dark:text-rose-300">
                        {item.kana}
                      </span>
                    )}
                    <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[11px] font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                      {item.jlptLevel}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-stone-800 dark:text-stone-200">
                    {item.meaningZh}
                    <span className="ml-2 text-xs font-normal text-stone-400">
                      {item.partOfSpeech}
                    </span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void getTTSProvider().speak(item.kanji || item.kana, { rate: settings.ttsRate })
                  }
                  className="rounded-lg p-2 text-stone-500 transition hover:bg-stone-100 hover:text-rose-700 dark:hover:bg-stone-800 dark:hover:text-rose-300"
                  title="朗讀發音"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 rounded-xl bg-stone-50 p-2.5 text-xs dark:bg-stone-950/60">
                <p className="font-jp-sans text-stone-800 dark:text-stone-200">{item.exampleJa}</p>
                <p className="mt-0.5 text-stone-500 dark:text-stone-400">{item.exampleZh}</p>
              </div>

              <div className="mt-3 flex items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400">
                {kanjiCard && (
                  <span className="rounded-md bg-stone-100 px-2 py-0.5 dark:bg-stone-800">
                    漢字卡：{kanjiCard.reps > 0 ? `已練 ${kanjiCard.reps} 次` : '未開始'}
                  </span>
                )}
                {ctxCard && (
                  <span className="rounded-md bg-stone-100 px-2 py-0.5 dark:bg-stone-800">
                    語境卡：{ctxCard.reps > 0 ? `已練 ${ctxCard.reps} 次` : '未開始'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
