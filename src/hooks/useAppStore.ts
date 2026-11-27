import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { BUILTIN_JLPT_VOCAB } from '../data/jlptVocab';
import {
  buildDailyQueue,
  computeStudyStats,
  rateUserCard,
  syncCardsWithVocab,
} from '../services/srs';
import {
  loadLocalCards,
  loadLocalCustomVocab,
  loadLocalLogs,
  loadLocalSettings,
  saveLocalCards,
  saveLocalCustomVocab,
  saveLocalLogs,
  saveLocalSettings,
} from '../services/storage';
import {
  fetchCloudSnapshot,
  isSupabaseConfigured,
  pushAllLocalToCloud,
  pushCardAndLog,
  pushCustomVocab,
  pushSettings,
  supabase,
} from '../services/supabase';
import type { RatingValue, ReviewLog, SyncMode, UserCard, UserSettings, VocabItem } from '../types';

function mergeCards(
  local: Record<string, UserCard>,
  remote: Record<string, UserCard>
): Record<string, UserCard> {
  const merged: Record<string, UserCard> = { ...local };
  for (const [id, rCard] of Object.entries(remote)) {
    const lCard = merged[id];
    if (!lCard || new Date(rCard.updatedAt).getTime() >= new Date(lCard.updatedAt).getTime()) {
      merged[id] = rCard;
    }
  }
  return merged;
}

function mergeLogs(local: ReviewLog[], remote: ReviewLog[]): ReviewLog[] {
  const byId = new Map<string, ReviewLog>();
  for (const l of local) byId.set(l.id, l);
  for (const r of remote) byId.set(r.id, r);
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime()
  );
}

function mergeVocab(local: VocabItem[], remote: VocabItem[]): VocabItem[] {
  const byId = new Map<string, VocabItem>();
  for (const v of local) byId.set(v.id, v);
  for (const v of remote) byId.set(v.id, v);
  return Array.from(byId.values());
}

export function useAppStore() {
  const [customVocab, setCustomVocab] = useState<VocabItem[]>(() => loadLocalCustomVocab());
  const [settings, setSettings] = useState<UserSettings>(() => loadLocalSettings());
  const [reviewLogs, setReviewLogs] = useState<ReviewLog[]>(() => loadLocalLogs());

  const allVocab = useMemo(() => [...BUILTIN_JLPT_VOCAB, ...customVocab], [customVocab]);

  const vocabMap = useMemo(() => {
    const map: Record<string, VocabItem> = {};
    for (const v of allVocab) map[v.id] = v;
    return map;
  }, [allVocab]);

  const [cards, setCards] = useState<Record<string, UserCard>>(() =>
    syncCardsWithVocab([...BUILTIN_JLPT_VOCAB, ...loadLocalCustomVocab()], loadLocalCards())
  );

  const [user, setUser] = useState<User | null>(null);
  const [syncMode, setSyncMode] = useState<SyncMode>(
    isSupabaseConfigured ? 'cloud-signed-out' : 'local'
  );
  const [syncError, setSyncError] = useState<string | null>(null);

  // Apply light/dark theme to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  // Persist local state
  useEffect(() => {
    saveLocalCards(cards);
  }, [cards]);

  useEffect(() => {
    saveLocalLogs(reviewLogs);
  }, [reviewLogs]);

  useEffect(() => {
    saveLocalSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveLocalCustomVocab(customVocab);
  }, [customVocab]);

  // Keep cards synced whenever vocab grows
  useEffect(() => {
    setCards((prev) => syncCardsWithVocab(allVocab, prev));
  }, [allVocab]);

  const syncWithCloud = useCallback(async (activeUser: User) => {
    setSyncMode('cloud-syncing');
    setSyncError(null);
    try {
      const snapshot = await fetchCloudSnapshot(activeUser);
      const localCards = loadLocalCards();
      const localLogs = loadLocalLogs();
      const localCustom = loadLocalCustomVocab();
      const localSettings = loadLocalSettings();

      const mergedCustom = mergeVocab(localCustom, snapshot.customVocab);
      const combinedVocab = [...BUILTIN_JLPT_VOCAB, ...mergedCustom];
      const mergedCards = syncCardsWithVocab(combinedVocab, mergeCards(localCards, snapshot.cards));
      const mergedLogs = mergeLogs(localLogs, snapshot.logs);
      const mergedSettings = snapshot.settings ?? localSettings;

      setCustomVocab(mergedCustom);
      setCards(mergedCards);
      setReviewLogs(mergedLogs);
      setSettings(mergedSettings);

      await pushAllLocalToCloud(activeUser, mergedCards, mergedLogs, mergedSettings, mergedCustom);
      setSyncMode('cloud-synced');
    } catch (err) {
      setSyncMode('cloud-error');
      setSyncError(err instanceof Error ? err.message : '雲端同步失敗');
    }
  }, []);

  // Listen to Supabase Auth state
  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      const activeUser = data.session?.user ?? null;
      setUser(activeUser);
      if (activeUser) {
        void syncWithCloud(activeUser);
      } else {
        setSyncMode('cloud-signed-out');
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const activeUser = session?.user ?? null;
      setUser(activeUser);
      if (activeUser) {
        void syncWithCloud(activeUser);
      } else {
        setSyncMode('cloud-signed-out');
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [syncWithCloud]);

  const rateCard = useCallback(
    (cardId: string, rating: RatingValue) => {
      const target = cards[cardId];
      if (!target) return;

      const { updatedCard, reviewLog } = rateUserCard(target, rating, new Date());
      setCards((prev) => ({ ...prev, [cardId]: updatedCard }));
      setReviewLogs((prev) => [reviewLog, ...prev]);

      if (user && supabase) {
        setSyncMode('cloud-syncing');
        pushCardAndLog(user, updatedCard, reviewLog)
          .then(() => setSyncMode('cloud-synced'))
          .catch((err) => {
            setSyncMode('cloud-error');
            setSyncError(err instanceof Error ? err.message : '同步失敗');
          });
      }
    },
    [cards, user]
  );

  const updateSettings = useCallback(
    (patch: Partial<UserSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        if (user && supabase) {
          pushSettings(user, next).catch(() => undefined);
        }
        return next;
      });
    },
    [user]
  );

  const importCustomVocab = useCallback(
    (items: VocabItem[]) => {
      if (items.length === 0) return;
      setCustomVocab((prev) => mergeVocab(prev, items));
      if (user && supabase) {
        pushCustomVocab(user, items).catch(() => undefined);
      }
    },
    [user]
  );

  const dailyQueue = useMemo(
    () => buildDailyQueue(cards, vocabMap, reviewLogs, settings, new Date()),
    [cards, vocabMap, reviewLogs, settings]
  );

  const stats = useMemo(() => computeStudyStats(cards, reviewLogs, new Date()), [cards, reviewLogs]);

  return {
    allVocab,
    vocabMap,
    cards,
    reviewLogs,
    settings,
    dailyQueue,
    stats,
    user,
    syncMode,
    syncError,
    rateCard,
    updateSettings,
    importCustomVocab,
    manualSync: () => (user ? syncWithCloud(user) : Promise.resolve()),
  };
}
