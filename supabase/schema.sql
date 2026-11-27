-- Kotoba SRS — Supabase PostgreSQL Schema & RLS Policies
-- 直接貼到 Supabase Dashboard -> SQL Editor 執行即可完成雲端同步建表

-- 1. 使用者自訂/匯入單字表
create table if not exists public.custom_vocab (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  kanji text,
  kana text not null,
  jlpt_level text not null default 'N5',
  part_of_speech text not null default '單字',
  meaning_zh text not null,
  example_ja text not null,
  example_zh text not null,
  example_target text,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- 2. 使用者 FSRS 卡片狀態表（雙卡排程）
create table if not exists public.user_cards (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  vocab_id text not null,
  card_type text not null check (card_type in ('kanji_to_meaning', 'context_to_meaning')),
  due timestamptz not null,
  stability double precision not null default 0,
  difficulty double precision not null default 0,
  elapsed_days integer not null default 0,
  scheduled_days integer not null default 0,
  reps integer not null default 0,
  lapses integer not null default 0,
  state integer not null default 0,
  last_review timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists idx_user_cards_due on public.user_cards (user_id, due);

-- 3. 複習紀錄表（供 Streak 與學習熱力圖統計）
create table if not exists public.review_logs (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id text not null,
  vocab_id text not null,
  card_type text not null,
  rating integer not null check (rating between 1 and 4),
  reviewed_at timestamptz not null,
  primary key (user_id, id)
);

create index if not exists idx_review_logs_reviewed_at on public.review_logs (user_id, reviewed_at desc);

-- 4. 使用者個人設定表
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_new_limit integer not null default 20,
  active_levels text[] not null default array['N5', 'N4'],
  auto_play_audio boolean not null default true,
  tts_rate double precision not null default 1.0,
  bury_siblings boolean not null default true,
  theme text not null default 'light',
  updated_at timestamptz not null default now()
);

-- 開啟 Row Level Security (RLS)，確保每位使用者只能讀寫自己的資料
alter table public.custom_vocab enable row level security;
alter table public.user_cards enable row level security;
alter table public.review_logs enable row level security;
alter table public.user_settings enable row level security;

create policy "Users manage own custom_vocab" on public.custom_vocab
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own user_cards" on public.user_cards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own review_logs" on public.review_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own user_settings" on public.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
