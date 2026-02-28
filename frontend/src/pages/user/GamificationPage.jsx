import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Trophy, Star, Coins, Target, Map, ShoppingBag } from 'lucide-react';
import Layout from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { API } from '@/lib/config';
import XPProgressBar from '@/components/gamification/XPProgressBar';
import LevelMap from '@/components/gamification/LevelMapEnhanced';
import BadgeDisplay from '@/components/gamification/BadgeDisplay';
import AvatarDisplay from '@/components/gamification/AvatarDisplay';
import StreakCounter from '@/components/gamification/StreakCounter';
import ShopUI from '@/components/gamification/ShopUI';
import ChallengeCard from '@/components/gamification/ChallengeCard';
import LevelUpModal from '@/components/gamification/LevelUpModal';
import LeaderboardUI from '@/components/gamification/LeaderboardUI';
import GamificationStats from '@/components/gamification/GamificationStats';
import WorldSelector from '@/components/gamification/WorldSelector';

// Badge definitions (same as backend) - kept as fallback/local catalog if backend doesn't return everything
const ALL_BADGES = [
  { badgeId: 'week_warrior', name: 'Week Warrior', description: 'Complete 7-day streak', icon: '🔥', rarity: 'common' },
  { badgeId: 'month_master', name: 'Month Master', description: 'Complete 30-day streak', icon: '👑', rarity: 'rare' },
  { badgeId: 'early_bird', name: 'Early Bird', description: 'Complete 50 habits before 8 AM', icon: '🌅', rarity: 'rare' },
  { badgeId: 'centurion', name: 'Centurion', description: 'Complete 100 habits', icon: '💯', rarity: 'epic' },
  { badgeId: 'ace', name: 'Ace', description: 'Reach Level 10', icon: '🎯', rarity: 'epic' },
  { badgeId: 'conqueror', name: 'Conqueror', description: 'Reach Level 25', icon: '⚔️', rarity: 'legendary' },
  { badgeId: 'legend', name: 'Legend', description: 'Reach Level 50', icon: '👑', rarity: 'legendary' },
  { badgeId: 'rusher', name: 'Rusher', description: 'Complete 10 habits in one day', icon: '⚡', rarity: 'rare' },
  { badgeId: 'mr_consistent', name: 'Mr. Consistent', description: 'Maintain 3 different 7-day streaks simultaneously', icon: '🎖️', rarity: 'epic' },
  { badgeId: 'perfectionist', name: 'Perfectionist', description: 'Complete all daily habits for 7 consecutive days', icon: '✨', rarity: 'legendary' },
  { badgeId: 'dawn_champion', name: 'Dawn Champion', description: 'Complete 100 early morning habits', icon: '🌄', rarity: 'epic' },
  { badgeId: 'unstoppable', name: 'Unstoppable', description: 'Reach a 100-day streak on any habit', icon: '🚀', rarity: 'legendary' }
];

