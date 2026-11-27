export type JlptLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

export type CardType = 'kanji_to_meaning' | 'context_to_meaning';

export type RatingValue = 1 | 2 | 3 | 4; // 1: Again, 2: Hard, 3: Good, 4: Easy

export interface VocabItem {
  id: string;
  kanji: string | null;
  kana: string;
  jlptLevel: JlptLevel;
  partOfSpeech: string;
  meaningZh: string;
  exampleJa: string;
  exampleZh: string;
  /** Optional substring in exampleJa to highlight on context card */
  exampleTarget?: string;
  isCustom?: boolean;
}

export interface UserCard {
  id: string; // `${vocabId}__${cardType}`
  vocabId: string;
  cardType: CardType;
  due: string; // ISO string
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: number; // 0: New, 1: Learning, 2: Review, 3: Relearning
  lastReview: string | null; // ISO string
  updatedAt: string; // ISO string
}

export interface ReviewLog {
  id: string;
  cardId: string;
  vocabId: string;
  cardType: CardType;
  rating: RatingValue;
  reviewedAt: string; // ISO string
}

export interface UserSettings {
  dailyNewLimit: number;
  activeLevels: JlptLevel[];
  autoPlayAudio: boolean;
  ttsRate: number;
  burySiblings: boolean;
  theme: 'light' | 'dark';
}

export interface StudyStats {
  todayReviewedCount: number;
  todayNewStudiedCount: number;
  currentStreak: number;
  longestStreak: number;
  totalReviews: number;
  masteredCards: number;
  heatmap: HeatmapDay[];
}

export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export type SyncMode = 'local' | 'cloud-signed-out' | 'cloud-synced' | 'cloud-syncing' | 'cloud-error';
