import Habit from '../models/Habit.js';
import Completion from '../models/Completion.js';
let User = null;
try {
  const userModule = await import('../models/User.js');
  User = userModule.default;
} catch (e) {
  // User model may not exist in this project; that's fine — fallback will be used
}

const getUserStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const total_habits = await Habit.countDocuments({ userId, isActive: true });
    const total_completions = await Completion.countDocuments({ userId });

    // pick user's largest habit streak as "current" streak fallback
    const topStreakHabit = await Habit.findOne({ userId }).sort({ streak: -1 }).select('streak').lean();
    const streak = topStreakHabit ? (topStreakHabit.streak || 0) : 0;

    // xp: prefer stored value on req.user if available, otherwise estimate
    const xp = (req.user && typeof req.user.xp === 'number') ? req.user.xp : (total_completions * 5);
    const level = Math.max(1, Math.floor(xp / 100) + 1);

    // Calculate displayXP (XP relative to current level for progress bar)
    const xpForCurrentLevel = (level - 1) * 100;
    const displayXP = Math.max(0, xp - xpForCurrentLevel);

    return res.json({
      total_habits,
      streak,
      xp,
      level,
      total_completions,
      displayXP  // <-- Add displayXP to response
    });
  } catch (error) {
    console.error('getUserStats error:', error);
    return res.status(500).json({ message: error.message });
  }
};

const getLeaderboard = async (req, res) => {
  try {
    // Aggregate completions per user to produce a simple leaderboard
    const agg = await Completion.aggregate([
      { $group: { _id: '$userId', completions: { $sum: 1 } } },
      { $sort: { completions: -1 } },
      { $limit: 20 }
    ]);

    const userIds = agg.map(a => a._id);
    let usersMap = {};
    if (User) {
      const users = await User.find({ _id: { $in: userIds } }).select('_id name xp').lean();
      usersMap = users.reduce((acc, u) => {
        acc[u._id.toString()] = u;
        return acc;
      }, {});
    }

    const leaderboard = agg.map((row, index) => {
      const id = row._id;
      const userObj = usersMap[id.toString()] || {};
      const name = userObj.name || `User ${String(id).slice(-4)}`;
      const xp = (typeof userObj.xp === 'number') ? userObj.xp : (row.completions * 5); // heuristic xp
      return {
        id,
        rank: index + 1,
        name,
        xp,
        completions: row.completions
      };
    });

    return res.json(leaderboard);
  } catch (error) {
    console.error('getLeaderboard error:', error);
    return res.status(500).json({ message: error.message });
  }
};

const getAIInsights = async (req, res) => {
  try {
    const userId = req.user._id;

    // totals
    const total_habits = await Habit.countDocuments({ userId, isActive: true });
    const total_completions = await Completion.countDocuments({ userId });

    // top category
    const catAgg = await Habit.aggregate([
      { $match: { userId } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);
    const top_category = (catAgg[0] && catAgg[0]._id) || 'General';

    // recent activity sample
    const recent = await Completion.find({ userId }).sort({ completedAt: -1 }).limit(5).lean();

    // build a short insight string
    let insights = `You currently track ${total_habits} active habit(s). Top category: ${top_category}. Total completions: ${total_completions}.\n\n`;
    if (recent.length) {
      insights += 'Recent activity:\n';
      recent.slice(0, 3).forEach((r, i) => {
        const when = r.completedAt ? new Date(r.completedAt).toLocaleDateString() : (r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'unknown');
        insights += `• ${when} — ${r.notes ? (r.notes.length > 80 ? r.notes.slice(0, 77) + '...' : r.notes) : 'no note'}\n`;
      });
    } else {
      insights += 'No recent completions — try logging one to build momentum!';
    }

    return res.json({ insights });
  } catch (error) {
    console.error('getAIInsights error:', error);
    return res.status(500).json({ message: error.message });
  }
};

const getMonthlyHeatmap = async (req, res) => {
  try {
    const userId = req.user._id;
    const { year = new Date().getFullYear(), month = new Date().getMonth() } = req.query;

    // Convert to numbers
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    // Get first and last day of the month
    const firstDay = new Date(yearNum, monthNum, 1);
    const lastDay = new Date(yearNum, monthNum + 1, 0);

    // Fetch all completions for this month
    const completions = await Completion.find({
      userId,
      completedAt: {
        $gte: firstDay,
        $lte: lastDay
      }
    })
      .populate('habitId', 'title category')
      .sort({ completedAt: -1 })
      .lean();

    // Group completions by date
    const completionsByDate = {};
    completions.forEach(completion => {
      const date = new Date(completion.completedAt);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (!completionsByDate[dateStr]) {
        completionsByDate[dateStr] = {
          count: 0,
          habits: [],
          completions: []
        };
      }
      
      completionsByDate[dateStr].count++;
      if (completion.habitId && completion.habitId.title) {
        completionsByDate[dateStr].habits.push({
          id: completion.habitId._id,
          title: completion.habitId.title,
          category: completion.habitId.category
        });
      }
      completionsByDate[dateStr].completions.push({
        time: completion.completedAt,
        mood: completion.mood || '',
        notes: completion.notes || ''
      });
    });

    // Get habit streaks for context
    const habits = await Habit.find({ userId, isActive: true })
      .select('title streak category')
      .lean();

    const heatmapData = {
      year: yearNum,
      month: monthNum,
      data: completionsByDate,
      habits: habits,
      totalCompletions: completions.length
    };

    return res.json(heatmapData);
  } catch (error) {
    console.error('getMonthlyHeatmap error:', error);
    return res.status(500).json({ message: error.message });
  }
};

const getAnalyticsConsistency = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get last 12 months of data
    const data = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const completions = await Completion.countDocuments({
        userId,
        completedAt: { $gte: monthStart, $lte: monthEnd }
      });

      const habits = await Habit.countDocuments({
        userId,
        isActive: true,
        createdAt: { $lte: monthEnd }
      });

      // Calculate consistency percentage (completions / (habits * days in month))
      const daysInMonth = monthEnd.getDate();
      const maxPossible = Math.max(habits * daysInMonth, 1);
      const percentage = Math.round((completions / maxPossible) * 100);

      data.push({
        month: date.toLocaleString('en-US', { month: 'short' }),
        percentage: Math.min(percentage, 100),
        completions
      });
    }

    return res.json({ data });
  } catch (error) {
    console.error('getAnalyticsConsistency error:', error);
    return res.status(500).json({ message: error.message });
  }
};

