import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  RotateCcw,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { previewRatingIntervals } from '../services/srs';
import { getTTSProvider } from '../services/tts';
import type { RatingValue, UserCard, UserSettings, VocabItem } from '../types';

interface FlashcardSessionProps {
  queue: UserCard[];
  buriedCount: number;
  vocabMap: Record<string, VocabItem>;
  settings: UserSettings;
  onRate: (cardId: string, rating: RatingValue) => void;
  onExit: () => void;
}

const RATING_META: Array<{
  value: RatingValue;
  label: string;
  keyHint: string;
  className: string;
}> = [
  {
    value: 1,
    label: '忘記',
    keyHint: '1',
    className:
      'border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 dark:border-rose-900/70 dark:bg-rose-950/50 dark:text-rose-200 dark:hover:bg-rose-950',
  },
  {
    value: 2,
    label: '困難',
    keyHint: '2',
    className:
      'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-900/70 dark:bg-amber-950/50 dark:text-amber-200 dark:hover:bg-amber-950',
  },
  {
    value: 3,
    label: '記得',
    keyHint: '3',
    className:
      'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/70 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-950',
  },
  {
    value: 4,
    label: '簡單',
    keyHint: '4',
    className:
      'border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100 dark:border-sky-900/70 dark:bg-sky-950/50 dark:text-sky-200 dark:hover:bg-sky-950',
  },
];

function renderHighlightedExample(example: string, target?: string) {
  if (!target || !example.includes(target)) {
    return <span>{example}</span>;
  }
  const parts = example.split(target);
  return (
    <>
      {parts.map((part, idx) => (
        <span key={idx}>
          {part}
          {idx < parts.length - 1 && (
            <mark className="rounded bg-rose-200/80 px-1 py-0.5 font-semibold text-stone-900 dark:bg-rose-900/70 dark:text-rose-100">
              {target}
            </mark>
          )}
        </span>
      ))}
    </>
  );
}

