import User from '../models/User.js';
import Habit from '../models/Habit.js';
import Completion from '../models/Completion.js';
import MentorAssignment from '../models/MentorAssignment.js';
import Message from '../models/Message.js';
import MentorRequest from '../models/MentorRequest.js';
import MentorReview from '../models/MentorReview.js';

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
}

// GET /api/mentors - List all mentors with filters
const getAllMentors = async (req, res) => {
  try {
    const { category, rating, distance, search, online, lat, lng } = req.query;

    console.log('Fetching mentors from User model...');
    
    // Build query for User collection
    let query = { role: 'mentor' };
    
    if (category && category !== 'all') {
      query['mentorProfile.specialization'] = category;
    }
    
    let mentors = await User.find(query)
      .select('name email avatar bio mentorProfile')
      .lean();
    
    console.log(`Found ${mentors.length} mentors in User collection`);
    
    // Apply additional filters
    if (rating && rating !== 'all') {
      const minRating = parseFloat(rating);
      mentors = mentors.filter(m => (m.mentorProfile?.rating || 0) >= minRating);
    }
    
    if (online === 'true') {
      mentors = mentors.filter(m => m.mentorProfile?.isOnline === true);
    }

    // Add distance if coordinates provided
    if (lat && lng && mentors.length > 0) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);

      mentors = mentors.map(mentor => {
        if (mentor.mentorProfile?.location?.lat && mentor.mentorProfile?.location?.lng) {
          mentor.distance = calculateDistance(
            userLat, userLng,
            mentor.mentorProfile.location.lat,
            mentor.mentorProfile.location.lng
          );
        }
        return mentor;
      });

      if (distance) {
        const maxDistance = parseFloat(distance);
        mentors = mentors.filter(m => m.distance && m.distance <= maxDistance);
      }

      mentors.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
    }

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      mentors = mentors.filter(m => 
        m.name?.toLowerCase().includes(searchLower) ||
        m.bio?.toLowerCase().includes(searchLower) ||
        m.mentorProfile?.specialization?.some(s => s.toLowerCase().includes(searchLower))
      );
    }

    res.json(mentors);
  } catch (error) {
    console.error('Error in getAllMentors:', error);
    res.status(500).json({ message: error.message });
  }
};

