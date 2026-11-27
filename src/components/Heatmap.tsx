import type { HeatmapDay } from '../types';

interface HeatmapProps {
  days: HeatmapDay[];
}

const LEVEL_CLASSES: Record<HeatmapDay['level'], string> = {
  0: 'bg-stone-200/80 dark:bg-stone-800/80',
  1: 'bg-rose-200 dark:bg-rose-950',
  2: 'bg-rose-400 dark:bg-rose-800',
  3: 'bg-rose-600 dark:bg-rose-600',
  4: 'bg-rose-800 dark:bg-rose-400',
};

export function Heatmap({ days }: HeatmapProps) {
  // Group into columns of 7 days (weeks)
  const weeks: HeatmapDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
        <span>近 16 週複習熱力圖</span>
        <div className="flex items-center gap-1.5">
          <span>少</span>
          {([0, 1, 2, 3, 4] as const).map((lvl) => (
            <span
              key={lvl}
              className={`inline-block h-3 w-3 rounded-[3px] ${LEVEL_CLASSES[lvl]}`}
            />
          ))}
          <span>多</span>
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="inline-flex gap-1.5">
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="flex flex-col gap-1.5">
              {week.map((day) => (
                <div
                  key={day.date}
                  title={`${day.date}：複習 ${day.count} 張`}
                  className={`h-3.5 w-3.5 rounded-[3px] transition-transform hover:scale-125 ${LEVEL_CLASSES[day.level]}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