export function FlashcardSession({
  queue,
  buriedCount,
  vocabMap,
  settings,
  onRate,
  onExit,
}: FlashcardSessionProps) {
  const currentCard = queue[0] ?? null;
  const currentVocab = currentCard ? vocabMap[currentCard.vocabId] : null;

  const [isFlipped, setIsFlipped] = useState(false);
  const [peekKana, setPeekKana] = useState(false);
  const [sessionDoneCount, setSessionDoneCount] = useState(0);

  const intervals = useMemo(
    () => (currentCard ? previewRatingIntervals(currentCard, new Date()) : null),
    [currentCard]
  );

  // Reset card UI state when card changes
  useEffect(() => {
    setIsFlipped(false);
    setPeekKana(false);
    getTTSProvider().stop();
  }, [currentCard?.id]);

  // Auto-play audio when flipped
  useEffect(() => {
    if (isFlipped && currentVocab && settings.autoPlayAudio) {
      const textToSpeak = currentVocab.kanji || currentVocab.kana;
      void getTTSProvider().speak(textToSpeak, { rate: settings.ttsRate });
    }
  }, [isFlipped, currentVocab, settings.autoPlayAudio, settings.ttsRate]);

  // Keyboard shortcuts: Space/Enter flip, 1-4 rate, R speak
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!currentCard || !currentVocab) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.code === 'Space' || e.key === 'Enter') && !isFlipped) {
        e.preventDefault();
        setIsFlipped(true);
      } else if (isFlipped && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        handleRate(Number(e.key) as RatingValue);
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        void getTTSProvider().speak(
          isFlipped ? currentVocab.exampleJa : currentVocab.kanji || currentVocab.kana,
          { rate: settings.ttsRate }
        );
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const handleRate = (rating: RatingValue) => {
    if (!currentCard) return;
    getTTSProvider().stop();
    onRate(currentCard.id, rating);
    setSessionDoneCount((c) => c + 1);
  };

  if (!currentCard || !currentVocab) {
    return (
      <div className="mx-auto max-w-xl py-12 text-center">
        <div className="rounded-3xl border border-stone-200/90 bg-white/90 p-10 shadow-sm dark:border-stone-800 dark:bg-stone-900/90">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="font-jp-serif text-2xl font-bold">今日複習全部完成！</h2>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
            本次共完成 <strong className="text-stone-900 dark:text-stone-100">{sessionDoneCount}</strong> 張卡片。
            {buriedCount > 0 && (
              <span>
                {' '}
                另有 <strong>{buriedCount}</strong> 張同源字卡已自動分散至明日（Bury Siblings），避免短期記憶互相干擾。
              </span>
            )}
          </p>
          <button
            onClick={onExit}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
          >
            <ArrowLeft className="h-4 w-4" />
            返回首頁儀表板
          </button>
        </div>
      </div>
    );
  }

  const isKanjiCard = currentCard.cardType === 'kanji_to_meaning';
  const isNewCard = currentCard.reps === 0;
  const tts = getTTSProvider();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            tts.stop();
            onExit();
          }}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-stone-600 transition hover:bg-stone-200/70 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
        >
          <ArrowLeft className="h-4 w-4" />
          返回
        </button>

        <div className="flex items-center gap-2 text-xs font-medium">
          <span className="rounded-full bg-stone-200/80 px-3 py-1 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
            剩餘 {queue.length} 張
          </span>
          <span className="rounded-full bg-rose-100 px-2.5 py-1 text-rose-800 dark:bg-rose-950 dark:text-rose-200">
            {currentVocab.jlptLevel}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 ${
              isNewCard
                ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
            }`}
          >
            {isNewCard ? '新字' : '複習'}
          </span>
        </div>
      </div>

      {/* Main Flashcard */}
      <div className="relative overflow-hidden rounded-3xl border border-stone-200/90 bg-white shadow-sm transition dark:border-stone-800 dark:bg-stone-900">
        {/* Card type ribbon */}
        <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50/80 px-6 py-3 text-xs text-stone-500 dark:border-stone-800/80 dark:bg-stone-950/40 dark:text-stone-400">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <Sparkles className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
            {isKanjiCard
              ? '漢字辨識卡 · 想出假名讀音與中文意思'
              : '語境／假名卡 · 依例句與讀音想出意思'}
          </span>
          <span>{currentVocab.partOfSpeech}</span>
        </div>

        {/* Front Section */}
        <div className="px-6 py-10 text-center sm:px-10">
          {isKanjiCard ? (
            <div className="space-y-4">
              <div className="font-jp-serif text-5xl font-bold tracking-wider text-stone-900 sm:text-6xl dark:text-stone-50">
                {currentVocab.kanji}
              </div>

              {!isFlipped && (
                <div className="pt-1">
                  {peekKana ? (
                    <p className="font-jp-sans text-lg text-rose-700 dark:text-rose-300">
                      {currentVocab.kana}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPeekKana(true)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 px-3 py-1 text-xs text-stone-500 transition hover:border-stone-300 hover:text-stone-800 dark:border-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      偷看假名提示
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              <p className="font-jp-sans text-2xl leading-relaxed font-medium text-stone-900 sm:text-3xl dark:text-stone-100">
                {renderHighlightedExample(
                  currentVocab.exampleJa,
                  currentVocab.exampleTarget || currentVocab.kanji || currentVocab.kana
                )}
              </p>
              <div className="flex items-center justify-center gap-3">
                <span className="rounded-lg bg-stone-100 px-3 py-1 font-jp-sans text-sm text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                  讀音：{currentVocab.kana}
                </span>
                <button
                  type="button"
                  onClick={() => void tts.speak(currentVocab.exampleJa, { rate: settings.ttsRate })}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1 text-xs font-medium text-stone-700 transition hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                  聽例句
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Back Section (Answer) */}
        {isFlipped && (
          <div className="border-t border-stone-200/80 bg-stone-50/60 px-6 py-7 sm:px-10 dark:border-stone-800 dark:bg-stone-950/50">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <div className="flex items-baseline gap-3">
                  {currentVocab.kanji && (
                    <span className="font-jp-serif text-2xl font-bold text-stone-900 dark:text-stone-50">
                      {currentVocab.kanji}
                    </span>
                  )}
                  <span className="font-jp-sans text-lg font-medium text-rose-700 dark:text-rose-300">
                    {currentVocab.kana}
                  </span>
                </div>
                <p className="mt-1.5 text-xl font-semibold text-stone-900 dark:text-stone-100">
                  {currentVocab.meaningZh}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void tts.speak(currentVocab.kanji || currentVocab.kana, {
                      rate: settings.ttsRate,
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 shadow-2xs transition hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
                >
                  <Volume2 className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  朗讀單字
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void tts.speak(currentVocab.exampleJa, { rate: settings.ttsRate })
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 shadow-2xs transition hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
                >
                  <RotateCcw className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  朗讀例句
                </button>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-stone-200/80 bg-white p-4 dark:border-stone-800 dark:bg-stone-900/90">
              <p className="font-jp-sans text-base leading-relaxed text-stone-900 dark:text-stone-100">
                {renderHighlightedExample(
                  currentVocab.exampleJa,
                  currentVocab.exampleTarget || currentVocab.kanji || currentVocab.kana
                )}
              </p>
              <p className="mt-1.5 text-sm text-stone-600 dark:text-stone-400">
                {currentVocab.exampleZh}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Action Area */}
      {!isFlipped ? (
        <button
          type="button"
          onClick={() => setIsFlipped(true)}
          className="w-full rounded-2xl bg-stone-900 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-stone-800 active:scale-[0.99] dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
        >
          顯示答案 <span className="ml-2 text-xs font-normal opacity-70">(Space)</span>
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {RATING_META.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => handleRate(item.value)}
              className={`flex flex-col items-center justify-center rounded-2xl border px-3 py-3.5 transition active:scale-[0.98] ${item.className}`}
            >
              <span className="text-base font-bold">
                {item.label}
                <span className="ml-1.5 text-xs font-normal opacity-60">({item.keyHint})</span>
              </span>
              <span className="mt-1 text-xs opacity-80">
                {intervals ? intervals[item.value] : ''}
              </span>
            </button>
          ))}
        </div>
      )}

      <p className="text-center text-xs text-stone-400 dark:text-stone-500">
        快捷鍵：Space 翻面 · 1–4 評分 · R 重播日文語音
      </p>
    </div>
  );
}
