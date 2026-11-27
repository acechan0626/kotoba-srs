import type { ReviewLog, UserCard, UserSettings, VocabItem } from '../types';

const KEYS = {
  CARDS: 'kotoba_srs_cards_v1',
  LOGS: 'kotoba_srs_logs_v1',
  SETTINGS: 'kotoba_srs_settings_v1',
  CUSTOM_VOCAB: 'kotoba_srs_custom_vocab_v1',
} as const;

export const DEFAULT_SETTINGS: UserSettings = {
  dailyNewLimit: 20,
  activeLevels: ['N5', 'N4'],
  autoPlayAudio: true,
  ttsRate: 1.0,
  burySiblings: true,
  theme: 'light',
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadLocalCards(): Record<string, UserCard> {
  return readJson<Record<string, UserCard>>(KEYS.CARDS, {});
}

export function saveLocalCards(cards: Record<string, UserCard>): void {
  localStorage.setItem(KEYS.CARDS, JSON.stringify(cards));
}

export function loadLocalLogs(): ReviewLog[] {
  return readJson<ReviewLog[]>(KEYS.LOGS, []);
}

export function saveLocalLogs(logs: ReviewLog[]): void {
  localStorage.setItem(KEYS.LOGS, JSON.stringify(logs));
}

export function loadLocalSettings(): UserSettings {
  const saved = readJson<Partial<UserSettings>>(KEYS.SETTINGS, {});
  return { ...DEFAULT_SETTINGS, ...saved };
}

export function saveLocalSettings(settings: UserSettings): void {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
}

export function loadLocalCustomVocab(): VocabItem[] {
  return readJson<VocabItem[]>(KEYS.CUSTOM_VOCAB, []);
}

export function saveLocalCustomVocab(items: VocabItem[]): void {
  localStorage.setItem(KEYS.CUSTOM_VOCAB, JSON.stringify(items));
}
