import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { toast } from 'sonner';
import { API } from '@/lib/config';
import { Flame, AlertCircle } from 'lucide-react';

const CompactHeatmap = () => {
  const [heatmapData, setHeatmapData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [tooltipInfo, setTooltipInfo] = useState(null);

  // Get last 52 weeks of data (1 year)
  useEffect(() => {
    const fetchYearlyData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch data for all 12 months
        const monthPromises = [];
        const today = new Date();
        
        for (let i = 11; i >= 0; i--) {
          const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
          const year = d.getFullYear();
          const month = d.getMonth();
          
          monthPromises.push(
            axios.get(`${API}/users/heatmap/monthly`, {
              params: { year, month }
            }).catch(() => ({ data: { data: {} } })) // Graceful fallback
          );
        }

        const responses = await Promise.all(monthPromises);
        
        // Aggregate all data
        const aggregated = {};
        responses.forEach(res => {
          if (res.data && res.data.data) {
            Object.assign(aggregated, res.data.data);
          }
        });

        setHeatmapData(aggregated);
      } catch (err) {
        console.error('Failed to fetch yearly heatmap:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchYearlyData();
  }, []);

  // Generate last 52 weeks
  const getWeeksData = () => {
    const weeks = [];
    const today = new Date();
    
    // Start from 52 weeks ago
    for (let i = 51; i >= 0; i--) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (i * 7));
      
      const week = [];
      for (let day = 0; day < 7; day++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + day);
        
        const dateStr = date.toISOString().split('T')[0];
        const count = heatmapData[dateStr]?.count || 0;
        
        week.push({
          date,
          dateStr,
          count,
          habits: heatmapData[dateStr]?.habits || [],
          completions: heatmapData[dateStr]?.completions || []
        });
      }
      weeks.push(week);
    }
    
    return weeks;
  };

  const getColorClass = (count) => {
    if (count === 0) return 'bg-slate-300 dark:bg-slate-600';
    if (count <= 2) return 'bg-emerald-300 dark:bg-emerald-700';
    if (count <= 4) return 'bg-emerald-500 dark:bg-emerald-600';
    if (count <= 6) return 'bg-emerald-600 dark:bg-emerald-500';
    return 'bg-emerald-700 dark:bg-emerald-400';
  };

  const weekLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeks = getWeeksData();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded text-sm">
        <AlertCircle className="w-4 h-4 text-red-600" />
        <span className="text-red-700 dark:text-red-400">Failed to load activity</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Flame className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        <h3 className="text-sm font-bold text-black dark:text-black">
          Last 52 weeks
        </h3>
        <span className="text-xs text-black dark:text-black ml-auto font-medium">
          {Object.values(heatmapData).reduce((sum, d) => sum + (d.count || 0), 0)} completions
        </span>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto">
        <div className="flex gap-1">
          {/* Day labels column */}
          <div className="flex flex-col gap-1 pr-1">
            <div className="h-5" />
            {weekLabels.map((label, i) => (
              <div
                key={`label-${i}`}
                className="w-6 flex items-center justify-center text-xs font-semibold text-black dark:text-black"
              >
                {i === 0 || i === 3 || i === 6 ? label[0] : ''}
              </div>
            ))}
          </div>

          {/* Weeks */}
          <div className="flex gap-1">
            {weeks.map((week, weekIdx) => (
              <motion.div
                key={`week-${weekIdx}`}
                className="flex flex-col gap-1"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: weekIdx * 0.01 }}
              >
                {/* Month label (only for first week of month) */}
                {week[0].date.getDate() <= 7 && (
                  <div className="h-5 flex items-center justify-center text-xs font-semibold text-black dark:text-black">
                    {week[0].date.toLocaleString('en-US', { month: 'short' })}
                  </div>
                )}

                {/* Day cells */}
                {week.map((day, dayIdx) => (
                  <motion.div
                    key={`day-${weekIdx}-${dayIdx}`}
                    whileHover={{ scale: 1.15 }}
                    className="relative group"
                  >
                    <button
                      className={`
                        w-3 h-3 rounded-sm border border-slate-400 dark:border-slate-500
                        transition-all duration-150 cursor-pointer
                        hover:ring-2 hover:ring-emerald-500 hover:ring-offset-1 dark:hover:ring-offset-slate-800
                        focus:outline-none focus:ring-2 focus:ring-emerald-500
                        ${getColorClass(day.count)}
                      `}
                      title={`${day.dateStr}: ${day.count} completions`}
                      onMouseEnter={() => setTooltipInfo(day)}
                      onMouseLeave={() => setTooltipInfo(null)}
                    />

                    {/* Tooltip */}
                    {tooltipInfo?.dateStr === day.dateStr && day.count > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 2 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-20 pointer-events-none"
                      >
                        <div className="bg-slate-900 dark:bg-slate-950 text-white px-2 py-1 rounded text-xs whitespace-nowrap shadow-lg border border-slate-700 flex items-center gap-1">
                          <Flame className="w-3 h-3 text-orange-400" />
                          <span>{day.count}</span>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
        <span className="text-xs text-black dark:text-black font-semibold">Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-sm bg-slate-300 dark:bg-slate-600 border border-slate-400 dark:border-slate-500" />
          <div className="w-3 h-3 rounded-sm bg-emerald-300 dark:bg-emerald-700 border border-slate-400 dark:border-slate-500" />
          <div className="w-3 h-3 rounded-sm bg-emerald-500 dark:bg-emerald-600 border border-slate-400 dark:border-slate-500" />
          <div className="w-3 h-3 rounded-sm bg-emerald-600 dark:bg-emerald-500 border border-slate-400 dark:border-slate-500" />
          <div className="w-3 h-3 rounded-sm bg-emerald-700 dark:bg-emerald-400 border border-slate-400 dark:border-slate-500" />
        </div>
        <span className="text-xs text-black dark:text-black font-semibold">More</span>
      </div>
    </motion.div>
  );
};

export default CompactHeatmap;
