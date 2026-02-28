import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, MessageCircle, Share2, Send, Sparkles, 
  TrendingUp, Users, Award, Flame, ThumbsUp,
  Smile, Star, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const API = `${import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:4000'}/api`;

const REACTION_TYPES = [
  { type: 'like', icon: ThumbsUp, label: 'Like', color: 'text-blue-500' },
  { type: 'love', icon: Heart, label: 'Love', color: 'text-red-500' },
  { type: 'fire', icon: Flame, label: 'Fire', color: 'text-orange-500' },
  { type: 'clap', icon: Award, label: 'Clap', color: 'text-yellow-500' },
  { type: 'strong', icon: Zap, label: 'Strong', color: 'text-purple-500' },
  { type: 'sparkle', icon: Star, label: 'Sparkle', color: 'text-pink-500' },
];

const PostCard = ({ post, onReact, onComment, token }) => {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [showReactions, setShowReactions] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');

  const loadComments = async () => {
    try {
      const res = await axios.get(`${API}/posts/${post._id}/comments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setComments(res.data.comments || []);
    } catch (error) {
      // fallback to inline mock comments when backend unavailable
      setComments(post.comments || []);
      console.error('Load comments error:', error);
    }
  };

  const handleComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      await axios.post(
        `${API}/posts/${post._id}/comments`,
        { content: newComment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewComment('');
      loadComments();
      onComment && onComment();
      toast.success('Comment posted!');
    } catch (error) {
      toast.error('Failed to post comment');
    }
  };

  const getAISuggestion = async () => {
    try {
      const res = await axios.get(`${API}/posts/${post._id}/ai-comment`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAiSuggestion(res.data.suggestedComment);
      setNewComment(res.data.suggestedComment);
    } catch (error) {
      console.error('AI suggestion error:', error);
    }
  };

  const formatTime = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'celebrating': return 'bg-gradient-to-r from-yellow-100 to-orange-100 border-yellow-300';
      case 'positive': return 'bg-gradient-to-r from-green-50 to-emerald-50 border-emerald-200';
      case 'struggling': return 'bg-gradient-to-r from-blue-50 to-indigo-50 border-indigo-200';
      default: return 'bg-white border-gray-200';
    }
  };

  useEffect(() => {
    if (showComments && comments.length === 0) {
      loadComments();
    }
  }, [showComments]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4"
    >
      <Card className="p-4 sm:p-6 bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 border border-amber-200">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <Avatar className="w-12 h-12 ring-2 ring-emerald-200">
            <AvatarImage src={post.userId?.avatar} />
            <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white">
              {post.userId?.name?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-gray-900">{post.userId?.name}</h4>
              <Badge variant="secondary" className="text-xs">
                Level {post.userId?.level || 1}
              </Badge>
            </div>
            <p className="text-sm text-gray-500">{formatTime(post.createdAt)}</p>
          </div>

          {post.postType && (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">
              {post.postType}
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="mb-4">
          <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{post.content}</p>
          
          {post.habitId && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-gray-200">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium text-gray-700">{post.habitId.title}</span>
            </div>
          )}

          {post.aiTags && post.aiTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {post.aiTags.map((tag, idx) => (
                <span key={idx} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* AI Support Message */}
        {post.aiSuggestedSupport && (
          <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-purple-900">{post.aiSuggestedSupport}</p>
            </div>
          </div>
        )}

        {/* Engagement Stats */}
        <div className="flex items-center gap-6 py-3 border-t border-b border-gray-200 mb-3">
          <span className="text-sm text-gray-600">
            {post.likeCount || 0} {post.likeCount === 1 ? 'reaction' : 'reactions'}
          </span>
          <span className="text-sm text-gray-600">
            {post.commentCount || 0} {post.commentCount === 1 ? 'comment' : 'comments'}
          </span>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 hover:bg-emerald-50 hover:text-emerald-700"
              onMouseEnter={() => setShowReactions(true)}
              onMouseLeave={() => setTimeout(() => setShowReactions(false), 200)}
              onClick={() => onReact(post._id, 'like')}
            >
              <Heart className="w-4 h-4" />
              React
            </Button>

            <AnimatePresence>
              {showReactions && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-full left-0 mb-2 p-2 bg-white rounded-xl shadow-2xl border border-gray-200 flex gap-1 z-10"
                  onMouseEnter={() => setShowReactions(true)}
                  onMouseLeave={() => setShowReactions(false)}
                >
                  {REACTION_TYPES.map(({ type, icon: Icon, label, color }) => (
                    <button
                      key={type}
                      onClick={() => {
                        onReact(post._id, type);
                        setShowReactions(false);
                      }}
                      className="p-2 hover:bg-gray-50 rounded-lg transition-all hover:scale-110"
                      title={label}
                    >
                      <Icon className={`w-5 h-5 ${color}`} />
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="gap-2 hover:bg-blue-50 hover:text-blue-700"
            onClick={() => setShowComments(!showComments)}
          >
            <MessageCircle className="w-4 h-4" />
            Comment
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="gap-2 hover:bg-purple-50 hover:text-purple-700"
            onClick={getAISuggestion}
          >
            <Sparkles className="w-4 h-4" />
            AI Suggest
          </Button>
        </div>

        {/* Comments Section */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-gray-200"
            >
              {/* New Comment */}
              <div className="mb-4">
                <Textarea
                  placeholder="Write a supportive comment... 🔥"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="mb-2 min-h-[80px]"
                />
                <Button onClick={handleComment} className="gap-2">
                  <Send className="w-4 h-4" />
                  Post Comment
                </Button>
              </div>

              {/* Comments List */}
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment._id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={comment.userId?.avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white text-xs">
                        {comment.userId?.name?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{comment.userId?.name}</span>
                        <span className="text-xs text-gray-500">{formatTime(comment.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-700">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

import { mockPosts, mockCommunities, mockRecommendations, mockUsers } from '@/lib/mockCommunityFeed';
import demoStore from '@/lib/demoStore';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

function GoogleMap({ locations = [] }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY || !ref.current) return;

    // load google maps script if not already loaded
    if (!window.google) {
      const s = document.createElement('script');
      s.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
      s.async = true;
      s.onload = () => initMap();
      document.head.appendChild(s);
    } else {
      initMap();
    }

    function initMap() {
      try {
        const map = new window.google.maps.Map(ref.current, {
          center: locations[0] ? { lat: locations[0].lat, lng: locations[0].lng } : { lat: 37.7749, lng: -122.4194 },
          zoom: 13,
        });

        locations.forEach(loc => {
          new window.google.maps.Marker({ position: { lat: loc.lat, lng: loc.lng }, map, title: loc.name || loc.id });
        });
      } catch (err) {
        // ignore map errors
        console.error('Map init error', err);
      }
    }
  }, [locations]);

  return (
    <div>
      {GOOGLE_MAPS_API_KEY ? (
        <div ref={ref} className="w-full h-48 rounded-md border" />
      ) : (
        <div className="w-full h-48 rounded-md border flex items-center justify-center bg-gray-50 text-sm text-slate-600">
          Google Maps API key not set. Set `VITE_GOOGLE_MAPS_API_KEY` to see nearby communities.
        </div>
      )}
    </div>
  );
}

// create lightweight demo challenges + competitions derived from mock data
const mockChallenges = mockCommunities.filter((c) => c.type === 'challenge').map((c) => ({
  id: `chal-${c.id}`,
  title: c.name,
  description: c.description,
  communityId: c.id,
  participants: c.members || [],
  days: 30
}));

const mockCommunityCompetitions = [
  {
    id: 'comp-1',
    title: 'Step Challenge: Morning Risers vs Focus Hour',
    teams: ['c1', 'c3'],
    scores: { c1: 4200, c3: 3780 },
    endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString()
  }
];

const mockIndividualCompetitions = [
  {
    id: 'ind-1',
    title: '7-Day Streak Sprint',
    participants: ['u3','u1','u2'],
    leaderboard: mockUsers.slice(0,3).map((u, idx)=>({ userId: u.id, name: u.name, streak: u.streak + (3-idx) }))
  }
];

const CommunityFeed = ({ communityId, token, user }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [postType, setPostType] = useState('general');
  const [recommendations, setRecommendations] = useState(null);
    const [joinedCommunities, setJoinedCommunities] = useState(() => demoStore.getJoinedCommunities());
    const [participatingChallenges, setParticipatingChallenges] = useState(new Set());
    const [communityCompetitions, setCommunityCompetitions] = useState(mockCommunityCompetitions);
    const [individualCompetitions, setIndividualCompetitions] = useState(mockIndividualCompetitions);

  // helper: build community leaderboard mock
  const buildCommunityLeaderboard = (comm) => {
    const members = (comm.members || []).map((id) => mockUsers.find(u => u.id === id)).filter(Boolean);
    return members.sort((a,b) => b.xp - a.xp).slice(0,5);
  };

  const loadFeed = async () => {
    setLoading(true);
    try {
      const endpoint = communityId 
        ? `${API}/posts/community/${communityId}`
        : `${API}/posts/feed`;
      
      const res = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPosts(res.data.posts || []);
      setRecommendations(res.data.recommendations || null);
    } catch (error) {
      console.error('Load feed error:', error);
      // fallback to mock data when backend is unavailable or unauthorized
      const merged = demoStore.getPosts();
      setPosts(merged.filter(p => !communityId || p.communityId === communityId));
      setRecommendations(mockRecommendations);
      toast('Showing demo posts and recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPost.trim()) return;

    try {
      await axios.post(
        `${API}/posts`,
        {
          content: newPost,
          communityId,
          postType
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewPost('');
      setPostType('general');
      loadFeed();
      toast.success('Post shared! 🎉');
    } catch (error) {
      // fallback demo: create a local mock post
      const demoUser = user ? { id: user.id, name: user.name, avatar: user.avatar, level: user.level } : mockUsers[0];
      const newMock = {
        _id: `local-${Date.now()}`,
        userId: demoUser,
        content: newPost,
        createdAt: new Date().toISOString(),
        aiSentiment: 'positive',
        aiTags: [],
        likeCount: 0,
        commentCount: 0,
        postType,
        habitId: null,
        communityId: communityId || null
      };
      // persist via demoStore so other components see it
      demoStore.addPost(newMock);
      setNewPost('');
      setPostType('general');
      toast.success('Post added to demo feed');
    }
  };

  const handleReact = async (postId, reactionType) => {
    try {
      await axios.post(
        `${API}/posts/${postId}/react`,
        { reactionType },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadFeed();
    } catch (error) {
      // demo: persist reaction to demoStore so UI across components updates
      demoStore.reactToPost(postId);
    }
  };

  const toggleJoinCommunity = (commId) => {
    // persist join into demoStore and update UI
    const currently = demoStore.getJoinedCommunities();
    if (currently.has(commId)) {
      demoStore.leaveCommunity(commId);
      setJoinedCommunities(demoStore.getJoinedCommunities());
      toast.success('Left community (demo)');
    } else {
      demoStore.joinCommunity(commId);
      setJoinedCommunities(demoStore.getJoinedCommunities());
      toast.success('Joined community (demo)');
    }
  };

  const toggleJoinChallenge = (challengeId) => {
    setParticipatingChallenges(prev => {
      const next = new Set(prev);
      if (next.has(challengeId)) next.delete(challengeId);
      else next.add(challengeId);
      toast.success(next.has(challengeId) ? 'Joined challenge (demo)' : 'Left challenge (demo)');
      return next;
    });
  };

  const joinCompetitionTeam = (competitionId, teamId) => {
    setCommunityCompetitions(prev => prev.map(c => {
      if (c.id !== competitionId) return c;
      const scores = { ...c.scores };
      scores[teamId] = (scores[teamId] || 0) + 100; // demo boost
      return { ...c, scores };
    }));
    toast.success('You cheered for your team! (demo)');
  };

  useEffect(() => {
    if (token) {
      loadFeed();
    }
    // if no token, show demo posts immediately
    else {
      setPosts(demoStore.getPosts().filter(p => !communityId || p.communityId === communityId));
      setRecommendations(mockRecommendations);
    }
  }, [communityId, token]);

  useEffect(() => {
    const unsub = demoStore.subscribe(() => {
      setJoinedCommunities(demoStore.getJoinedCommunities());
      setPosts(demoStore.getPosts().filter(p => !communityId || p.communityId === communityId));
    });
    return () => unsub();
  }, [communityId]);

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main feed column */}
      <div className="lg:col-span-2">
      {/* Create Post */}
      <Card className="p-4 sm:p-6 mb-6 bg-gradient-to-br from-white via-slate-50 to-slate-100 border border-slate-200 shadow-sm">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-600" />
          Share Your Progress
        </h3>
        
        <Textarea
          placeholder="Share your wins, struggles, or milestones... Your community is here to support you! 💪"
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          className="mb-3 min-h-[120px]"
        />

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={postType}
            onChange={(e) => setPostType(e.target.value)}
            className="flex-1 min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="general">General</option>
            <option value="progress">Progress Update</option>
            <option value="achievement">Achievement</option>
            <option value="struggle">Need Support</option>
            <option value="milestone">Milestone</option>
          </select>

          <Button onClick={handleCreatePost} className="gap-2 whitespace-nowrap">
            <Send className="w-4 h-4" />
            Share Post
          </Button>
        </div>
      </Card>

      {/* Posts Feed */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading posts...</p>
        </div>
      ) : posts.length === 0 ? (
        // show community directory + challenges when no posts
        <div className="space-y-4">
          {/* when viewing a specific community, show members */}
          {communityId && (
            <Card className="p-4">
              <h3 className="font-semibold mb-2">Community Members</h3>
              <div className="flex flex-wrap gap-3">
                {(mockCommunities.find(c=>c.id===communityId)?.members || []).map(id => {
                  const u = mockUsers.find(x=>x.id===id);
                  return (
                    <div key={id} className="flex items-center gap-3 bg-white p-2 rounded-lg border">
                      <Avatar className="w-10 h-10 ring-2 ring-white shadow-sm"><AvatarFallback className="bg-emerald-400 text-white">{u?.name?.[0]}</AvatarFallback></Avatar>
                      <div>
                        <div className="font-medium">{u?.name}</div>
                        <div className="text-xs text-slate-500">Streak: {u?.streak} • Level {u?.level}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
          <div>
            <h3 className="text-lg font-semibold mb-3">Communities to explore</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {mockCommunities.map(c => (
                <Card key={c.id} className="p-4 flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-slate-500">{c.description}</div>
                      </div>
                      <Badge className="text-xs">{c.type}</Badge>
                    </div>
                    <div className="text-xs text-slate-500 mt-2">Members: {(c.members||[]).length}</div>
                    <div className="mt-3 flex items-center gap-2">
                      <Button size="sm" onClick={() => toggleJoinCommunity(c.id)}>
                        {joinedCommunities.has(c.id) ? 'Joined' : 'Join'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setPosts(mockPosts.filter(p => p.communityId === c.id || !p.communityId)); toast.info('Switched to demo community feed'); }}>
                        View Feed
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Active Challenges</h3>
            <div className="space-y-3">
              {mockChallenges.map(ch => (
                <Card key={ch.id} className="p-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{ch.title}</div>
                    <div className="text-xs text-slate-500">{ch.description} • {ch.days}-day</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => toggleJoinChallenge(ch.id)}>
                      {participatingChallenges.has(ch.id) ? 'Joined' : 'Join'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setPosts(mockPosts.filter(p => p.communityId === ch.communityId || !p.communityId)); toast('Viewing challenge feed (demo)'); }}>
                      View
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post._id}
            post={post}
            onReact={handleReact}
            onComment={loadFeed}
            token={token}
          />
        ))
      )}
      </div>

      {/* Right column: recommendations, leaderboard, community competition */}
      <aside className="space-y-4">
        <Card className="p-4">
          <h4 className="font-semibold mb-2">Recommendations</h4>
          <div className="space-y-2">
            {(recommendations?.communities || mockCommunities).map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-slate-500">{c.description}</div>
                </div>
                <div>
                  <Button size="sm" onClick={() => toast.success(`Joined ${c.name} (demo)`)}>Join</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h4 className="font-semibold mb-2">Community Leaders</h4>
          <div className="space-y-3">
            {(recommendations?.leaders || mockRecommendations.leaders).map((u) => (
              <div key={u.id} className="flex items-center gap-3">
                <Avatar className="w-10 h-10 ring-2 ring-white shadow-sm">
                  <AvatarFallback className="bg-emerald-400 text-white">{u.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-slate-500">Streak: {u.streak} • Level {u.level}</div>
                </div>
                <Badge className="bg-yellow-100 text-yellow-700">Leader</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h4 className="font-semibold mb-2">Friendly Competition</h4>
          <p className="text-xs text-slate-500 mb-2">Top members this week</p>
          <div className="space-y-2">
            {mockUsers.sort((a,b)=>b.streak-a.streak).slice(0,3).map((u, idx) => (
              <div key={u.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8 ring-2 ring-white shadow-sm"><AvatarFallback className="bg-emerald-400 text-white">{u.name[0]}</AvatarFallback></Avatar>
                  <div>
                    <div className="text-sm font-medium">{u.name}</div>
                    <div className="text-xs text-slate-500">Streak: {u.streak} days</div>
                  </div>
                </div>
                <div className="text-sm font-semibold">#{idx+1}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h4 className="font-semibold mb-2">Recommended Collaborators</h4>
          <div className="space-y-2">
            {(recommendations?.usersByHabits || mockRecommendations.usersByHabits).map(({ user: u, commonHabits }) => (
              <div key={u.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 ring-2 ring-white shadow-sm"><AvatarFallback className="bg-emerald-400 text-white">{u.name[0]}</AvatarFallback></Avatar>
                  <div>
                    <div className="font-medium">{u.name} <span className="text-xs text-slate-500">@{u.username}</span></div>
                    <div className="text-xs text-slate-500">Common: {commonHabits.join(', ')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => toast.success(`Requested to collaborate with ${u.name} (demo)`)}>Collaborate</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h4 className="font-semibold mb-2">Nearby Communities</h4>
          <GoogleMap locations={(recommendations?.nearbyCommunities || mockRecommendations.nearbyCommunities).map(c=>({ ...c.coords, name: c.name }))} />
          <div className="text-xs text-slate-500 mt-2">Showing nearby demo communities. Enable `VITE_GOOGLE_MAPS_API_KEY` to view a live map.</div>
        </Card>

        <Card className="p-4">
          <h4 className="font-semibold mb-2">Community Challenges</h4>
          <div className="space-y-2">
            {(recommendations?.challenges || mockChallenges).map(ch => (
              <div key={ch.id} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{ch.title}</div>
                  <div className="text-xs text-slate-500">{ch.description}</div>
                </div>
                <div>
                  <Button size="sm" onClick={() => toggleJoinChallenge(ch.id)}>
                    {participatingChallenges.has(ch.id) ? 'Joined' : 'Join'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h4 className="font-semibold mb-2">Community vs Community</h4>
          <div className="space-y-3">
            {communityCompetitions.map(comp => (
              <div key={comp.id} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{comp.title}</div>
                    <div className="text-xs text-slate-500">Ends {new Date(comp.endsAt).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {comp.teams.map(t => {
                      const comm = mockCommunities.find(c=>c.id===t) || { name: t };
                      return (
                        <div key={t} className="text-center">
                          <div className="font-medium">{comm.name}</div>
                          <div className="text-sm">{comp.scores[t] || 0}</div>
                          <Button size="xs" onClick={() => joinCompetitionTeam(comp.id, t)}>Cheer</Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h4 className="font-semibold mb-2">Individual Competitions</h4>
          <div className="space-y-2">
            {individualCompetitions.map(ic => (
              <div key={ic.id} className="p-2 border rounded-md">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{ic.title}</div>
                    <div className="text-xs text-slate-500">Top performers</div>
                  </div>
                  <div>
                    <Button size="sm" onClick={() => toast.success('Joined individual sprint (demo)')}>Join</Button>
                  </div>
                </div>
                <div className="mt-2 text-sm">
                  {ic.leaderboard.map(lb => (
                    <div key={lb.userId} className="flex items-center justify-between">
                      <div>{lb.name}</div>
                      <div className="text-xs text-slate-500">Streak: {lb.streak}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </aside>
    </div>
  );
};

export default CommunityFeed;
