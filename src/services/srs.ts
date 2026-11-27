import { createEmptyCard, fsrs, Rating, State, type Card as FsrsCard, type Grade } from 'ts-fsrs';
import type {
  CardType,
  HeatmapDay,
  RatingValue,
  ReviewLog,
  StudyStats,
  UserCard,
  UserSettings,
  VocabItem,
} from '../types';

const scheduler = fsrs({
  enable_fuzz: true,
  maximum_interval: 3650,
});

export function makeCardId(vocabId: string, cardType: CardType): string {
  return `${vocabId}__${cardType}`;
}

export function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Auto-generate dual cards for vocab items with kanji:
 * 1. kanji_to_meaning: Kanji front -> Kana + Meaning + Example
 * 2. context_to_meaning: Example/Kana front -> Meaning + Kanji
 * Pure-kana words only generate a single context_to_meaning card.
 */
export function syncCardsWithVocab(
  vocabList: VocabItem[],
  existingCards: Record<string, UserCard>,
  now = new Date()
): Record<string, UserCard> {
  const next: Record<string, UserCard> = { ...existingCards };
  const nowIso = now.toISOString();

  for (const item of vocabList) {
    const types: CardType[] =
      item.kanji && item.kanji.trim().length > 0
        ? ['kanji_to_meaning', 'context_to_meaning']
        : ['context_to_meaning'];

    for (const cardType of types) {
      const id = makeCardId(item.id, cardType);
      if (!next[id]) {
        const empty = createEmptyCard(now);
        next[id] = {
          id,
          vocabId: item.id,
          cardType,
          due: empty.due.toISOString(),
          stability: empty.stability,
          difficulty: empty.difficulty,
          elapsedDays: empty.elapsed_days,
          scheduledDays: empty.scheduled_days,
          reps: empty.reps,
          lapses: empty.lapses,
          state: empty.state,
          lastReview: null,
          updatedAt: nowIso,
        };
      }
    }
  }

  return next;
}

function toFsrsCard(card: UserCard): FsrsCard {
  return {
    due: new Date(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsedDays,
    scheduled_days: card.scheduledDays,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state as State,
    last_review: card.lastReview ? new Date(card.lastReview) : undefined,
  };
}

function toFsrsGrade(rating: RatingValue): Grade {
  switch (rating) {
    case 1:
      return Rating.Again;
    case 2:
      return Rating.Hard;
    case 3:
      return Rating.Good;
    case 4:
      return Rating.Easy;
  }
}

export function formatIntervalLabel(from: Date, to: Date): string {
  const diffMs = Math.max(0, to.getTime() - from.getTime());
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return '< 1 分';
  if (mins < 60) return `${mins} 分`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} 小時`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} 天`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} 個月`;
  const years = (days / 365).toFixed(1).replace(/\.0$/, '');
  return `${years} 年`;
}

export function previewRatingIntervals(
  card: UserCard,
  now = new Date()
): Record<RatingValue, string> {
  const results = scheduler.repeat(toFsrsCard(card), now);
  return {
    1: formatIntervalLabel(now, results[Rating.Again].card.due),
    2: formatIntervalLabel(now, results[Rating.Hard].card.due),
    3: formatIntervalLabel(now, results[Rating.Good].card.due),
    4: formatIntervalLabel(now, results[Rating.Easy].card.due),
  };
}

export function rateUserCard(
  card: UserCard,
  rating: RatingValue,
  now = new Date()
): { updatedCard: UserCard; reviewLog: ReviewLog } {
  const results = scheduler.repeat(toFsrsCard(card), now);
  const nextFsrs = results[toFsrsGrade(rating)].card;
  const nowIso = now.toISOString();

  const updatedCard: UserCard = {
    ...card,
    due: nextFsrs.due.toISOString(),
    stability: nextFsrs.stability,
    difficulty: nextFsrs.difficulty,
    elapsedDays: nextFsrs.elapsed_days,
    scheduledDays: nextFsrs.scheduled_days,
    reps: nextFsrs.reps,
    lapses: nextFsrs.lapses,
    state: nextFsrs.state,
    lastReview: nowIso,
    updatedAt: nowIso,
  };

  const reviewLog: ReviewLog = {
    id: `${card.id}-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
    cardId: card.id,
    vocabId: card.vocabId,
    cardType: card.cardType,
    rating,
    reviewedAt: nowIso,
  };

  return { updatedCard, reviewLog };
}

export interface DailyQueueResult {
  dueReviewCards: UserCard[];
  newCards: UserCard[];
  queue: UserCard[];
  buriedCount: number;
  todayNewRemaining: number;
}

/**
 * Build today's study queue respecting:
 * - active JLPT levels
 * - daily new card limit
 * - Bury Siblings: never show both kanji & context cards of the same vocab on the same day
 */
