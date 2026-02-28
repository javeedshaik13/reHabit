import '@/index.css';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Plus, UserPlus, Trophy, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { API } from '@/lib/config';
import { mockCommunities } from '@/lib/mockCommunityFeed';
import StudioHub from '@/components/StudioHub';
import CommunityFeed from '@/components/CommunityFeed';
import demoStore from '@/lib/demoStore';
import FriendsHub from '@/components/FriendsHub';

const CommunityPage = ({ user, onLogout }) => {
  const [communities, setCommunities] = useState([]);
  const [studios, setStudios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'general'
  });
  const [selectedCommunity, setSelectedCommunity] = useState(null);
  const [exploreDialogOpen, setExploreDialogOpen] = useState(false);
  const [challengeDialogOpen, setChallengeDialogOpen] = useState(false);
  const [challengeData, setChallengeData] = useState({
    title: '',
    description: '',
    communityId: '',
    category: 'fitness',
    difficulty: 'medium',
    duration: 30,
    startDate: new Date().toISOString().split('T')[0]
  });

  const [demoJoined, setDemoJoined] = useState(() => demoStore.getJoinedCommunities());

  useEffect(() => {
    const unsub = demoStore.subscribe(() => setDemoJoined(demoStore.getJoinedCommunities()));
    return () => unsub();
  }, []);

  useEffect(() => {
    fetchCommunities();
    fetchStudios();
  }, []);

  const fetchCommunities = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const response = await axios.get(`${API}/communities`, config);
      const data = response.data?.communities ?? response.data ?? [];
      console.log('Fetched communities from backend:', data.length);
      if (!data || (Array.isArray(data) && data.length === 0)) {
        const demoCommunities = demoStore.getCommunities();
        // Include all mock communities with AI match scores
        const allMockCommunities = mockCommunities.filter(mc => 
          !demoCommunities.find(dc => dc.name === mc.name)
        );
        setCommunities([...demoCommunities, ...allMockCommunities]);
      } else {
        // Merge backend data with mock communities
        const allMockCommunities = mockCommunities.filter(mc => 
          !data.find(dc => dc.name === mc.name)
        );
        setCommunities([...data, ...allMockCommunities]);
      }
    } catch (error) {
      console.error('Failed to load communities:', error.response?.data || error.message);
      if (error?.response?.status === 401 || !error?.response) {
        const demoCommunities = demoStore.getCommunities();
        // Include all mock communities with AI match scores
        const allMockCommunities = mockCommunities.filter(mc => 
          !demoCommunities.find(dc => dc.name === mc.name)
        );
        setCommunities([...demoCommunities, ...allMockCommunities]);
      } else {
        toast.error('Failed to load communities');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStudios = async () => {
    try {
      const response = await axios.get(`${API}/studios`);
      setStudios(response.data || []);
    } catch (error) {
      console.error('Failed to load studios:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/communities`, formData);
      setCommunities([...communities, response.data]);
      toast.success('Community created!');
      setDialogOpen(false);
      setFormData({ name: '', description: '', category: 'general' });
    } catch (error) {
      const status = error?.response?.status;
      if (!user?.id || !error?.response || status === 401 || status >= 500) {
        const created = demoStore.addCommunity({ ...formData, createdBy: user?.id });
        setCommunities(prev => [created, ...prev]);
        toast.success('Community created (demo)');
        setDialogOpen(false);
        setFormData({ name: '', description: '', category: 'general' });
        return;
      }
      toast.error('Failed to create community');
    }
  };

  const handleChallengeSubmit = async (e) => {
    e.preventDefault();
    if (!challengeData.communityId) {
      toast.error('Please select a community or studio');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please sign in to create a challenge');
        return;
      }
      console.log('Creating challenge:', challengeData);
      const response = await axios.post(`${API}/challenges`, challengeData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Challenge created:', response.data);
      toast.success('Challenge created!');
      setChallengeDialogOpen(false);
      setChallengeData({
        title: '',
        description: '',
        communityId: '',
        category: 'fitness',
        difficulty: 'medium',
        duration: 30,
        startDate: new Date().toISOString().split('T')[0]
      });
      // Refresh challenges list
      await fetchChallenges();
    } catch (error) {
      console.error('Challenge creation error:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || 'Failed to create challenge');
    }
  };

  const handleJoin = async (communityId) => {
    console.log('Attempting to join community:', communityId);
    const community = communities.find(c => (c._id || c.id) === communityId);
    const isMockCommunity = community && !community._id && community.id;
    
    if (isMockCommunity) {
      console.log('Joining mock community:', community.name);
      demoStore.joinCommunity(communityId);
      setCommunities(prev => prev.map(c => {
        const cId = c._id || c.id;
        if (cId !== communityId) return c;
        const nextMembers = Array.isArray(c.members) ? [...c.members] : [];
        const userId = user?._id || user?.id;
        if (userId && !nextMembers.includes(userId)) nextMembers.push(userId);
        return { ...c, members: nextMembers };
      }));
      toast.success('Joined community!');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please sign in to join this community');
        return;
      }
      console.log('Joining backend community with token');
      await axios.post(`${API}/communities/${communityId}/join`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Joined community!');
      fetchCommunities();
    } catch (error) {
      console.error('Join error:', error.response?.data || error.message);
      const status = error?.response?.status;
      if (!error?.response || (status && status >= 500)) {
        console.log('Backend error, using demo mode');
        demoStore.joinCommunity(communityId);
        setCommunities(prev => prev.map(c => {
          const cId = c._id || c.id;
          if (cId !== communityId) return c;
          const nextMembers = Array.isArray(c.members) ? [...c.members] : [];
          const userId = user?._id || user?.id;
          if (userId && !nextMembers.includes(userId)) nextMembers.push(userId);
          return { ...c, members: nextMembers };
        }));
        toast.success('Joined community!');
        return;
      }
      if (status === 401 || status === 403) {
        toast.error('Please sign in to join this community');
      } else {
        toast.error(error.response?.data?.message || 'Failed to join community');
      }
    }
  };

  const exploreCommunity = async (communityId) => {
    try {
      const response = await axios.get(`${API}/communities/${communityId}`);
      console.log('Community data:', response.data);
      setSelectedCommunity(response.data);
      setExploreDialogOpen(true);
    } catch (error) {
      console.error('Explore error:', error);
      const community = communities.find(c => (c._id || c.id) === communityId);
      if (community) {
        setSelectedCommunity(community);
        setExploreDialogOpen(true);
        toast.info('Viewing community (offline mode)');
      } else {
        toast.error('Failed to load community details');
      }
    }
  };

  const isJoinedCommunity = (community) => {
    const userId = user?._id || user?.id;
    const communityId = community._id || community.id;
    if (!userId || !community.members) return false;
    
    const isMember = community.members.some(m => {
      const memberId = typeof m === 'object' ? m._id : m;
      return memberId?.toString() === userId?.toString();
    });
    
    return isMember || demoJoined.has(communityId);
  };

  const [allChallenges, setAllChallenges] = useState([]);
  const [challengesLoading, setChallengesLoading] = useState(true);

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No token found, challenges may not load');
        setAllChallenges([]);
        setChallengesLoading(false);
        return;
      }
      const response = await axios.get(`${API}/challenges`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = Array.isArray(response.data) ? response.data : response.data?.challenges || [];
      console.log('Fetched challenges:', data.length, data);
      setAllChallenges(data);
    } catch (error) {
      console.error('Failed to load challenges:', error.response?.data || error.message);
      // Set empty array on error instead of leaving it undefined
      setAllChallenges([]);
    } finally {
      setChallengesLoading(false);
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

  return (
    <Layout user={user} onLogout={onLogout} role="user">
      <div className="space-y-4 sm:space-y-6 mt-3 sm:mt-5 px-1 sm:px-0" data-testid="community-page">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold text-slate-800" style={{ fontFamily: 'Rethink Sans, sans-serif' }}>Community</h1>
            <p className="text-slate-600 mt-0.5 text-xs sm:text-base" style={{ fontFamily: 'Spectral, serif' }}>Connect with others on their habit journey</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className="group gap-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:via-teal-600 hover:to-emerald-700 text-white px-3 py-2 sm:px-5 sm:py-3 text-sm sm:text-base rounded-xl shadow-sm hover:shadow-md transition-all border border-emerald-500/30"
                  data-testid="create-community-btn"
                >
                  <span className="flex items-center gap-1.5">
                    <Plus className="w-4 h-4 transition-transform group-hover:scale-110 shrink-0" />
                    <span className="font-semibold tracking-wide whitespace-nowrap">+ Community</span>
                  </span>
                </Button>
              </DialogTrigger>
            <DialogContent
              data-testid="create-community-dialog"
              className="bg-white text-slate-900 rounded-lg shadow-xl border border-slate-200 w-[520px] max-w-full"
            >
              <DialogHeader>
                <DialogTitle>Create New Community</DialogTitle>
                <DialogDescription>Start a group or challenge</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Community Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="e.g., Morning Risers, 30-Day Fitness"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    data-testid="community-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="What's this community about?"
                    value={formData.description}
                    onChange={handleChange}
                    data-testid="community-description-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="general">General</option>
                    <option value="fitness">Fitness</option>
                    <option value="nutrition">Nutrition</option>
                    <option value="mindfulness">Mindfulness</option>
                    <option value="productivity">Productivity</option>
                    <option value="learning">Learning</option>
                    <option value="social">Social</option>
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" className="ml-auto bg-emerald-600 hover:bg-emerald-700 text-white" data-testid="submit-community-btn" disabled={!formData.name.trim()}>Create Community</Button>
                </div>
                {(!user?.id) && (
                  <div className="text-xs text-amber-600 mt-2">You're currently unsigned — communities will be created in demo mode and stored locally.</div>
                )}
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={challengeDialogOpen} onOpenChange={setChallengeDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="group gap-1.5 bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 hover:from-amber-600 hover:via-yellow-600 hover:to-orange-600 text-white px-3 py-2 sm:px-5 sm:py-3 text-sm sm:text-base rounded-xl shadow-sm hover:shadow-md transition-all border border-amber-500/30"
              >
                <span className="flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 transition-transform group-hover:scale-110 shrink-0" />
                  <span className="font-semibold tracking-wide whitespace-nowrap">+ Challenge</span>
                </span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white text-slate-900 rounded-lg shadow-xl border border-slate-200 w-[580px] max-w-full">
              <DialogHeader>
                <DialogTitle>Create New Challenge</DialogTitle>
                <DialogDescription>Create a time-bound challenge within a community</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleChallengeSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="challenge-title">Challenge Title</Label>
                  <Input
                    id="challenge-title"
                    placeholder="e.g., 30-Day Fitness Challenge"
                    value={challengeData.title}
                    onChange={(e) => setChallengeData({...challengeData, title: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="challenge-description">Description</Label>
                  <Textarea
                    id="challenge-description"
                    placeholder="What's this challenge about?"
                    value={challengeData.description}
                    onChange={(e) => setChallengeData({...challengeData, description: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="challenge-community">Community / Studio</Label>
                  <select
                    id="challenge-community"
                    value={challengeData.communityId}
                    onChange={(e) => {
                      console.log('Selected value:', e.target.value);
                      setChallengeData({...challengeData, communityId: e.target.value});
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    required
                  >
                    <option value="">Select a community or studio</option>
                    <optgroup label="Communities (Backend)">
                      {communities.map(community => {
                        const userId = user?._id || user?.id;
                        const creatorId = typeof community.creatorId === 'object' ? community.creatorId._id : community.creatorId;
                        const isMember = community.members?.some(m => {
                          const memberId = typeof m === 'object' ? m._id : m;
                          return memberId?.toString() === userId?.toString();
                        });
                        const isCreator = creatorId?.toString() === userId?.toString();
                        
                        if (!isMember && !isCreator) return null;
                        
                        return (
                          <option key={community._id} value={community._id}>
                            {community.name}
                          </option>
                        );
                      })}
                    </optgroup>
                    <optgroup label="Studios">
                      {studios.map(studio => {
                        const userId = user?._id || user?.id;
                        const isMember = studio.members?.some(m => {
                          const memberId = typeof m === 'object' ? m._id : m;
                          return memberId?.toString() === userId?.toString();
                        });
                        
                        if (!isMember) return null;
                        
                        return (
                          <option key={studio._id} value={studio._id}>
                            {studio.name} (Studio)
                          </option>
                        );
                      })}
                    </optgroup>
                  </select>
                  <p className="text-xs text-slate-500">You can only create challenges in communities/studios you're a member of</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="challenge-category">Category</Label>
                    <select
                      id="challenge-category"
                      value={challengeData.category}
                      onChange={(e) => setChallengeData({...challengeData, category: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    >
                      <option value="fitness">Fitness</option>
                      <option value="nutrition">Nutrition</option>
                      <option value="mindfulness">Mindfulness</option>
                      <option value="productivity">Productivity</option>
                      <option value="learning">Learning</option>
                      <option value="social">Social</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="challenge-difficulty">Difficulty</Label>
                    <select
                      id="challenge-difficulty"
                      value={challengeData.difficulty}
                      onChange={(e) => setChallengeData({...challengeData, difficulty: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="challenge-duration">Duration (days)</Label>
                    <Input
                      id="challenge-duration"
                      type="number"
                      min="1"
                      max="365"
                      value={challengeData.duration}
                      onChange={(e) => setChallengeData({...challengeData, duration: parseInt(e.target.value)})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="challenge-start">Start Date</Label>
                    <Input
                      id="challenge-start"
                      type="date"
                      value={challengeData.startDate}
                      onChange={(e) => setChallengeData({...challengeData, startDate: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button type="button" variant="ghost" onClick={() => setChallengeDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" className="ml-auto bg-yellow-600 hover:bg-yellow-700 text-white" disabled={!challengeData.title.trim() || !challengeData.communityId}>Create Challenge</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <Tabs defaultValue="feed" className="w-full">
          <TabsList className="grid w-full grid-cols-5 h-auto p-1 gap-0.5">
            <TabsTrigger value="feed" data-testid="feed-tab" className="text-xs sm:text-sm px-1 py-1.5 sm:px-3">Feed</TabsTrigger>
            <TabsTrigger value="groups" data-testid="groups-tab" className="text-xs sm:text-sm px-1 py-1.5 sm:px-3">Groups</TabsTrigger>
            <TabsTrigger value="studios" data-testid="studios-tab" className="text-xs sm:text-sm px-1 py-1.5 sm:px-3">Studios</TabsTrigger>
            <TabsTrigger value="challenges" data-testid="challenges-tab" className="text-xs sm:text-sm px-1 py-1.5 sm:px-3"><span className="sm:hidden">Chall.</span><span className="hidden sm:inline">Challenges</span></TabsTrigger>
            <TabsTrigger value="friends" data-testid="friends-tab" className="text-xs sm:text-sm px-1 py-1.5 sm:px-3">Friends</TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="mt-6">
            <CommunityFeed communityId={null} token={user?.token} user={user} />
          </TabsContent>

          <TabsContent value="groups" className="mt-6">
            {/* My Communities Section */}
            {(() => {
              const joinedGroups = communities.filter(c => isJoinedCommunity(c));
              return joinedGroups.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    My Communities
                    <span className="ml-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold">
                      {joinedGroups.length}
                    </span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {joinedGroups.map((community) => {
                      const communityId = community._id || community.id;
                      return (
                        <Card key={communityId} className="card-hover shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 border-2 border-emerald-200 bg-gradient-to-br from-white to-emerald-50">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Users className="w-5 h-5 text-emerald-600" />
                              {community.name}
                            </CardTitle>
                            <CardDescription>{community.members?.length ?? 0} members • {community.category || 'general'}</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <p className="text-sm text-slate-600 mb-4">{community.description || 'No description'}</p>
                            <Button
                              variant="outline"
                              className="w-full border-emerald-300 hover:bg-emerald-50 text-emerald-700"
                              onClick={() => exploreCommunity(communityId)}
                            >
                              Explore Group
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* AI Recommended For You Section */}
            {(() => {
              const unjoinedCommunities = communities.filter(c => !isJoinedCommunity(c));
              // Sort by matchScore (AI recommendation) and take top 6
              const recommendedCommunities = unjoinedCommunities
                .filter(c => c.matchScore && c.matchScore >= 85)
                .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
                .slice(0, 6);
              
              return recommendedCommunities.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 flex items-center justify-center shadow-sm">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      AI Recommended For You
                    </h3>
                    <Badge className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white border-0 shadow-sm">
                      Based on your habits
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 mb-4">Communities that match your interests and activity patterns</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {recommendedCommunities.map((community) => {
                      const communityId = community._id || community.id;
                      const matchScore = community.matchScore || 85;
                      return (
                        <Card key={communityId} className="card-hover shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200 border border-emerald-200 bg-gradient-to-br from-white via-emerald-50 to-teal-50 relative overflow-hidden rounded-xl">
                          <div className="absolute top-2 right-2 z-10">
                            <Badge className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white text-xs font-bold border-0 shadow-sm">
                              {matchScore}% Match
                            </Badge>
                          </div>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Users className="w-5 h-5 text-emerald-600" />
                              {community.name}
                            </CardTitle>
                            <CardDescription>{community.members?.length ?? 0} members • {community.category || 'general'}</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <p className="text-sm text-slate-600 mb-4">{community.description || 'No description'}</p>
                            <Button
                              onClick={() => handleJoin(communityId)}
                              className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:via-teal-700 hover:to-cyan-700 text-white transition-all duration-200 shadow-sm"
                              data-testid={`join-community-${communityId}`}
                            >
                              <UserPlus className="w-4 h-4 mr-2" />
                              Join Group
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Discover More Section - Lower match scores */}
            {(() => {
              const unjoinedCommunities = communities.filter(c => !isJoinedCommunity(c));
              const otherCommunities = unjoinedCommunities
                .filter(c => !c.matchScore || c.matchScore < 85)
                .slice(0, 9);
              
              return (
                <>
                  <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 flex items-center justify-center shadow-sm">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    Discover More
                  </h3>
                  {otherCommunities.length === 0 ? (
                    <Card>
                      <CardContent className="py-12">
                        <div className="text-center">
                          <Users className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                          <h3 className="text-lg font-semibold text-slate-700 mb-2">You've explored all communities!</h3>
                          <p className="text-slate-500 mb-4">Create a new community to connect with more people.</p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {otherCommunities.map((community) => {
                        const communityId = community._id || community.id;
                        return (
                          <Card key={communityId} className="card-hover shadow-sm hover:shadow-md transform hover:-translate-y-1 transition-all duration-200 border border-emerald-100 bg-white/60 backdrop-blur-sm rounded-xl" data-testid={`community-${communityId}`}>
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-emerald-600" />
                                {community.name}
                              </CardTitle>
                              <CardDescription>{community.members?.length ?? 0} members • {community.category || 'general'}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <p className="text-sm text-slate-600 mb-4">{community.description || 'No description'}</p>
                              <Button
                                onClick={() => handleJoin(communityId)}
                                className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:via-teal-700 hover:to-cyan-700 text-white transition-colors duration-150"
                                data-testid={`join-community-${communityId}`}
                              >
                                <UserPlus className="w-4 h-4 mr-2" />
                                Join Group
                              </Button>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </TabsContent>

          <TabsContent value="studios" className="mt-6">
            <StudioHub user={user} />
          </TabsContent>

          <TabsContent value="challenges" className="mt-6">
            {challengesLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
              </div>
            ) : allChallenges.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <Trophy className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">No challenges yet</h3>
                    <p className="text-slate-500 mb-4">Create your first challenge!</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {allChallenges.map((challenge) => {
                  const isParticipating = challenge.participants?.some(p => p.userId === user?.id || p.userId?._id === user?.id);
                  const daysLeft = Math.ceil((new Date(challenge.endDate) - new Date()) / (1000 * 60 * 60 * 24));
                  return (
                  <Card key={challenge._id} className="card-hover shadow-sm hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200" data-testid={`challenge-${challenge._id}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-600" />
                        {challenge.title}
                      </CardTitle>
                      <CardDescription className="flex items-center justify-between">
                        <span>{challenge.participantCount || 0} participants</span>
                        <Badge variant="outline" className="text-xs">{challenge.difficulty}</Badge>
                      </CardDescription>
                    </CardHeader>
                      <CardContent>
                      <p className="text-sm text-slate-600 mb-2">{challenge.description || 'No description'}</p>
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                        <span>📅 {challenge.duration} days</span>
                        <span>{daysLeft > 0 ? `${daysLeft} days left` : 'Ended'}</span>
                      </div>
                      <Button
                        onClick={async () => {
                          try {
                            await axios.post(`${API}/challenges/${challenge._id}/join`);
                            toast.success('Joined challenge!');
                            fetchChallenges();
                          } catch (error) {
                            toast.error(error.response?.data?.message || 'Failed to join challenge');
                          }
                        }}
                        variant={isParticipating ? 'outline' : 'default'}
                        className={`w-full ${!isParticipating ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : ''}`}
                        disabled={isParticipating || daysLeft < 0}
                        data-testid={`join-challenge-${challenge._id}`}
                      >
                        {isParticipating ? '✓ Participating' : daysLeft < 0 ? 'Challenge Ended' : 'Join Challenge'}
                      </Button>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="friends" className="mt-6">
            <FriendsHub />
          </TabsContent>
        </Tabs>

        {/* Explore Community Dialog */}
        <Dialog open={exploreDialogOpen} onOpenChange={setExploreDialogOpen}>
          <DialogContent className="bg-gradient-to-br from-white to-slate-50 text-slate-900 rounded-2xl shadow-2xl border-0 w-[650px] max-w-full max-h-[85vh] overflow-y-auto">
            {selectedCommunity ? (
              <>
                <DialogHeader className="pb-4 border-b border-slate-200">
                  <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent" style={{fontFamily: 'Space Grotesk'}}>
                    {selectedCommunity.name}
                  </DialogTitle>
                  <DialogDescription className="text-slate-600 text-base mt-2">
                    {selectedCommunity.description}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6 mt-6">
                {/* Community Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-5 bg-gradient-to-br from-emerald-50 to-emerald-100 border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer group">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-3xl font-bold text-emerald-700 group-hover:text-emerald-800 transition-colors">{selectedCommunity.members?.length || 1}</div>
                        <div className="text-sm text-slate-600 font-medium mt-1">Members</div>
                      </div>
                      <Users className="w-10 h-10 text-emerald-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Card>
                  <Card className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer group">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xl font-bold text-blue-700 capitalize group-hover:text-blue-800 transition-colors">{selectedCommunity.category || 'Social'}</div>
                        <div className="text-sm text-slate-600 font-medium mt-1">Category</div>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 text-lg font-bold group-hover:bg-blue-300 transition-colors">
                        {(selectedCommunity.category || 'Social').charAt(0).toUpperCase()}
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Community Members Preview */}
                <Card className="p-5 bg-white border border-slate-200 shadow-md hover:shadow-lg transition-shadow duration-200">
                  <h4 className="font-bold text-slate-800 mb-4 text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-600" />
                    Community Members
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCommunity.members?.slice(0, 8).map((member, idx) => (
                      <div 
                        key={idx}
                        className="px-4 py-2 bg-gradient-to-r from-slate-100 to-slate-200 rounded-full text-sm font-medium text-slate-700 hover:from-emerald-100 hover:to-emerald-200 hover:text-emerald-800 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md transform hover:scale-105"
                      >
                        {typeof member === 'object' ? (member.name || member.username || 'Member') : 'Member'}
                      </div>
                    ))}
                    {selectedCommunity.members?.length > 8 && (
                      <div className="px-4 py-2 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-full text-sm font-bold text-emerald-700 shadow-sm">
                        +{selectedCommunity.members.length - 8} more
                      </div>
                    )}
                  </div>
                </Card>

                {/* Recommendations Section */}
                <Card className="p-5 bg-gradient-to-br from-purple-50 to-pink-50 border-0 shadow-md">
                  <h4 className="font-bold text-slate-800 mb-4 text-lg">Recommendations</h4>
                  <div className="space-y-3">
                    {['Morning Risers', 'Focus Hour', 'Evening Walkers'].map((rec, idx) => {
                      const recCommunity = communities.find(c => c.name === rec);
                      const isJoined = recCommunity && isJoinedCommunity(recCommunity);
                      return (
                      <div 
                        key={idx}
                        className="flex items-center justify-between p-3 bg-white rounded-xl hover:shadow-md transition-all duration-200 cursor-pointer group border border-slate-100 hover:border-purple-200"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold shadow-md">
                            {rec.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800 group-hover:text-purple-700 transition-colors">{rec}</div>
                            <div className="text-xs text-slate-500">
                              {idx === 0 ? 'Early morning routine builders' : idx === 1 ? 'Deep work and Pomodoro' : 'Casual evening walks and steps'}
                            </div>
                          </div>
                        </div>
                        {isJoined ? (
                          <Button 
                            size="sm" 
                            variant="outline"
                            disabled
                            className="px-4 opacity-70 cursor-not-allowed"
                          >
                            Joined ✓
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            onClick={() => recCommunity && handleJoin(recCommunity._id || recCommunity.id)}
                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-md hover:shadow-lg transition-all duration-200 px-4"
                          >
                            Join
                          </Button>
                        )}
                      </div>
                      );
                    })}
                  </div>
                </Card>

                {/* Communities to Explore */}
                <Card className="p-5 bg-white border border-slate-200 shadow-md">
                  <h4 className="font-bold text-slate-800 mb-4 text-lg">Communities to explore</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { name: 'Morning Risers', tag: 'group', color: 'from-orange-400 to-amber-400' },
                      { name: '30-Day Fitness', tag: 'challenge', color: 'from-blue-400 to-cyan-400' }
                    ].map((comm, idx) => {
                      const foundCommunity = communities.find(c => c.name === comm.name);
                      const isJoined = foundCommunity && isJoinedCommunity(foundCommunity);
                      return (
                      <div 
                        key={idx}
                        className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl hover:shadow-lg transition-all duration-200 cursor-pointer border border-slate-200 hover:border-slate-300 group"
                      >
                        <div className="font-semibold text-slate-800 mb-2 group-hover:text-emerald-700 transition-colors">{comm.name}</div>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs px-3 py-1 rounded-full bg-gradient-to-r ${comm.color} text-white font-bold shadow-sm`}>
                            {comm.tag}
                          </span>
                          {isJoined ? (
                            <Button size="sm" variant="ghost" disabled className="text-slate-500 px-3 opacity-70 cursor-not-allowed">
                              Joined ✓
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => foundCommunity && handleJoin(foundCommunity._id || foundCommunity.id)}
                              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors px-3"
                            >
                              Join
                            </Button>
                          )}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </Card>

                <Button 
                  onClick={() => setExploreDialogOpen(false)}
                  className="w-full bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-base font-semibold"
                >
                  Close
                </Button>
              </div>
              </>
            ) : (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
                <p className="text-slate-600">Loading community details...</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default CommunityPage;
