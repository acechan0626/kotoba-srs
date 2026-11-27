# Kotoba SRS — 日文 JLPT 雙卡間隔重複背單字軟體

依照 [PRD.md](./PRD.md) 建置的日文 JLPT (N5–N1) Web / PWA 單字記憶工具。

## 快速啟動

```powershell
npm.cmd install
npm.cmd run dev
```

瀏覽器開啟 `http://localhost:5173` 即可使用（未設定 Supabase 時自動以本機模式運行）。

## 啟用 Supabase 跨裝置雲端同步

1. 在 [Supabase](https://supabase.com) 建立免費專案。
2. 打開 **SQL Editor**，貼上並執行 `supabase/schema.sql`。
3. 複製 `.env.example` 為 `.env`，填入你的 `VITE_SUPABASE_URL` 與 `VITE_SUPABASE_ANON_KEY`。
4. 重新啟動開發伺服器，點右上角「設定 / 本機模式」登入即可跨裝置同步。
