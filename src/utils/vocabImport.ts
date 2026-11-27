import type { JlptLevel, VocabItem } from '../types';

const VALID_LEVELS = new Set<JlptLevel>(['N5', 'N4', 'N3', 'N2', 'N1']);

function normalizeLevel(raw: string | undefined): JlptLevel {
  const upper = (raw ?? 'N5').trim().toUpperCase() as JlptLevel;
  return VALID_LEVELS.has(upper) ? upper : 'N5';
}

/**
 * Parse JSON or CSV text into VocabItem[].
 * CSV columns: kanji,kana,jlptLevel,partOfSpeech,meaningZh,exampleJa,exampleZh
 */
export function parseImportedVocab(rawText: string): { items: VocabItem[]; errors: string[] } {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return { items: [], errors: ['匯入內容為空'] };
  }

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      const items: VocabItem[] = [];
      const errors: string[] = [];

      list.forEach((row, idx) => {
        if (!row || typeof row !== 'object') {
          errors.push(`第 ${idx + 1} 筆資料格式錯誤`);
          return;
        }
        const kana = String(row.kana ?? '').trim();
        const meaningZh = String(row.meaningZh ?? row.meaning_zh ?? '').trim();
        const exampleJa = String(row.exampleJa ?? row.example_ja ?? '').trim();
        const exampleZh = String(row.exampleZh ?? row.example_zh ?? '').trim();
        if (!kana || !meaningZh) {
          errors.push(`第 ${idx + 1} 筆缺少 kana 或 meaningZh`);
          return;
        }
        const kanjiRaw = row.kanji != null ? String(row.kanji).trim() : '';
        items.push({
          id: String(row.id ?? `custom-${Date.now()}-${idx}`),
          kanji: kanjiRaw || null,
          kana,
          jlptLevel: normalizeLevel(row.jlptLevel ?? row.jlpt_level),
          partOfSpeech: String(row.partOfSpeech ?? row.part_of_speech ?? '單字').trim(),
          meaningZh,
          exampleJa: exampleJa || `${kanjiRaw || kana}を使った例文です。`,
          exampleZh: exampleZh || meaningZh,
          exampleTarget: row.exampleTarget ? String(row.exampleTarget).trim() : kanjiRaw || kana,
          isCustom: true,
        });
      });

      return { items, errors };
    } catch {
      return { items: [], errors: ['JSON 格式解析失敗，請確認括號與引號是否正確'] };
    }
  }

  // CSV parsing (supports quoted fields)
  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const items: VocabItem[] = [];
  const errors: string[] = [];

  lines.forEach((line, idx) => {
    const cols = splitCsvLine(line);
    // Skip header row if present
    if (idx === 0 && cols[1]?.toLowerCase() === 'kana') {
      return;
    }
    const [kanjiRaw, kana, levelRaw, pos, meaningZh, exampleJa, exampleZh] = cols.map((c) => c.trim());
    if (!kana || !meaningZh) {
      errors.push(`第 ${idx + 1} 行缺少假名或中文釋義`);
      return;
    }
    items.push({
      id: `custom-${Date.now()}-${idx}`,
      kanji: kanjiRaw || null,
      kana,
      jlptLevel: normalizeLevel(levelRaw),
      partOfSpeech: pos || '單字',
      meaningZh,
      exampleJa: exampleJa || `${kanjiRaw || kana}`,
      exampleZh: exampleZh || meaningZh,
      exampleTarget: kanjiRaw || kana,
      isCustom: true,
    });
  });

  return { items, errors };
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export function exportVocabToJson(vocab: VocabItem[]): string {
  return JSON.stringify(vocab, null, 2);
}