const getAnalyticsMetrics = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get total habits, completions, and streaks
    const habits = await Habit.find({ userId, isActive: true }).lean();
    const totalHabits = habits.length;
    const totalCompletions = await Completion.countDocuments({ userId });
    const avgStreak = totalHabits > 0 ? Math.round(habits.reduce((sum, h) => sum + (h.streak || 0), 0) / totalHabits) : 0;
    const maxStreak = totalHabits > 0 ? Math.max(...habits.map(h => h.streak || 0)) : 0;

    // Calculate engagement (recent activity)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentCompletions = await Completion.countDocuments({
      userId,
      completedAt: { $gte: weekAgo }
    });
    const engagement = Math.round((recentCompletions / 7) * 100);

    // Calculate growth (compare last month vs previous month)
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    const thisMonthEnd = new Date(thisMonthStart.getFullYear(), thisMonthStart.getMonth() + 1, 0);
    
    const lastMonthStart = new Date();
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    lastMonthStart.setDate(1);
    const lastMonthEnd = new Date(lastMonthStart.getFullYear(), lastMonthStart.getMonth() + 1, 0);

    const thisMonthCompletions = await Completion.countDocuments({
      userId,
      completedAt: { $gte: thisMonthStart, $lte: thisMonthEnd }
    });

    const lastMonthCompletions = await Completion.countDocuments({
      userId,
      completedAt: { $gte: lastMonthStart, $lte: lastMonthEnd }
    });

    const growthCurve = lastMonthCompletions > 0 
      ? Math.round((thisMonthCompletions / lastMonthCompletions) * 100)
      : 100;

    return res.json({
      data: {
        Consistency: Math.min(avgStreak * 10, 100),
        Difficulty: Math.round((totalHabits / 10) * 100),
        Engagement: Math.min(engagement, 100),
        'Growth Curve': Math.min(growthCurve, 100),
        Stability: Math.round((maxStreak / 100) * 100),
        Performance: Math.round((totalCompletions / Math.max(totalHabits * 30, 1)) * 100)
      }
    });
  } catch (error) {
    console.error('getAnalyticsMetrics error:', error);
    return res.status(500).json({ message: error.message });
  }
};

const getAnalyticsFeedback = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Count positive (completed) vs negative (missed) habits
    const totalHabits = await Habit.countDocuments({ userId, isActive: true });
    const totalCompletions = await Completion.countDocuments({ userId });
    
    // Estimate based on completion rate over last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentCompletions = await Completion.countDocuments({
      userId,
      completedAt: { $gte: thirtyDaysAgo }
    });

    const maxPossible = totalHabits * 30;
    const positive = Math.round((recentCompletions / Math.max(maxPossible, 1)) * 100);
    const negative = 100 - positive;

    return res.json({
      data: {
        positive: Math.max(positive, 0),
        negative: Math.max(negative, 0)
      }
    });
  } catch (error) {
    console.error('getAnalyticsFeedback error:', error);
    return res.status(500).json({ message: error.message });
  }
};

export default {
  getUserStats,
  getLeaderboard,
  getAIInsights,
  getMonthlyHeatmap,
  getAnalyticsConsistency,
  getAnalyticsMetrics,
  getAnalyticsFeedback
};
