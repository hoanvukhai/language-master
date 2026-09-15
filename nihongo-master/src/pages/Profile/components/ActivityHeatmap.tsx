import React, { useMemo, useState } from 'react';

interface ActivityHeatmapProps {
  // Now receives seconds from dailyStudyTime
  activityHistory: Record<string, number>;
  selectedYear?: number;
  onSelectYear?: (year: number) => void;
  availableYears?: number[];
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

export function ActivityHeatmap({
  activityHistory,
  selectedYear: propSelectedYear,
  onSelectYear: propOnSelectYear,
  availableYears: propAvailableYears
}: ActivityHeatmapProps) {
  const currentYear = new Date().getFullYear();
  const [internalYear, setInternalYear] = useState<number>(currentYear);
  const activeYear = propSelectedYear ?? internalYear;
  const handleSelectYear = propOnSelectYear ?? setInternalYear;

  const [tooltip, setTooltip] = useState<{ text: string, x: number, y: number } | null>(null);

  const internalAvailableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(currentYear);
    years.add(currentYear - 1);
    years.add(currentYear - 2);
    Object.keys(activityHistory).forEach(dateStr => {
      const year = new Date(dateStr).getFullYear();
      if (!isNaN(year)) years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [activityHistory, currentYear]);

  const yearsList = propAvailableYears ?? internalAvailableYears;

  const { grid, monthLabels, totalMinutes } = useMemo(() => {
    const startDate = new Date(activeYear, 0, 1);
    const endDate = new Date(activeYear, 11, 31);

    const startDayOfWeek = (startDate.getDay() + 6) % 7; 
    const days: any[] = [];
    
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    let current = new Date(startDate);
    let totalSecs = 0;

    while (current <= endDate) {
      const dateStr = current.toLocaleDateString('en-CA');
      const seconds = activityHistory[dateStr] || 0;
      const minutes = Math.floor(seconds / 60);
      totalSecs += seconds;
      
      let level = 0;
      if (minutes > 0 && minutes <= 15) level = 1;
      else if (minutes > 15 && minutes <= 30) level = 2;
      else if (minutes > 30 && minutes <= 60) level = 3;
      else if (minutes > 60) level = 4;

      days.push({ date: dateStr, minutes, level, month: current.getMonth() });
      current.setDate(current.getDate() + 1);
    }

    const cols: any[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      cols.push(days.slice(i, i + 7));
    }

    const mLabels: { label: string; colIndex: number }[] = [];
    let lastMonth = -1;
    cols.forEach((col, idx) => {
      const firstDay = col.find(d => d !== null);
      if (firstDay && firstDay.month !== lastMonth) {
        mLabels.push({ label: MONTH_LABELS[firstDay.month], colIndex: idx });
        lastMonth = firstDay.month;
      }
    });

    return { grid: cols, monthLabels: mLabels, totalMinutes: Math.floor(totalSecs / 60) };
  }, [activityHistory, activeYear]);

  const colors = [
    'bg-slate-100 dark:bg-[#161b22] border-slate-200 dark:border-[#ffffff0d]', // 0
    'bg-[#9be9a8] dark:bg-[#0e4429] border-[#9be9a8]/50 dark:border-[#ffffff0d]', // 1
    'bg-[#40c463] dark:bg-[#006d32] border-[#40c463]/50 dark:border-[#ffffff0d]', // 2
    'bg-[#30a14e] dark:bg-[#26a641] border-[#30a14e]/50 dark:border-[#ffffff0d]', // 3
    'bg-[#216e39] dark:bg-[#39d353] border-[#216e39]/50 dark:border-[#ffffff0d]', // 4
  ];

  const formatTime = (mins: number) => {
    if (mins === 0) return 'Không có hoạt động';
    if (mins < 60) return `${mins} phút`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h} giờ ${m} phút` : `${h} giờ`;
  };

  const handleMouseEnter = (e: React.MouseEvent, day: any) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const dateStr = new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    setTooltip({
      text: `${formatTime(day.minutes)} vào ${dateStr}`,
      x: rect.left + rect.width / 2,
      y: rect.top - 8
    });
  };

  return (
    <div className="w-full text-slate-800 dark:text-slate-200 font-sans relative">
      {/* Global Tooltip */}
      {tooltip && (
        <div 
          className="fixed z-50 bg-slate-800 text-slate-100 text-[11px] py-1.5 px-3 rounded whitespace-nowrap shadow-xl border border-slate-700 pointer-events-none transform -translate-x-1/2 -translate-y-full"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        
        {/* Left Side: Heatmap */}
        <div className="flex-1 overflow-hidden">
          <div className="mb-4 flex justify-between items-center text-sm">
            <h2 className="text-xl font-medium">{formatTime(totalMinutes)} học trong năm {activeYear}</h2>
          </div>

          <div className="flex">
            {/* Day Labels */}
            <div className="flex flex-col justify-between pt-6 pb-1 pr-2 text-[10px] text-slate-500 dark:text-slate-400 h-[108px]">
              {DAY_LABELS.map((lbl, i) => (
                <div key={i} className="h-[10px] flex items-center">{lbl}</div>
              ))}
            </div>

            {/* Heatmap Grid */}
            <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="relative min-w-max" style={{ width: grid.length * 13 }}>
                
                {/* Month Labels */}
                <div className="flex relative h-5 text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                  {monthLabels.map((m, i) => (
                    <div 
                      key={i} 
                      className="absolute"
                      style={{ left: m.colIndex * 13 }}
                    >
                      {m.label}
                    </div>
                  ))}
                </div>

                {/* Columns */}
                <div className="flex gap-[3px]">
                  {grid.map((col, colIdx) => (
                    <div key={colIdx} className="flex flex-col gap-[3px] w-[10px]">
                      {col.map((day, rowIdx) => {
                        if (!day) return <div key={rowIdx} className="w-[10px] h-[10px] rounded-[2px]" />;
                        
                        return (
                          <div 
                            key={day.date} 
                            onMouseEnter={(e) => handleMouseEnter(e, day)}
                            onMouseLeave={() => setTooltip(null)}
                            className={`w-[10px] h-[10px] rounded-[2px] border ${colors[day.level]} hover:ring-1 hover:ring-slate-400 dark:hover:ring-slate-300 transition-all cursor-pointer`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500 dark:text-slate-400 w-full max-w-[800px] ml-8">
            <span className="hover:text-blue-500 dark:hover:text-blue-400 cursor-pointer">Tìm hiểu cách tính thời gian</span>
            <div className="flex items-center gap-[3px]">
              <span className="mr-1">Ít</span>
              {colors.map((c, i) => {
                const legendLabels = [
                  '0 phút',
                  '1 - 15 phút',
                  '15 - 30 phút',
                  '30 - 60 phút',
                  'Hơn 60 phút'
                ];
                return (
                  <div 
                    key={i} 
                    className={`w-[10px] h-[10px] rounded-[2px] border ${c} cursor-pointer hover:ring-1 hover:ring-slate-400 dark:hover:ring-slate-300`}
                    onMouseEnter={(e) => {
                      const rect = (e.target as HTMLElement).getBoundingClientRect();
                      setTooltip({
                        text: legendLabels[i],
                        x: rect.left + rect.width / 2,
                        y: rect.top - 8
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })}
              <span className="ml-1">Nhiều</span>
            </div>
          </div>
        </div>

        {/* Right Side: Year Selector */}
        <div className="flex flex-col gap-1.5 min-w-[100px] pt-1">
          {yearsList.map(year => (
            <button
              key={year}
              onClick={() => handleSelectYear(year)}
              className={`text-left px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeYear === year 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {year}
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}
