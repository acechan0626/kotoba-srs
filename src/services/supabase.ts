import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { CardType, JlptLevel, RatingValue, ReviewLog, UserCard, UserSettings, VocabItem } from '../types';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export interface CloudSnapshot {
  cards: Record<string, UserCard>;
  logs: ReviewLog[];
  settings: UserSettings | null;
  customVocab: VocabItem[];
}

export async function fetchCloudSnapshot(user: User): Promise<CloudSnapshot> {
  if (!supabase) {
    return { cards: {}, logs: [], settings: null, customVocab: [] };
  }

  const [cardsRes, logsRes, settingsRes, vocabRes] = await Promise.all([
    supabase.from('user_cards').select('*').eq('user_id', user.id),
    supabase
      .from('review_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('reviewed_at', { ascending: false })
      .limit(2000),
    supabase.from('user_settings').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('custom_vocab').select('*').eq('user_id', user.id),
  ]);

  if (cardsRes.error) throw cardsRes.error;
  if (logsRes.error) throw logsRes.error;
  if (settingsRes.error) throw settingsRes.error;
  if (vocabRes.error) throw vocabRes.error;

  const cards: Record<string, UserCard> = {};
  for (const row of cardsRes.data ?? []) {
    cards[row.id] = {
      id: row.id,
      vocabId: row.vocab_id,
      cardType: row.card_type as CardType,
      due: row.due,
      stability: row.stability,
      difficulty: row.difficulty,
      elapsedDays: row.elapsed_days,
      scheduledDays: row.scheduled_days,
      reps: row.reps,
      lapses: row.lapses,
      state: row.state,
      lastReview: row.last_review,
      updatedAt: row.updated_at,
    };
  }

  const logs: ReviewLog[] = (logsRes.data ?? []).map((row) => ({
    id: row.id,
    cardId: row.card_id,
    vocabId: row.vocab_id,
    cardType: row.card_type as CardType,
    rating: row.rating as RatingValue,
    reviewedAt: row.reviewed_at,
  }));

  const settings: UserSettings | null = settingsRes.data
    ? {
        dailyNewLimit: settingsRes.data.daily_new_limit,
        activeLevels: settingsRes.data.active_levels as JlptLevel[],
        autoPlayAudio: settingsRes.data.auto_play_audio,
        ttsRate: settingsRes.data.tts_rate,
        burySiblings: settingsRes.data.bury_siblings,
        theme: settingsRes.data.theme === 'dark' ? 'dark' : 'light',
      }
    : null;

  const customVocab: VocabItem[] = (vocabRes.data ?? []).map((row) => ({
    id: row.id,
    kanji: row.kanji,
    kana: row.kana,
    jlptLevel: row.jlpt_level as JlptLevel,
    partOfSpeech: row.part_of_speech,
    meaningZh: row.meaning_zh,
    exampleJa: row.example_ja,
    exampleZh: row.example_zh,
    exampleTarget: row.example_target ?? undefined,
    isCustom: true,
  }));

  return { cards, logs, settings, customVocab };
}

export async function pushCardAndLog(user: User, card: UserCard, log: ReviewLog): Promise<void> {
  if (!supabase) return;

  const [cardRes, logRes] = await Promise.all([
    supabase.from('user_cards').upsert({
      id: card.id,
      user_id: user.id,
      vocab_id: card.vocabId,
      card_type: card.cardType,
      due: card.due,
      stability: card.stability,
      difficulty: card.difficulty,
      elapsed_days: card.elapsedDays,
      scheduled_days: card.scheduledDays,
      reps: card.reps,
      lapses: card.lapses,
      state: card.state,
      last_review: card.lastReview,
      updated_at: card.updatedAt,
    }),
    supabase.from('review_logs').upsert({
      id: log.id,
      user_id: user.id,
      card_id: log.cardId,
      vocab_id: log.vocabId,
      card_type: log.cardType,
      rating: log.rating,
      reviewed_at: log.reviewedAt,
    }),
  ]);

  if (cardRes.error) throw cardRes.error;
  if (logRes.error) throw logRes.error;
}

export async function pushSettings(user: User, settings: UserSettings): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('user_settings').upsert({
    user_id: user.id,
    daily_new_limit: settings.dailyNewLimit,
    active_levels: settings.activeLevels,
    auto_play_audio: settings.autoPlayAudio,
    tts_rate: settings.ttsRate,
    bury_siblings: settings.burySiblings,
    theme: settings.theme,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function pushCustomVocab(user: User, items: VocabItem[]): Promise<void> {
  if (!supabase || items.length === 0) return;
  const rows = items.map((item) => ({
    id: item.id,
    user_id: user.id,
    kanji: item.kanji,
    kana: item.kana,
    jlpt_level: item.jlptLevel,
    part_of_speech: item.partOfSpeech,
    meaning_zh: item.meaningZh,
    example_ja: item.exampleJa,
    example_zh: item.exampleZh,
    example_target: item.exampleTarget ?? null,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from('custom_vocab').upsert(rows);
  if (error) throw error;
}

export async function pushAllLocalToCloud(
  user: User,
  cards: Record<string, UserCard>,
  logs: ReviewLog[],
  settings: UserSettings,
  customVocab: VocabItem[]
): Promise<void> {
  if (!supabase) return;

  const studiedCards = Object.values(cards).filter((c) => c.reps > 0 || c.lastReview !== null);
  if (studiedCards.length > 0) {
    const { error } = await supabase.from('user_cards').upsert(
      studiedCards.map((c) => ({
        id: c.id,
        user_id: user.id,
        vocab_id: c.vocabId,
        card_type: c.cardType,
        due: c.due,
        stability: c.stability,
        difficulty: c.difficulty,
        elapsed_days: c.elapsedDays,
        scheduled_days: c.scheduledDays,
        reps: c.reps,
        lapses: c.lapses,
        state: c.state,
        last_review: c.lastReview,
        updated_at: c.updatedAt,
      }))
    );
    if (error) throw error;
  }

  if (logs.length > 0) {
    const { error } = await supabase.from('review_logs').upsert(
      logs.slice(0, 1000).map((l) => ({
        id: l.id,
        user_id: user.id,
        card_id: l.cardId,
        vocab_id: l.vocabId,
        card_type: l.cardType,
        rating: l.rating,
        reviewed_at: l.reviewedAt,
      }))
    );
    if (error) throw error;
  }

  await pushSettings(user, settings);
  await pushCustomVocab(user, customVocab);
}
