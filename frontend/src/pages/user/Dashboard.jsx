import '@/index.css';
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import { Target, Flame, Star, TrendingUp, Plus, Sparkles, Map } from 'lucide-react';
import ProgressMapContainer from '@/components/progress-map/ProgressMapContainer_v2';
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
  const [showProgressMap, setShowProgressMap] = useState(false);

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

  // Close desktop overlay on ESC for better UX
  useEffect(() => {
    if (!showProgressMap) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setShowProgressMap(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showProgressMap]);

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

      <div className="space-y-4 sm:space-y-6 mt-3 sm:mt-5 px-1 sm:px-0" data-testid="user-dashboard">
        {/* Header */}
        <div className="flex flex-row items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-base sm:text-3xl lg:text-4xl font-bold text-slate-800 leading-tight" style={{ fontFamily: 'Raleway, sans-serif' }}>
              <span className="block sm:inline">Welcome back,</span>
              <span className="block sm:inline sm:ml-1 text-emerald-600 break-words">{displayName}!</span>
            </h1>
            <p className="text-slate-600 mt-0.5 text-xs sm:text-base" style={{ fontFamily: 'Merriweather, serif' }}>Let's keep building those habits</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Link to="/user/habits">
              <Button
                className="gap-1.5 px-3 py-2 sm:px-5 sm:py-3 text-sm sm:text-base font-semibold bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0 shadow-md hover:shadow-lg hover:opacity-90 transition-all duration-200"
                data-testid="add-habit-btn"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                Add Habit
              </Button>
            </Link>
            <Button
              type="button"
              onClick={() => setShowProgressMap(true)}
              className="hidden md:inline-flex gap-2 px-4 py-3"
              variant="outline"
              aria-label="Open progress map desktop"
              data-testid="open-progress-map-desktop"
            >
              <Map className="w-5 h-5" />
              Progress Map
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
          <Card className="card-hover" data-testid="stat-total-habits">
            <CardHeader className="flex flex-col items-center gap-1 pb-1 sm:pb-2 pt-3 sm:pt-6 px-2 sm:px-6 text-center">
              <Target className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
              <CardTitle className="text-[10px] sm:text-sm font-medium text-slate-600 leading-tight">Total Habits</CardTitle>
            </CardHeader>
            <CardContent className="text-center px-2 sm:px-6 pb-3 sm:pb-6">
              <div className="text-xl sm:text-3xl font-bold text-slate-800">{stats?.total_habits || 0}</div>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 hidden sm:block">Active tracking</p>
            </CardContent>
          </Card>

          <Card className="card-hover" data-testid="stat-current-streak">
            <CardHeader className="flex flex-col items-center gap-1 pb-1 sm:pb-2 pt-3 sm:pt-6 px-2 sm:px-6 text-center">
              <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
              <CardTitle className="text-[10px] sm:text-sm font-medium text-slate-600 leading-tight">Current Streak</CardTitle>
            </CardHeader>
            <CardContent className="text-center px-2 sm:px-6 pb-3 sm:pb-6">
              <div className="text-xl sm:text-3xl font-bold streak-fire">
                {stats?.streak || 0}
                <span className="text-sm sm:text-lg ml-0.5">d</span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 hidden sm:block">Keep it going!</p>
            </CardContent>
          </Card>

          <Card className="card-hover" data-testid="stat-total-xp">
            <CardHeader className="flex flex-col items-center gap-1 pb-1 sm:pb-2 pt-3 sm:pt-6 px-2 sm:px-6 text-center">
              <Star className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
              <CardTitle className="text-[10px] sm:text-sm font-medium text-slate-600 leading-tight">Total XP</CardTitle>
            </CardHeader>
            <CardContent className="text-center px-2 sm:px-6 pb-3 sm:pb-6">
              <div className="text-xl sm:text-3xl font-bold text-slate-800 xp-glow">{stats?.xp || 0}</div>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">Level {stats?.level || 1}</p>
            </CardContent>
          </Card>

          <Card className="card-hover" data-testid="stat-completions">
            <CardHeader className="flex flex-col items-center gap-1 pb-1 sm:pb-2 pt-3 sm:pt-6 px-2 sm:px-6 text-center">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              <CardTitle className="text-[10px] sm:text-sm font-medium text-slate-600 leading-tight">Completions</CardTitle>
            </CardHeader>
            <CardContent className="text-center px-2 sm:px-6 pb-3 sm:pb-6">
              <div className="text-xl sm:text-3xl font-bold text-slate-800">{stats?.total_completions || 0}</div>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 hidden sm:block">All time</p>
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
                        <div className="p-3 sm:p-4 border rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                          <div className="flex items-start justify-between mb-1.5 sm:mb-2 gap-2">
                            <h3 className="font-semibold text-slate-800 text-sm sm:text-base leading-tight">{habit.title}</h3>
                            <span className="text-xs sm:text-sm text-slate-500 shrink-0">{habit.category}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-slate-600">
                            <div className="flex items-center gap-1">
                              <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500" />
                              <span>{habit.streak}d streak</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
                              <span>{habit.total_completions} done</span>
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
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                <span>Leaderboard</span>
                <Link to="/user/leaderboard" className="text-xs sm:text-sm text-emerald-600 hover:underline" data-testid="view-full-leaderboard">View All</Link>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Top performers this week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 sm:space-y-3">
                {leaderboard.map((leader, index) => {
                  const leaderKey = leader._id || leader.id || `${leader.name}-${index}`;
                  return (
                  <div key={leaderKey} className="flex items-center gap-2 sm:gap-3" data-testid={`leaderboard-entry-${index}`}>
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                      index === 0 ? 'bg-yellow-100 text-yellow-700' :
                      index === 1 ? 'bg-slate-100 text-slate-700' :
                      index === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-slate-50 text-slate-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs sm:text-sm text-slate-800 truncate">{leader.name}</p>
                      <p className="text-[10px] sm:text-xs text-slate-500">{leader.xp} XP</p>
                    </div>
                  </div>
                  );})}
              </div>
            </CardContent>
          </Card>

          {/* AI Insights */}
          {insights && (
            <Card className="lg:col-span-2 bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200" data-testid="ai-insights-card">
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                  AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 whitespace-pre-wrap text-sm sm:text-base leading-relaxed">{insights}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Activity Heatmap (Compact) */}
        <CompactHeatmap />
        
        {/* Analytics Dashboard */}
        <Card>
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Your Analytics</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Track your habit consistency and performance metrics</CardDescription>
          </CardHeader>
          <CardContent className="px-2 sm:px-6 overflow-x-auto">
            <AnalyticsDashboard />
          </CardContent>
        </Card>
      </div>

      {/* Desktop Progress Map Overlay */}
      {showProgressMap && (
        <div
          className="fixed inset-0 z-50 hidden md:block"
          style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowProgressMap(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 'min(1000px, 92vw)',
              height: 'min(85vh, 92vh)',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
              background: '#0f172a'
            }}
          >
            <ProgressMapContainer
              onClose={() => setShowProgressMap(false)}
              onNavigate={() => setShowProgressMap(false)}
              user={user}
              currentUserId={user?._id}
            />
          </div>
        </div>
      )}
    </Layout>
  );
};

export default UserDashboard;