// GET /api/mentors/nearby - Get nearby mentors
const getNearbyMentors = async (req, res) => {
  try {
    const { lat, lng, radius = 50 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude and longitude required' });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const maxRadius = parseFloat(radius);

    const mentors = await User.find({ role: 'mentor' })
      .select('name email avatar bio mentorProfile')
      .lean();

    const nearbyMentors = mentors
      .map(mentor => {
        if (mentor.mentorProfile?.location?.lat && mentor.mentorProfile?.location?.lng) {
          mentor.distance = calculateDistance(
            userLat, userLng,
            mentor.mentorProfile.location.lat,
            mentor.mentorProfile.location.lng
          );
        }
        return mentor;
      })
      .filter(m => m.distance && m.distance <= maxRadius)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10);

    res.json(nearbyMentors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/mentors/:mentorId - Get mentor profile
const getMentorProfile = async (req, res) => {
  try {
    const mentor = await User.findById(req.params.mentorId)
      .select('-password')
      .lean();

    if (!mentor || mentor.role !== 'mentor') {
      return res.status(404).json({ message: 'Mentor not found' });
    }

    // Check if current user has a request with this mentor
    let userRequest = null;
    if (req.user) {
      userRequest = await MentorRequest.findOne({
        userId: req.user._id,
        mentorId: req.params.mentorId
      }).lean();
    }

    res.json({ ...mentor, userRequest });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/mentors/:mentorId/request - Send mentor request
const sendMentorRequest = async (req, res) => {
  try {
    const { message } = req.body;
    const mentorId = req.params.mentorId;
    const userId = req.user._id;

    console.log('Sending mentor request:', { userId, mentorId, message });

    // Check if mentor exists and has mentor role
    const mentor = await User.findById(mentorId);
    if (!mentor || mentor.role !== 'mentor') {
      return res.status(404).json({ message: 'Mentor not found' });
    }

    // Check if request already exists
    const existing = await MentorRequest.findOne({ userId, mentorId });
    if (existing) {
      return res.status(409).json({ message: 'Request already exists', request: existing });
    }

    // Check mentor capacity
    const currentClients = mentor.mentorProfile?.currentClients || 0;
    const maxClients = mentor.mentorProfile?.maxClients || 10;
    
    if (currentClients >= maxClients) {
      return res.status(400).json({ message: 'Mentor has reached maximum capacity' });
    }

    // Create the request
    const request = await MentorRequest.create({
      userId,
      mentorId,
      message: message || '',
      status: 'pending'
    });

    console.log('Mentor request created:', request._id);
    res.status(201).json(request);
  } catch (error) {
    console.error('Error creating mentor request:', error);
    res.status(500).json({ message: error.message });
  }
};

// GET /api/mentors/requests/sent - Get user's sent requests
const getSentRequests = async (req, res) => {
  try {
    const requests = await MentorRequest.find({ userId: req.user._id })
      .populate('mentorId', 'name email avatar bio mentorProfile')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`Found ${requests.length} sent requests for user ${req.user._id}`);
    res.json(requests);
  } catch (error) {
    console.error('Error fetching sent requests:', error);
    res.status(500).json({ message: error.message });
  }
};

// GET /api/mentors/requests/received - Get mentor's received requests
const getReceivedRequests = async (req, res) => {
  try {
    // Current user must be a mentor
    const mentor = await User.findById(req.user._id);
    if (!mentor || mentor.role !== 'mentor') {
      return res.status(403).json({ message: 'Only mentors can view received requests' });
    }

    const requests = await MentorRequest.find({ mentorId: req.user._id })
      .populate('userId', 'name email avatar')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`Found ${requests.length} received requests for mentor ${req.user._id}`);
    res.json(requests);
  } catch (error) {
    console.error('Error fetching received requests:', error);
    res.status(500).json({ message: error.message });
  }
};

// POST /api/mentors/requests/:requestId/accept - Accept mentor request
const acceptRequest = async (req, res) => {
  try {
    const request = await MentorRequest.findById(req.params.requestId);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Verify the current user is the mentor being requested
    if (request.mentorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to accept this request' });
    }

    // Check if already accepted or rejected
    if (request.status !== 'pending') {
      return res.status(400).json({ message: `Request already ${request.status}` });
    }

    // Update mentor's client count
    const mentor = await User.findById(req.user._id);
    const currentClients = mentor.mentorProfile?.currentClients || 0;
    const maxClients = mentor.mentorProfile?.maxClients || 10;

    if (currentClients >= maxClients) {
      return res.status(400).json({ message: 'Cannot accept more clients' });
    }

    // Accept the request
    request.status = 'accepted';
    await request.save();

    // Update mentor's stats
    mentor.mentorProfile.currentClients = currentClients + 1;
    if (!mentor.stats) mentor.stats = {};
    mentor.stats.activeMentees = (mentor.stats.activeMentees || 0) + 1;
    mentor.stats.totalMentees = (mentor.stats.totalMentees || 0) + 1;
    await mentor.save();

    console.log(`Request ${request._id} accepted by mentor ${req.user._id}`);
    res.json(request);
  } catch (error) {
    console.error('Error accepting request:', error);
    res.status(500).json({ message: error.message });
  }
};

// POST /api/mentors/requests/:requestId/reject - Reject mentor request
const rejectRequest = async (req, res) => {
  try {
    const request = await MentorRequest.findById(req.params.requestId);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Verify the current user is the mentor being requested
    if (request.mentorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to reject this request' });
    }

    // Check if already accepted or rejected
    if (request.status !== 'pending') {
      return res.status(400).json({ message: `Request already ${request.status}` });
    }

    // Reject the request
    request.status = 'rejected';
    await request.save();

    console.log(`Request ${request._id} rejected by mentor ${req.user._id}`);
    res.json(request);
  } catch (error) {
    console.error('Error rejecting request:', error);
    res.status(500).json({ message: error.message });
  }
};

// GET /api/mentors/leaderboard - Mentor leaderboard
const getMentorLeaderboard = async (req, res) => {
  try {
    const { sortBy = 'rating' } = req.query;

    let sortOptions = {};
    if (sortBy === 'rating') sortOptions = { 'mentorProfile.rating': -1 };
    else if (sortBy === 'reviews') sortOptions = { 'mentorProfile.totalReviews': -1 };
    else if (sortBy === 'clients') sortOptions = { 'mentorProfile.currentClients': -1 };

    const mentors = await User.find({ role: 'mentor' })
      .select('name email avatar mentorProfile')
      .sort(sortOptions)
      .limit(20)
      .lean();

    res.json(mentors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/mentors/:mentorId/review - Submit a review for a mentor
const submitReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const mentorId = req.params.mentorId;
    const userId = req.user._id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // Verify mentor exists
    const mentor = await User.findById(mentorId);
    if (!mentor || mentor.role !== 'mentor') {
      return res.status(404).json({ message: 'Mentor not found' });
    }

    // Must have an accepted request with this mentor
    const accepted = await MentorRequest.findOne({
      userId,
      mentorId,
      status: 'accepted'
    });
    if (!accepted) {
      return res.status(403).json({ message: 'You can only review a mentor you are assigned to' });
    }

    // Upsert review (one per user per mentor)
    const review = await MentorReview.findOneAndUpdate(
      { mentorId, userId },
      { rating, comment: comment || '', mentorId, userId },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate('userId', 'name avatar');

    // Recalculate mentor's average rating
    const allReviews = await MentorReview.find({ mentorId });
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await User.findByIdAndUpdate(mentorId, {
      'mentorProfile.rating': Math.round(avgRating * 10) / 10,
      'mentorProfile.totalReviews': allReviews.length
    });

    console.log(`Review submitted for mentor ${mentorId} by user ${userId}`);
    res.status(201).json(review);
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({ message: error.message });
  }
};

// GET /api/mentors/:mentorId/reviews - Get reviews for a mentor
const getMentorReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const mentorId = req.params.mentorId;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [reviews, total] = await Promise.all([
      MentorReview.find({ mentorId })
        .populate('userId', 'name avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      MentorReview.countDocuments({ mentorId })
    ]);

    res.json({
      reviews,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ message: error.message });
  }
};

// Placeholder for client management
const getMyClients = async (req, res) => {
  try {
    // Find accepted requests where current user is the mentor
    const requests = await MentorRequest.find({
      mentorId: req.user._id,
      status: 'accepted'
    }).populate('userId', 'name email avatar stats').lean();

    // Build normalized client list with derived xp/level/streak/totalCompletions
    const clients = await Promise.all(
      requests.map(async (r) => {
        const u = r.userId;
        if (!u) return null;

        // Accurate total completions for this client
        const totalCompletions = await Completion.countDocuments({ userId: u._id });

        const xp = (u.stats && typeof u.stats.xp === 'number') ? u.stats.xp : (totalCompletions * 10);
        const level = (u.stats && typeof u.stats.level === 'number') ? u.stats.level : (Math.floor(xp / 100) + 1);

        return {
          _id: u._id,
          name: u.name,
          email: u.email,
          avatar: u.avatar || '',
          xp,
          level,
          streak: u.stats?.currentStreak || 0,
          totalCompletions
        };
      })
    );

    res.json(clients.filter(Boolean));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getClientDetails = async (req, res) => {
  try {
    const clientId = req.params.userId;
    
    // Verify mentor has accepted relationship with this client
    const request = await MentorRequest.findOne({
      mentorId: req.user._id,
      userId: clientId,
      status: 'accepted'
    });

    if (!request) {
      return res.status(404).json({ message: 'Client not found or not assigned to you' });
    }

    // Get client details
    const client = await User.findById(clientId).select('-password').lean();
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Get client's habits
    const habits = await Habit.find({ userId: clientId, isActive: true }).lean();

    // Get total completions for client (accurate)
    const totalCompletions = await Completion.countDocuments({ userId: clientId });

    // Compute completions per habit (small number of habits -> per-habit counts are fine)
    await Promise.all(habits.map(async (h) => {
      const count = await Completion.countDocuments({ userId: clientId, habitId: h._id });
      h.total_completions = count;
      h.streak = h.streak || 0;
      // ensure an 'id' field for frontend keys
      h.id = h._id;
    }));

    // Get recent completions (latest 20)
    const recentCompletions = await Completion.find({ userId: clientId })
      .sort({ completedAt: -1 })
      .limit(20)
      .lean();

    // Calculate active streaks (habits with streak > 0)
    const activeStreaks = habits.filter(h => (h.streak || 0) > 0).length;

    // Compute XP and level when missing: XP = totalCompletions * 10, level = floor(xp/100)+1
    const xp = (client.stats && typeof client.stats.xp === 'number') ? client.stats.xp : (totalCompletions * 10);
    const level = (client.stats && typeof client.stats.level === 'number') ? client.stats.level : (Math.floor(xp / 100) + 1);

    // Transform response to match frontend expectations
    res.json({ 
      client: {
        ...client,
        streak: client.stats?.currentStreak || 0,
        xp,
        level,
      },
      habits,
      recentCompletions,
      total_habits: habits.length,
      active_streaks: activeStreaks,
      stats: {
        totalHabits: habits.length,
        totalCompletions,
        currentStreak: client.stats?.currentStreak || 0
      }
    });
  } catch (error) {
    console.error('Error fetching client details:', error);
    res.status(500).json({ message: error.message });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { receiverId, content } = req.body;

    const message = await Message.create({
      senderId: req.user._id,
      receiverId,
      content
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMessages = async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { senderId: req.user._id, receiverId: req.params.userId },
        { senderId: req.params.userId, receiverId: req.user._id }
      ]
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMentorAnalytics = async (req, res) => {
  try {
    const mentor = await User.findById(req.user._id);
    const acceptedRequests = await MentorRequest.countDocuments({
      mentorId: req.user._id,
      status: 'accepted'
    });

    res.json({
      totalClients: acceptedRequests,
      totalHabits: 0,
      totalCompletions: 0,
      maxCapacity: mentor.mentorProfile?.maxClients || 10
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export default {
  getAllMentors,
  getNearbyMentors,
  getMentorProfile,
  sendMentorRequest,
  getSentRequests,
  getReceivedRequests,
  acceptRequest,
  rejectRequest,
  getMentorLeaderboard,
  submitReview,
  getMentorReviews,
  getMyClients,
  getClientDetails,
  sendMessage,
  getMessages,
  getMentorAnalytics
};