const GamificationPage = ({ user, onLogout }) => {
  const [loading, setLoading] = useState(true);
  const [gamificationData, setGamificationData] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [levelUpData, setLevelUpData] = useState(null);
  const [showWelcome, setShowWelcome] = useState(() => {
    return !localStorage.getItem('gamificationWelcomeSeen');
  });
  const [displayXP, setDisplayXP] = useState(null);
  const [selectedWorld, setSelectedWorld] = useState('forest');
  const [worlds, setWorlds] = useState([]);
  const [worldLevels, setWorldLevels] = useState([]);

  const handleCloseWelcome = () => {
    setShowWelcome(false);
    localStorage.setItem('gamificationWelcomeSeen', 'true');
  };

  // New dynamic resources
  const [leaderboard, setLeaderboard] = useState([]);
  const [shopItems, setShopItems] = useState([]);
  const [badges, setBadges] = useState([]);
  const prevLevelRef = useRef(null);

  // Helper: safely convert various response shapes to an array
  const safeToArray = (maybeArrOrObj) => {
    if (!maybeArrOrObj) return [];
    if (Array.isArray(maybeArrOrObj)) return maybeArrOrObj;
    if (typeof maybeArrOrObj === 'object') {
      try {
        // If it's an object of keyed items, return values
        return Object.values(maybeArrOrObj);
      } catch {
        return [];
      }
    }
    return [];
  };

  useEffect(() => {
    // load all data
    fetchGamificationData();
    fetchChallenges();
    fetchLeaderboard();
    fetchShopItems();
    fetchBadges();
    fetchDisplayXP();
    fetchWorlds();
    fetchWorldLevels(selectedWorld);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorld]);

  const fetchGamificationData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/gamification/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const payload = response.data || {};

      // if no habits provided, default to empty list (UI handles empty)
      const unified = {
        level: payload.level ?? 1,
        totalXP: payload.totalXP ?? 0,
        coins: payload.coins ?? 0,
        avatar: payload.avatar ?? null,
        habits: payload.habits ?? [],
        // fallback to fetched badges state or local ALL_BADGES if backend omitted badges
        badges: payload.badges ?? (badges.length ? badges : ALL_BADGES),
        stats: payload.stats ?? {},
        ...payload // include any extra fields
      };

      // keep displayXP from previous fetch (fetchDisplayXP may run concurrently)
      if (displayXP != null) unified.displayXP = displayXP;

      // detect level-up
      const prevLevel = prevLevelRef.current ?? unified.level;
      if (unified.level > prevLevel) {
        setLevelUpData({ oldLevel: prevLevel, newLevel: unified.level, rewards: payload.rewards ?? {} });
        setShowLevelUpModal(true);
      }
      prevLevelRef.current = unified.level;

      setGamificationData(unified);

      // If backend returned badges/habits, keep them in local state too
      if (unified.badges && unified.badges.length > 0) setBadges(unified.badges);
    } catch (error) {
      console.error('Failed to fetch gamification profile:', error);
      toast.error('Failed to load gamification profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchDisplayXP = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/users/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // expect { displayXP: number } or similar
      const dxp = response?.data?.displayXP ?? response?.data?.displayXp ?? null;
      if (dxp != null) {
        setDisplayXP(dxp);
        setGamificationData(prev => (prev ? { ...prev, displayXP: dxp } : { displayXP: dxp }));
      }
    } catch (error) {
      // non-fatal: log and continue using totalXP fallback
      console.warn('Failed to fetch displayXP from /users/stats', error);
    }
  };

  const fetchChallenges = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/gamification/challenges`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChallenges(response.data || []);
    } catch (error) {
      console.error('Failed to fetch challenges:', error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/gamification/leaderboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const raw = response?.data;
      // accept several shapes: { entries: [...] } or [...] or { id: item, ... }
      const arr = safeToArray(raw?.entries ?? raw);
      setLeaderboard(arr);
    } catch (error) {
      // if endpoint missing, fallback to empty leaderboard to avoid runtime Object.entries errors
      console.warn('Failed to fetch leaderboard, falling back to empty list', error);
      setLeaderboard([]);
    }
  };

  const fetchShopItems = async () => {
    try {
      const token = localStorage.getItem('token');
      // try the items endpoint first, then the shop root
      let response;
      try {
        response = await axios.get(`${API}/gamification/shop/items`, { headers: { Authorization: `Bearer ${token}` } });
      } catch {
        response = await axios.get(`${API}/gamification/shop`, { headers: { Authorization: `Bearer ${token}` } });
      }
      const raw = response?.data;
      const arr = safeToArray(raw?.items ?? raw);
      setShopItems(arr);
    } catch (error) {
      console.warn('Failed to fetch shop items, using empty shop', error);
      setShopItems([]);
    }
  };

  const fetchBadges = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/gamification/badges`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const arr = safeToArray(response?.data);
      // prefer server-provided badges when available, otherwise keep local catalog
      if (arr.length > 0) setBadges(arr);
      else setBadges(ALL_BADGES);
    } catch (error) {
      // If badges endpoint not available, fallback to local catalog
      console.warn('Failed to fetch badges, using local catalog', error);
      setBadges(ALL_BADGES);
    }
  };

  const fetchWorlds = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/worlds`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWorlds(response.data || []);
    } catch (error) {
      console.warn('Failed to fetch worlds', error);
      // Fallback to default worlds
      setWorlds([
        {
          id: 'forest',
          name: 'Focus Forest',
          description: 'Master your concentration',
          icon: '🌲',
          gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
          status: 'active',
          progress: 45,
          completedLevels: 13,
          totalLevels: 50,
          stars: 28
        },
        {
          id: 'ocean',
          name: 'Wellness Waves',
          description: 'Flow with healthy habits',
          icon: '🌊',
          gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
          status: 'locked',
          progress: 0,
          completedLevels: 0,
          totalLevels: 50,
          stars: 0
        },
        {
          id: 'mountain',
          name: 'Productivity Peak',
          description: 'Climb to new heights',
          icon: '⛰️',
          gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
          status: 'locked',
          progress: 0,
          completedLevels: 0,
          totalLevels: 50,
          stars: 0
        },
        {
          id: 'gym',
          name: 'MindGym',
          description: 'Strengthen your mind',
          icon: '💪',
          gradient: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
          status: 'locked',
          progress: 0,
          completedLevels: 0,
          totalLevels: 50,
          stars: 0
        },
        {
          id: 'garden',
          name: 'Growth Garden',
          description: 'Nurture your potential',
          icon: '🌺',
          gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
          status: 'locked',
          progress: 0,
          completedLevels: 0,
          totalLevels: 50,
          stars: 0
        }
      ]);
    }
  };

  const fetchWorldLevels = async (worldId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/worlds/${worldId}/levels`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWorldLevels(response.data || []);
    } catch (error) {
      console.warn('Failed to fetch world levels', error);
      setWorldLevels([]);
    }
  };

  const handleJoinChallenge = async (challengeId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/gamification/challenges/${challengeId}/join`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('🎯 Challenge joined successfully!');
      fetchChallenges();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to join challenge');
    }
  };

  const handleLevelClick = (levelData) => {
    console.log('Level clicked:', levelData);
  };

  if (loading) {
    return (
      <Layout user={user} onLogout={onLogout} role="user">
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-500" />
        </div>
      </Layout>
    );
  }

  const topStreakHabits = gamificationData?.habits?.slice(0, 3) || [];
  const avgStreak = topStreakHabits.length > 0
    ? Math.round(topStreakHabits.reduce((sum, h) => sum + (h.streak || 0), 0) / topStreakHabits.length)
    : 0;

  return (
    <Layout user={user} onLogout={onLogout} role="user">
      {/* Welcome Animation */}
      <div className="space-y-4 sm:space-y-6 pb-10 px-1 sm:px-0">
        {/* Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="hero-banner mb-4 sm:mb-6 text-slate-800"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-3xl font-bold text-slate-800 leading-tight" style={{ fontFamily: 'Rethink Sans, sans-serif' }}>🎉 Welcome to Your Gamification Hub!</h2>
              <p className="text-slate-600 mt-1 text-xs sm:text-base" style={{ fontFamily: 'Spectral, serif' }}>
                All data is loaded from your account. Complete habits to earn rewards!
              </p>
            </div>

            {/* Quick stats */}
            <div className="flex gap-2">
              <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                <CardContent className="p-2 sm:p-3 flex flex-col items-center justify-center text-center min-w-[68px] sm:min-w-[88px]">
                  <Star className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
                  <div className="text-lg sm:text-xl font-bold leading-snug">{gamificationData?.level || 1}</div>
                  <div className="text-[9px] sm:text-[10px] tracking-wide opacity-85">Level</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-teal-500 to-cyan-500 text-white">
                <CardContent className="p-2 sm:p-3 flex flex-col items-center justify-center text-center min-w-[68px] sm:min-w-[88px]">
                  <Coins className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
                  <div className="text-lg sm:text-xl font-bold leading-snug">{gamificationData?.coins || 0}</div>
                  <div className="text-[9px] sm:text-[10px] tracking-wide opacity-85">Coins</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.div>

        {/* Main content tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="tabs-list w-full">
            <TabsTrigger value="overview" className="tabs-trigger flex-1 text-xs sm:text-sm">
              <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden xs:inline sm:inline">Overview</span>
            </TabsTrigger>

            <TabsTrigger value="levelmap" className="tabs-trigger flex-1 text-xs sm:text-sm">
              <Map className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden xs:inline sm:inline">Level Map</span>
            </TabsTrigger>

            <TabsTrigger value="shop" className="tabs-trigger flex-1 text-xs sm:text-sm">
              <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden xs:inline sm:inline">Shop</span>
            </TabsTrigger>

            <TabsTrigger value="challenges" className="tabs-trigger flex-1 text-xs sm:text-sm">
              <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden xs:inline sm:inline">Challenges</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {/* XP Progress */}
              <XPProgressBar
                currentXP={gamificationData?.displayXP ?? 0}
                level={gamificationData?.level || 1}
                totalXP={gamificationData?.totalXP}
              />

              {/* Avatar */}
              <AvatarDisplay
                avatar={gamificationData?.avatar}
                streak={avgStreak}
                level={gamificationData?.level || 1}
              />
            </div>

            {/* Top Streaks */}
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800">🔥 Top Streaks</h2>
              {topStreakHabits.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  {topStreakHabits.map((habit) => (
                    <StreakCounter
                      key={habit._id}
                      streak={habit.streak}
                      longestStreak={habit.longestStreak}
                      habitTitle={habit.title}
                      isActive={true}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <p className="text-slate-500">
                      Start completing habits to build streaks!
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Stats Overview */}
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Your Stats</h2>
              <GamificationStats
                stats={gamificationData?.stats}
                badges={gamificationData?.badges}
              />
            </div>
          </TabsContent>

          {/* Level Map Tab */}
          <TabsContent value="levelmap" className="mt-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">🗺️ Quest Map</h2>
                <p className="text-slate-600">Choose your world and conquer the levels!</p>
              </div>

              {/* World Selector */}
              <WorldSelector
                worlds={worlds}
                selectedWorld={selectedWorld}
                onSelectWorld={setSelectedWorld}
              />

              {/* Level Map */}
              <LevelMap
                currentLevel={gamificationData?.level || 1}
                maxLevel={50}
                levels={worldLevels}
                onLevelClick={handleLevelClick}
                worldTheme={selectedWorld}
              />
            </div>
          </TabsContent>

          {/* Challenges Tab */}
          <TabsContent value="challenges" className="mt-6">
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-800">🎯 Active Challenges</h2>
                <div className="text-sm text-slate-600">
                  {challenges.filter(c => c.joined).length} / {challenges.length} Joined
                </div>
              </div>

              {challenges.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {challenges.map((challenge) => (
                    <ChallengeCard
                      key={challenge._id}
                      challenge={challenge}
                      onJoin={handleJoinChallenge}
                      userProgress={challenge.userProgress}
                      userCompleted={challenge.userCompleted}
                      joined={challenge.joined}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Target className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">
                      No challenges available
                    </h3>
                    <p className="text-slate-500">
                      Check back later for new challenges!
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Shop Tab */}
          <TabsContent value="shop" className="mt-4 sm:mt-6 space-y-4">
            {/* Theme-matching shop header */}
            <Card className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="w-6 h-6 sm:w-8 sm:h-8 text-white shrink-0" />
                    <div>
                      <h2 className="text-xl sm:text-3xl font-bold text-white">Item Shop</h2>
                      <p className="text-white/80 text-xs sm:text-sm">Customize your experience</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 sm:px-5 sm:py-2">
                    <Coins className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                    <div className="text-white text-right">
                      <div className="text-lg sm:text-2xl font-bold">{gamificationData?.coins ?? 0}</div>
                      <div className="text-[10px] sm:text-xs">Coins</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <ShopUI user={user} shopItems={shopItems} />
          </TabsContent>

          {/* Badges Tab */}
          <TabsContent value="badges" className="mt-6">
            <BadgeDisplay
              badges={badges.length ? badges : (gamificationData?.badges || [])}
              allBadges={ALL_BADGES}
            />
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="mt-6">
            <LeaderboardUI
              currentUserId={user?._id}
              leaderboardData={Array.isArray(leaderboard) ? leaderboard : safeToArray(leaderboard)}
            />
          </TabsContent>
        </Tabs>

        {/* Level Up Modal */}
        {showLevelUpModal && levelUpData && (
          <LevelUpModal
            isOpen={showLevelUpModal}
            onClose={() => setShowLevelUpModal(false)}
            newLevel={levelUpData.newLevel}
            oldLevel={levelUpData.oldLevel}
            rewards={levelUpData.rewards}
          />
        )}
      </div>
    </Layout>
  );
};

export default GamificationPage;
