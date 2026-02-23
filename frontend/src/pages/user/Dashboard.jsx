import '@/index.css';
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import { Target, Flame, Star, TrendingUp, Plus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import PlantGrowthCard from '@/components/PlantGrowthCard';
import LevelUpAnimation from '@/components/LevelUpAnimation';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import CompactHeatmap from '@/components/CompactHeatmap';
import FriendsWidget from '@/components/FriendsWidget';
import { API } from '@/lib/config';

const UserDashboard = ({ user, onLogout }) => {
  const [stats, setStats] = useState(null);
  const [habits, setHabits] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [insights, setInsights] = useState('');
  const [loading, setLoading] = useState(true);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState(1);
  const previousLevelRef = useRef(null);

  // Initialize from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('lastSeenLevel');
    if (stored) {
      previousLevelRef.current = parseInt(stored, 10);
    }
    fetchDashboardData();
    
    // Set up auto-refresh every 2 minutes to capture updates without being too aggressive
    const interval = setInterval(fetchDashboardData, 120000);
    
    // Refresh when the tab becomes visible again (user comes back)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Add a small delay to prevent rapid fire requests
        setTimeout(fetchDashboardData, 1000);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, habitsRes] = await Promise.all([
        axios.get(`${API}/users/stats`),
        axios.get(`${API}/habits`)
      ]);
      
      // Check for level up
      const currentLevel = statsRes.data.level;
      const lastSeenLevel = previousLevelRef.current;
      
      if (lastSeenLevel !== null && currentLevel > lastSeenLevel) {
        setNewLevel(currentLevel);
        setShowLevelUp(true);
        localStorage.setItem('lastSeenLevel', currentLevel.toString());
        previousLevelRef.current = currentLevel;
      } else if (lastSeenLevel === null) {
        // First time - just store the level without showing animation
        localStorage.setItem('lastSeenLevel', currentLevel.toString());
        previousLevelRef.current = currentLevel;
      } else {
        // Level didn't change
        previousLevelRef.current = currentLevel;
      }

      setStats(statsRes.data);
      setHabits(habitsRes.data.slice(0, 5));
      
      // Try to fetch optional data with individual error handling
      try {
        const leaderboardRes = await axios.get(`${API}/users/leaderboard`);
        setLeaderboard(leaderboardRes.data.slice(0, 5));
      } catch (error) {
        console.log('Leaderboard not available:', error.message);
        setLeaderboard([]);
      }
      
      try {
        const insightsRes = await axios.get(`${API}/users/insights`);
        setInsights(insightsRes.data.insights);
      } catch (error) {
        console.log('Insights not available:', error.message);
        setInsights('');
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      // Don't show toast error on every auto-refresh failure to prevent spam
      if (!document.hidden) {
        toast.error('Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout user={user} onLogout={onLogout} role="user">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
        </div>
      </Layout>
    );
  }

  const displayName = user?.name ? user.name.charAt(0).toUpperCase() + user.name.slice(1) : '';

  return (
    <Layout user={user} onLogout={onLogout} role="user">
      {/* Level Up Animation Overlay */}
      <LevelUpAnimation 
        show={showLevelUp} 
        newLevel={newLevel}
        onComplete={() => setShowLevelUp(false)}
      />

      <div className="space-y-4 sm:space-y-6 mt-5" data-testid="user-dashboard">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-800 font-raleway" style={{ fontFamily: 'Raleway, sans-serif' }}>Welcome back, {displayName}!</h1>
            <p className="text-slate-600 mt-1 text-sm sm:text-base font-merriweather" style={{ fontFamily: 'Merriweather, serif' }}>Let's keep building those habits</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchDashboardData} className="gap-2 flex-1 sm:flex-none" data-testid="refresh-btn">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Link to="/user/habits" className="flex-1 sm:flex-none">
              <Button className="gap-2 w-full" data-testid="add-habit-btn">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Habit</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <Card className="card-hover" data-testid="stat-total-habits">
            <CardHeader className="flex flex-col items-center gap-1 pb-2 text-center">
              <Target className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
              <CardTitle className="text-xs sm:text-sm font-medium text-slate-600">Total Habits</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-slate-800">{stats?.total_habits || 0}</div>
              <p className="text-xs text-slate-500 mt-1 hidden sm:block">Active tracking</p>
            </CardContent>
          </Card>

          <Card className="card-hover" data-testid="stat-current-streak">
            <CardHeader className="flex flex-col items-center gap-1 pb-2 text-center">
              <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
              <CardTitle className="text-xs sm:text-sm font-medium text-slate-600">Current Streak</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-2xl sm:text-3xl font-bold streak-fire">{stats?.streak || 0} days</div>
              <p className="text-xs text-slate-500 mt-1 hidden sm:block">Keep it going!</p>
            </CardContent>
          </Card>

          <Card className="card-hover" data-testid="stat-total-xp">
            <CardHeader className="flex flex-col items-center gap-1 pb-2 text-center">
              <Star className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
              <CardTitle className="text-xs sm:text-sm font-medium text-slate-600">Total XP</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-slate-800 xp-glow">{stats?.xp || 0}</div>
              <p className="text-xs text-slate-500 mt-1">Level {stats?.level || 1}</p>
            </CardContent>
          </Card>

          <Card className="card-hover" data-testid="stat-completions">
            <CardHeader className="flex flex-col items-center gap-1 pb-2 text-center">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              <CardTitle className="text-xs sm:text-sm font-medium text-slate-600">Completions</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-slate-800">{stats?.total_completions || 0}</div>
              <p className="text-xs text-slate-500 mt-1 hidden sm:block">All time</p>
            </CardContent>
          </Card>
        </div>

        {/* Plant Growth Visualization */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Plant Growth Card */}
          <div className="lg:col-span-1">
            <PlantGrowthCard userStreak={stats?.streak || 0} />
          </div>

          {/* Today's Habits */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Today's Habits</CardTitle>
                <CardDescription>Keep your momentum going</CardDescription>
              </CardHeader>
              <CardContent>
                {habits.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Target className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>No habits yet. Start building!</p>
                    <Link to="/user/habits">
                      <Button className="mt-4" data-testid="create-first-habit">Create Your First Habit</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {habits.map((habit, index) => {
                      const habitKey = habit._id || habit.id || `${habit.title}-${index}`;
                      return (
                      <Link key={habitKey} to={`/user/habits/${habit._id || habit.id || ''}`} data-testid={`habit-card-${habitKey}`}>
                        <div className="p-4 border rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-slate-800">{habit.title}</h3>
                            <span className="text-sm text-slate-500">{habit.category}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-600">
                            <div className="flex items-center gap-1">
                              <Flame className="w-4 h-4 text-orange-500" />
                              <span>{habit.streak} day streak</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Target className="w-4 h-4 text-emerald-600" />
                              <span>{habit.total_completions} completions</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                      );})}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Leaderboard Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Leaderboard Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Leaderboard</span>
                <Link to="/user/leaderboard" className="text-sm text-emerald-600 hover:underline" data-testid="view-full-leaderboard">View All</Link>
              </CardTitle>
              <CardDescription>Top performers this week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leaderboard.map((leader, index) => {
                  const leaderKey = leader._id || leader.id || `${leader.name}-${index}`;
                  return (
                  <div key={leaderKey} className="flex items-center gap-3" data-testid={`leaderboard-entry-${index}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-700' :
                      index === 1 ? 'bg-slate-100 text-slate-700' :
                      index === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-slate-50 text-slate-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-slate-800">{leader.name}</p>
                      <p className="text-xs text-slate-500">{leader.xp} XP</p>
                    </div>
                  </div>
                  );})}
              </div>
            </CardContent>
          </Card>

          {/* Friends Activity Widget - NEW */}
          <div className="lg:col-span-2">
            <FriendsWidget />
          </div>
        </div>

        {/* AI Insights */}
        {insights && (
          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200" data-testid="ai-insights-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 whitespace-pre-wrap">{insights}</p>
            </CardContent>
          </Card>
        )}

        {/* Activity Heatmap (Compact) */}
        <CompactHeatmap />
        
        {/* Analytics Dashboard */}
        <Card>
          <CardHeader>
            <CardTitle>Your Analytics</CardTitle>
            <CardDescription>Track your habit consistency and performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <AnalyticsDashboard />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default UserDashboard;