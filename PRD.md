# 日文 JLPT 背單字軟體 — 產品需求規格書 (PRD)

> **建立日期**：2026-11-27  
> **文件用途**：作為後續開發與架構設計的基準規格書。下次開發時可直接依據本文件進行專案初始化與實作。

---

## 1. 專案概述與核心定位

* **產品目標**：打造一款專為個人學習設計的 **日文 JLPT (N5 ~ N1)** 背單字 Web / PWA 軟體。
* **核心痛點**：解決「背了就忘」以及日文學習常見的「看漢字猜懂意思卻念不出假名、看到假名卻反應不出語意」問題。
* **使用平台**：Web 網頁版 + PWA（支援手機「加入主畫面」類原生體驗、電腦端支援鍵盤快捷鍵操作）。
* **多裝置同步**：透過雲端帳號同步學習進度，確保手機通勤與電腦桌機之間的複習狀態即時一致。

---

## 2. 功能需求規格 (MVP)

### 2.1 單字庫與卡片資料結構
* **字庫範圍**：內建日文 **JLPT N5 ~ N1** 分級字庫（MVP 階段先內建精選高品質範例字庫，並預留標準 JSON / CSV 匯入格式供日後擴充完整字庫）。
* **單字必備欄位**：
  * 單字本體（漢字表記，純假名詞彙可留空）
  * 假名讀音（平假名 / 片假名）
  * JLPT 等級（`N5` / `N4` / `N3` / `N2` / `N1`）
  * 詞性與中文釋義
  * **實用例句（日文）與中文翻譯**

### 2.2 雙卡片自動生成機制（核心特色）
針對每個**含有漢字**的單字，系統自動生成兩張各自獨立計算 SRS 排程的卡片：
1. **卡片 A（漢字辨識卡）**
   * **正面**：僅顯示漢字（不顯示振假名，逼迫大腦主動提取讀音與意思）。
   * **背面**：假名讀音、中文釋義、實用例句與中文翻譯、語音朗讀按鈕。
2. **卡片 B（語境／假名辨識卡）**
   * **正面**：顯示實用例句（目標詞彙可高亮）或純假名，測試實際閱讀／語境中的理解反應。
   * **背面**：對應漢字、完整假名讀音、中文釋義、例句中文翻譯、語音朗讀按鈕。
* **例外規則**：
  * 若單字本身無漢字（純假名 / 外來語），系統僅自動生成一張卡片，避免重複出題。
  * **同源卡分散機制 (Bury Siblings)**：同一天內若已複習某單字的卡片 A，則自動將卡片 B 延後至隔日（或不同時段）出現，避免短期記憶互相提示造成「假會」。

### 2.3 經典翻卡與 SRS 間隔重複排程
* **複習流程**：
  1. 顯示卡片正面 → 使用者心中回想答案 → 點擊（或按 `Space`）翻面檢視答案與例句。
  2. 翻面後依照真實記憶程度進行 **4 級評分**（支援快捷鍵 `1` ~ `4`）：
     * `1` **忘記 (Again)**：完全想不起來或念錯，排入短期重新學習。
     * `2` **困難 (Hard)**：想很久才記起來，縮短下次間隔。
     * `3` **記得 (Good)**：正常回憶起來，依標準曲線拉長間隔。
     * `4` **簡單 (Easy)**：秒答無壓力，大幅拉長下次間隔。
* **排程演算法**：採用現代 **FSRS**（Free Spaced Repetition Scheduler，使用 `ts-fsrs` 套件）取代傳統 SM-2，提供更貼合實際記憶曲線的複習間隔並減少無效複習量。

### 2.4 日文語音朗讀 (TTS) 與可擴充介面
* **功能需求**：支援「單字發音」與「例句朗讀」，並提供語速調整（例如 `0.8x` / `1.0x`）及翻面自動朗讀開關。
* **架構設計（抽象介面）**：
  * 定義統一的 `TTSProvider` 介面（如 `speak(text: string, options?: TTSOptions): Promise<void>`、`stop(): void`）。
  * **MVP 實作**：`WebSpeechTTSProvider`，呼叫瀏覽器內建 `Web Speech API (ja-JP)`，達成零成本、免 API Key、離線可用。
  * **未來擴充**：日後只需實作新的 Provider（如 Azure TTS / OpenAI TTS / VOICEVOX）即可無痛替換，不需修改 UI 與業務邏輯。

### 2.5 每日學習節奏與防棄坑機制
* **每日新字上限**：可自訂每日學習新單字上限（預設 `20` 字/天），避免一次背太多導致隔天複習量雪崩。
* **今日複習佇列**：首頁明確顯示「今日待複習卡片數」、「今日待學新字數」與完成進度條。
* **視覺化激勵**：
  * **連續打卡天數 (Streak)**：紀錄連續達成每日複習的天數。
  * **學習熱力圖 (Heatmap)**：GitHub 風格日曆熱力圖，呈現每日複習張數與持續紀錄。

### 2.6 雲端帳號與跨裝置同步
* **登入與同步**：使用 **Supabase Auth**（Email / Google 登入）與 **Supabase PostgreSQL** 儲存使用者的卡片排程狀態、每日複習紀錄與個人設定。
* **降級與容錯**：若尚未設定 Supabase 環境變數，前端應能自動切換至本機 `localStorage / IndexedDB` 模式運作，方便本機開發與離線預覽。

---

## 3. 技術棧規劃

