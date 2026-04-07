import React from 'react';

const WEEKDAYS = [
  { label: 'Pzt', idx: 1 },
  { label: 'Sal', idx: 2 },
  { label: 'Çar', idx: 3 },
  { label: 'Per', idx: 4 },
  { label: 'Cum', idx: 5 },
];

const HOURS = Array.from({ length: 10 }, (_, i) => 8 + i); // 8..17

interface Schedule {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject_name: string;
  instructor_name?: string | null;
}

interface Props {
  schedules: Schedule[];
}

export const QRTimetableGrid: React.FC<Props> = ({ schedules }) => {
  const now = new Date();
  const currentDay = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const toMinutes = (t: string) => {
    const [h, m] = t.slice(0, 5).split(':').map(Number);
    return h * 60 + m;
  };

  const getLesson = (dayIdx: number, hour: number) => {
    const slotStart = hour * 60;
    const slotEnd = (hour + 1) * 60;
    return schedules.find(s => {
      if (s.day_of_week !== dayIdx) return false;
      const lStart = toMinutes(s.start_time);
      const lEnd = toMinutes(s.end_time);
      return lStart < slotEnd && lEnd > slotStart;
    });
  };

  const isCurrent = (s: Schedule) => {
    if (s.day_of_week !== currentDay) return false;
    const lStart = toMinutes(s.start_time);
    const lEnd = toMinutes(s.end_time);
    return currentMinutes >= lStart && currentMinutes < lEnd;
  };

  const rendered = new Set<string>();

  const getSpan = (s: Schedule, hour: number) => {
    const lStart = toMinutes(s.start_time);
    const lEnd = toMinutes(s.end_time);
    const cellStart = Math.max(hour * 60, lStart);
    const cellEnd = Math.min(17 * 60, lEnd);
    return Math.max(1, Math.ceil((cellEnd - cellStart) / 60));
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs min-w-[420px]">
        <thead>
          <tr>
            <th className="border border-border bg-muted p-1.5 text-muted-foreground w-12"></th>
            {HOURS.map(h => (
              <th key={h} className="border border-border bg-muted p-1.5 text-muted-foreground font-medium">
                {String(h).padStart(2, '0')}:00
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {WEEKDAYS.map(day => {
            const skipCols = new Set<number>();
            return (
              <tr key={day.idx}>
                <td className={`border border-border p-1.5 font-medium text-center ${day.idx === currentDay ? 'bg-primary/10 text-primary font-bold' : 'bg-muted text-muted-foreground'}`}>
                  {day.label}
                </td>
                {HOURS.map(hour => {
                  if (skipCols.has(hour)) return null;
                  const lesson = getLesson(day.idx, hour);
                  if (!lesson) {
                    return <td key={hour} className="border border-border p-1"></td>;
                  }
                  const key = lesson.id + '-' + day.idx;
                  if (rendered.has(key)) {
                    return <td key={hour} className="border border-border p-1"></td>;
                  }
                  rendered.add(key);

                  const span = getSpan(lesson, hour);
                  for (let i = 1; i < span; i++) skipCols.add(hour + i);

                  const current = isCurrent(lesson);
                  return (
                    <td
                      key={hour}
                      colSpan={span}
                      className={`border border-border p-1.5 text-center align-middle ${
                        current
                          ? 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-400 dark:border-emerald-600'
                          : 'bg-primary/5'
                      }`}
                    >
                      <div className="font-semibold leading-tight truncate">{lesson.subject_name}</div>
                      {lesson.instructor_name && (
                        <div className="text-muted-foreground truncate">{lesson.instructor_name}</div>
                      )}
                      {current && (
                        <span className="inline-block mt-0.5 text-[10px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-medium">
                          Şu an
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