export function buildDailyQueue(
  cardsMap: Record<string, UserCard>,
  vocabMap: Record<string, VocabItem>,
  reviewLogs: ReviewLog[],
  settings: UserSettings,
  now = new Date()
): DailyQueueResult {
  const todayKey = toLocalDateKey(now);
  const activeLevelSet = new Set(settings.activeLevels);

  // Track which vocabIds have already been reviewed today (for Bury Siblings)
  const reviewedVocabToday = new Set<string>();
  const reviewedCardIdsToday = new Set<string>();
  for (const log of reviewLogs) {
    if (toLocalDateKey(new Date(log.reviewedAt)) === todayKey) {
      reviewedVocabToday.add(log.vocabId);
      reviewedCardIdsToday.add(log.cardId);
    }
  }

  // Count how many new cards were first introduced today
  // Approximation: unique cards whose first review was today (reps === 1 or reviewed today & state was New)
  const firstSeenCardsToday = new Set<string>();
  const seenBeforeToday = new Set<string>();
  for (const log of reviewLogs) {
    const key = toLocalDateKey(new Date(log.reviewedAt));
    if (key !== todayKey) {
      seenBeforeToday.add(log.cardId);
    }
  }
  for (const cardId of reviewedCardIdsToday) {
    if (!seenBeforeToday.has(cardId)) {
      firstSeenCardsToday.add(cardId);
    }
  }

  const todayNewRemaining = Math.max(0, settings.dailyNewLimit - firstSeenCardsToday.size);

  const allActiveCards = Object.values(cardsMap).filter((c) => {
    const vocab = vocabMap[c.vocabId];
    return vocab && activeLevelSet.has(vocab.jlptLevel);
  });

  const dueCandidates: UserCard[] = [];
  const newCandidates: UserCard[] = [];

  for (const card of allActiveCards) {
    if (card.state === State.New && card.reps === 0) {
      newCandidates.push(card);
    } else if (new Date(card.due).getTime() <= now.getTime()) {
      dueCandidates.push(card);
    }
  }

  // Sort due cards oldest-due first; sort new cards by kanji_to_meaning first then vocabId
  dueCandidates.sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());
  newCandidates.sort((a, b) => {
    if (a.vocabId === b.vocabId) {
      return a.cardType === 'kanji_to_meaning' ? -1 : 1;
    }
    return a.vocabId.localeCompare(b.vocabId);
  });

  const dueReviewCards: UserCard[] = [];
  const newCards: UserCard[] = [];
  const queuedVocabIds = new Set<string>();
  let buriedCount = 0;

  for (const card of dueCandidates) {
    const isLearningAgain = card.state === State.Learning || card.state === State.Relearning;
    // Allow same card back into queue if user pressed "Again" today,
    // but bury the *other* sibling if this vocab was already reviewed today.
    const siblingReviewedToday =
      reviewedVocabToday.has(card.vocabId) && !reviewedCardIdsToday.has(card.id);

    if (
      settings.burySiblings &&
      !isLearningAgain &&
      (siblingReviewedToday || queuedVocabIds.has(card.vocabId))
    ) {
      buriedCount++;
      continue;
    }
    dueReviewCards.push(card);
    queuedVocabIds.add(card.vocabId);
  }

  for (const card of newCandidates) {
    if (newCards.length >= todayNewRemaining) break;
    if (
      settings.burySiblings &&
      (reviewedVocabToday.has(card.vocabId) || queuedVocabIds.has(card.vocabId))
    ) {
      buriedCount++;
      continue;
    }
    newCards.push(card);
    queuedVocabIds.add(card.vocabId);
  }

  // Prioritize due reviews first, then new cards
  const queue = [...dueReviewCards, ...newCards];

  return {
    dueReviewCards,
    newCards,
    queue,
    buriedCount,
    todayNewRemaining,
  };
}

export function computeStudyStats(
  cardsMap: Record<string, UserCard>,
  reviewLogs: ReviewLog[],
  now = new Date(),
  heatmapDays = 112 // 16 weeks
): StudyStats {
  const countsByDate = new Map<string, number>();
  const todayKey = toLocalDateKey(now);

  for (const log of reviewLogs) {
    const key = toLocalDateKey(new Date(log.reviewedAt));
    countsByDate.set(key, (countsByDate.get(key) ?? 0) + 1);
  }

  const todayReviewedCount = countsByDate.get(todayKey) ?? 0;

  // Count unique cards introduced today
  const seenBeforeToday = new Set<string>();
  const seenToday = new Set<string>();
  for (const log of reviewLogs) {
    const key = toLocalDateKey(new Date(log.reviewedAt));
    if (key === todayKey) seenToday.add(log.cardId);
    else seenBeforeToday.add(log.cardId);
  }
  let todayNewStudiedCount = 0;
  seenToday.forEach((id) => {
    if (!seenBeforeToday.has(id)) todayNewStudiedCount++;
  });

  // Current streak: count backwards from today (or yesterday if today is 0 so streak doesn't look prematurely broken mid-day)
  let currentStreak = 0;
  const cursor = new Date(now);
  cursor.setHours(12, 0, 0, 0);
  if ((countsByDate.get(toLocalDateKey(cursor)) ?? 0) === 0) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while ((countsByDate.get(toLocalDateKey(cursor)) ?? 0) > 0) {
    currentStreak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Longest streak
  const sortedDates = Array.from(countsByDate.keys()).sort();
  let longestStreak = 0;
  let run = 0;
  let prevTime: number | null = null;
  for (const dateStr of sortedDates) {
    const t = new Date(`${dateStr}T12:00:00`).getTime();
    if (prevTime !== null && Math.round((t - prevTime) / 86400000) === 1) {
      run++;
    } else {
      run = 1;
    }
    if (run > longestStreak) longestStreak = run;
    prevTime = t;
  }

  // Build heatmap (oldest -> today)
  const heatmap: HeatmapDay[] = [];
  const start = new Date(now);
  start.setHours(12, 0, 0, 0);
  start.setDate(start.getDate() - (heatmapDays - 1));

  for (let i = 0; i < heatmapDays; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = toLocalDateKey(d);
    const count = countsByDate.get(key) ?? 0;
    const level: 0 | 1 | 2 | 3 | 4 =
      count === 0 ? 0 : count < 5 ? 1 : count < 15 ? 2 : count < 30 ? 3 : 4;
    heatmap.push({ date: key, count, level });
  }

  const masteredCards = Object.values(cardsMap).filter(
    (c) => c.state === State.Review && c.scheduledDays >= 7
  ).length;

  return {
    todayReviewedCount,
    todayNewStudiedCount,
    currentStreak,
    longestStreak,
    totalReviews: reviewLogs.length,
    masteredCards,
    heatmap,
  };
}
