import React, { useState, useEffect } from 'react';
import { Line, Radar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, RadialLinearScale, ArcElement, Tooltip, Legend } from 'chart.js';
import axios from 'axios';
import { API } from '@/lib/config';
import { AlertCircle } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, RadialLinearScale, ArcElement, Tooltip, Legend);

export default function AnalyticsDashboard() {
  const [lineData, setLineData] = useState(null);
  const [radarData, setRadarData] = useState(null);
  const [pieData, setPieData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch consistency data (monthly)
      const consistencyRes = await axios.get(`${API}/users/analytics/consistency`).catch(() => ({ data: { data: [] } }));
      const consistencyData = consistencyRes.data?.data || [];

      // Fetch habit metrics for radar
      const metricsRes = await axios.get(`${API}/users/analytics/metrics`).catch(() => ({ data: { data: {} } }));
      const metricsData = metricsRes.data?.data || {};

      // Fetch positive vs negative feedback
      const feedbackRes = await axios.get(`${API}/users/analytics/feedback`).catch(() => ({ data: { data: { positive: 0, negative: 0 } } }));
      const feedbackData = feedbackRes.data?.data || { positive: 0, negative: 0 };

      // Process consistency data for line chart
      const lineChartData = {
        labels: consistencyData.map((c) => c.month || c._id || 'N/A').slice(0, 12),
        datasets: [
          {
            label: 'Consistency (%)',
            data: consistencyData.map((c) => c.percentage || c.value || 0).slice(0, 12),
            fill: false,
            borderColor: '#059669',
            backgroundColor: 'rgba(5, 150, 105, 0.1)',
            borderWidth: 2,
            tension: 0.3,
            pointBackgroundColor: '#059669',
            pointRadius: 4,
            pointHoverRadius: 6
          }
        ]
      };

      // Process metrics for radar chart
      const radarChartData = {
        labels: Object.keys(metricsData).length > 0 
          ? Object.keys(metricsData) 
          : ['Consistency', 'Difficulty', 'Engagement', 'Growth', 'Stability', 'Performance'],
        datasets: [
          {
            label: 'User Metrics',
            data: Object.keys(metricsData).length > 0 
              ? Object.values(metricsData) 
              : [75, 50, 65, 80, 70, 65],
            backgroundColor: 'rgba(34, 197, 94, 0.15)',
            borderColor: 'rgba(34, 197, 94, 0.9)',
            borderWidth: 2,
            pointBackgroundColor: '#059669',
            pointRadius: 4,
            pointHoverRadius: 6
          }
        ]
      };

      // Process feedback data for pie chart
      const total = (feedbackData.positive || 0) + (feedbackData.negative || 0);
      const pieChartData = {
        labels: ['Positive', 'Negative'],
        datasets: [
          {
            data: [feedbackData.positive || 0, feedbackData.negative || 0],
            backgroundColor: ['#10B981', '#EF4444'],
            borderColor: ['#059669', '#DC2626'],
            borderWidth: 2
          }
        ]
      };

      setLineData(lineChartData);
      setRadarData(radarChartData);
      setPieData(pieChartData);
    } catch (err) {
      console.error('Failed to fetch analytics data:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded text-sm">
        <AlertCircle className="w-4 h-4 text-yellow-600" />
        <span className="text-yellow-700 dark:text-yellow-400">{error}</span>
      </div>
    );
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          boxWidth: 12,
          padding: 15,
          font: { size: 12 }
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* 3-Column Layout on Large Screens, 1-Column on Smaller */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pie Chart - Positive vs Negative */}
        <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Positive vs Negative</h3>
          {pieData && (
            <div className="relative h-64">
              <Pie data={pieData} options={chartOptions} />
            </div>
          )}
        </div>

        {/* Line Chart - Consistency Over Months */}
        <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Consistency Over Months</h3>
          {lineData && (
            <div className="relative h-64">
              <Line data={lineData} options={chartOptions} />
            </div>
          )}
        </div>

        {/* Radar Chart - Composite Metrics */}
        <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Composite Radar Metrics</h3>
          {radarData && (
            <div className="relative h-64">
              <Radar data={radarData} options={chartOptions} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