| 層級 | 選定技術 | 說明 |
| :--- | :--- | :--- |
| **前端框架** | Vite + React + TypeScript | 啟動與建置極快、型別安全、開發體驗佳 |
| **樣式系統** | Tailwind CSS | 快速打造響應式行動端與桌面端介面 |
| **PWA 支援** | `vite-plugin-pwa` | 支援手機安裝到主畫面、離線快取 App Shell |
| **SRS 演算法** | `ts-fsrs` | 現代化 FSRS 演算法 TypeScript 實作 |
| **後端與同步** | Supabase (Auth + PostgreSQL) | 免費方案額度充足、內建 RLS 權限控管、開箱即用 |
| **部署平台** | Vercel / Cloudflare Pages | 免費靜態託管、支援 HTTPS（PWA 必備） |

---

## 4. 資料庫 Schema 設計草案 (Supabase / PostgreSQL)

1. **`vocab_items`**（單字主表）
   * `id` (uuid / text, PK)
   * `kanji` (text, nullable) — 漢字表記
   * `kana` (text, not null) — 假名讀音
   * `jlpt_level` (text, not null) — `N5` ~ `N1`
   * `part_of_speech` (text) — 詞性
   * `meaning_zh` (text, not null) — 中文釋義
   * `example_ja` (text, not null) — 日文例句
   * `example_zh` (text, not null) — 例句中文翻譯
2. **`user_cards`**（使用者 SRS 卡片狀態表，啟用 RLS）
   * `id` (uuid, PK)
   * `user_id` (uuid, FK → `auth.users`)
   * `vocab_id` (text, FK → `vocab_items`)
   * `card_type` (text) — `'kanji_to_meaning'` | `'context_to_meaning'`
   * `due` (timestamptz) — 下次複習時間
   * `stability` (float) / `difficulty` (float) / `elapsed_days` (int) / `scheduled_days` (int) / `reps` (int) / `lapses` (int) / `state` (int) — FSRS 狀態欄位
   * `last_review` (timestamptz)
   * *(Unique constraint on `user_id, vocab_id, card_type`)*
3. **`review_logs`**（複習歷史紀錄表，供熱力圖與 Streak 統計）
   * `id` (uuid, PK)
   * `user_id` (uuid, FK)
   * `card_id` (uuid, FK)
   * `rating` (int) — `1` (Again) ~ `4` (Easy)
   * `reviewed_at` (timestamptz)
4. **`user_settings`**（個人設定表）
   * `user_id` (uuid, PK)
   * `daily_new_limit` (int, default 20)
   * `active_levels` (text[], default `['N5']`)
   * `auto_play_audio` (boolean, default true)
   * `tts_rate` (float, default 1.0)
   * `bury_siblings` (boolean, default true)

---

## 5. 開發階段規劃 (Roadmap)

### Phase 1：MVP 核心上線
- [x] 初始化 Vite + React + TypeScript + Tailwind + PWA 專案架構
- [x] 建立精選 JLPT N5~N1 範例字庫與標準匯入結構
- [x] 實作雙卡片自動生成與 `ts-fsrs` 排程引擎（含 Bury Siblings）
- [x] 實作翻卡複習 UI（支援觸控與鍵盤快捷鍵 `Space` / `1-4`）
- [x] 實作抽象 `TTSProvider` 與 `WebSpeechTTSProvider`（單字 + 例句朗讀）
- [x] 實作首頁儀表板（每日新字上限、待複習佇列、Streak、熱力圖）
- [x] 串接 Supabase Auth 與資料同步（含本機降級模式與 SQL Migration 腳本）
- [x] 建立 Git 版本控制與初始 commit

### Phase 2：進階擴充（未來預留）
- [ ] 匯入完整 JLPT N5~N1 數千字公開字庫
- [ ] 支援使用者自訂新增生字與個人記憶筆記
- [ ] 串接高品質外部 TTS Provider（Azure / OpenAI / VOICEVOX）
- [ ] 離線複習佇列與重新連線後自動衝突合併同步

---

## 6. 版本控制與 Git 工作流規範

* **版控工具**：Git（主分支統一使用 `main`）。
* **敏感資訊保護**：`.gitignore` 必須排除 `node_modules/`、`dist/`、`.env` 與 `.env.local`，嚴禁將 Supabase 金鑰或其他 API Key 提交至版控；僅保留 `.env.example` 作為環境變數範本。
* **分支策略**：
  * `main`：保持隨時可編譯與可部署的穩定狀態。
  * 新功能或較大改動可開立短生命週期分支（如 `feat/full-jlpt-deck`、`fix/tts-voice`），確認建置通過（`npm run build`）後合併回 `main`。
* **Commit 訊息規範 (Conventional Commits)**：
  * `feat:` 新增功能（例：`feat: add custom vocab editor`）
  * `fix:` 修正錯誤（例：`fix: bury siblings across midnight`）
  * `docs:` 文件或規格書更新（例：`docs: update PRD with git workflow`）
  * `chore:` 設定檔、相依套件或建置調整

---

## 7. 下次開工前可順手確認的細節

1. **視覺風格偏好**：日系溫潤紙卡風（淺色護眼 + 深色模式切換）或極簡高對比暗黑專注風？
2. **Supabase 專案**：是否已建立 Supabase 專案並取得 `VITE_SUPABASE_URL` 與 `VITE_SUPABASE_ANON_KEY`？（若尚未建立，開發時可先以本機模式跑通所有功能，再填入金鑰啟用同步。）
