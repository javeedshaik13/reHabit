import '@/index.css';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MapPin, Star, UserCheck, Filter, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { API } from '@/lib/config';

const MentorsPage = ({ user, onLogout }) => {
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    // Get user location with a short timeout so it doesn't stall the page
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => console.log('Location access denied'),
        { timeout: 3000, maximumAge: 60000 }
      );
    }
    // Do NOT call fetchMentors() here — the second useEffect handles initial load
  }, []);

  const fetchMentors = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (category !== 'all') params.append('category', category);
      if (ratingFilter !== 'all') params.append('rating', ratingFilter);
      if (onlineOnly) params.append('online', 'true');
      if (userLocation) {
        params.append('lat', userLocation.lat);
        params.append('lng', userLocation.lng);
      }

      const response = await axios.get(`${API}/mentors?${params.toString()}`);
      // normalize backend user-shaped mentor objects to a consistent UI shape
      const normalized = (response.data || []).map((m) => ({
        _id: m._id,
        name: m.name || (m.userId && m.userId.name) || 'Unknown Mentor',
        avatar: m.avatar || (m.userId && m.userId.profile?.avatar) || '',
        bio: m.bio || (m.userId && m.userId.bio) || '',
        specialization: m.mentorProfile?.specialization || m.specialization || (m.userId && m.userId.mentorProfile?.specialization) || [],
        rating: m.mentorProfile?.rating || m.stats?.rating || (m.userId && m.userId.mentorProfile?.rating) || 0,
        totalReviews: m.mentorProfile?.totalReviews || m.stats?.totalReviews || 0,
        activeMentees: m.mentorProfile?.currentClients || m.stats?.activeMentees || 0,
        maxMentees: m.mentorProfile?.maxClients || m.maxMentees || 10,
        isOnline: m.mentorProfile?.isOnline || false,
        location: m.mentorProfile?.location || m.location || null,
        distance: m.distance, // preserved if computed server-side
      }));
      console.log('Fetched mentors (normalized):', normalized);
      setMentors(normalized);
    } catch (error) {
      console.error('Error fetching mentors:', error);
      toast.error('Failed to load mentors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMentors();
  }, [category, ratingFilter, onlineOnly]); // userLocation excluded — it triggers via its own effect above when resolved

  const handleSearch = (e) => {
    e.preventDefault();
    fetchMentors();
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < Math.floor(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`}
      />
    ));
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
      <div className="space-y-4 sm:space-y-6 mt-3 sm:mt-5 px-1 sm:px-0" data-testid="mentors-page">
        {/* Header */}
        <div className="flex flex-row items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-4xl font-bold text-slate-800 truncate" style={{ fontFamily: 'Rethink Sans, sans-serif' }}>Find a Mentor</h1>
            <p className="text-slate-600 mt-0.5 text-xs sm:text-base" style={{ fontFamily: 'Spectral, serif' }}>Connect with experienced mentors to guide your journey</p>
          </div>
          <Link to="/user/mentors/requests" className="shrink-0">
            <Button className="gap-2 bg-gradient-to-br from-emerald-500 to-teal-600 hover:opacity-90 text-white border-0 shadow-md text-sm sm:text-base px-3 py-2 sm:px-4 sm:py-2.5">
              <UserCheck className="w-4 h-4" />
              <span className="hidden xs:inline sm:inline">My Requests</span>
              <span className="sm:hidden">Requests</span>
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card className="shadow-sm border border-slate-200">
          <CardContent className="pt-4 pb-4 px-4 sm:pt-5 sm:pb-5 sm:px-6">
            <form onSubmit={handleSearch} className="space-y-3">
              {/* Search bar with inline button */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    placeholder="Search mentors by name or skill..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 pr-3 h-10"
                    data-testid="search-input"
                  />
                </div>
                <Button
                  type="submit"
                  className="h-10 px-4 bg-gradient-to-br from-emerald-500 to-teal-600 hover:opacity-90 text-white border-0 shadow-sm font-semibold shrink-0"
                  data-testid="search-btn"
                >
                  <Search className="w-4 h-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Search</span>
                </Button>
              </div>

              {/* Filter chips row */}
              <div className="flex flex-wrap gap-2 items-center">
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-9 text-xs sm:text-sm w-auto min-w-[120px]" data-testid="category-filter">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="fitness">Fitness</SelectItem>
                    <SelectItem value="productivity">Productivity</SelectItem>
                    <SelectItem value="mindfulness">Mindfulness</SelectItem>
                    <SelectItem value="health">Health</SelectItem>
                    <SelectItem value="mental-wellness">Mental Wellness</SelectItem>
                    <SelectItem value="learning">Learning</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={ratingFilter} onValueChange={setRatingFilter}>
                  <SelectTrigger className="h-9 text-xs sm:text-sm w-auto min-w-[110px]" data-testid="rating-filter">
                    <SelectValue placeholder="Min Rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ratings</SelectItem>
                    <SelectItem value="4">4+ Stars</SelectItem>
                    <SelectItem value="4.5">4.5+ Stars</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  size="sm"
                  variant={onlineOnly ? 'default' : 'outline'}
                  onClick={() => setOnlineOnly(!onlineOnly)}
                  className={`h-9 text-xs sm:text-sm gap-1.5 ${onlineOnly ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-0' : ''}`}
                  data-testid="online-filter"
                >
                  <Filter className="w-3.5 h-3.5" />
                  {onlineOnly ? 'Online Only' : 'All Status'}
                </Button>

                {(category !== 'all' || ratingFilter !== 'all' || onlineOnly || search) && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-9 text-xs sm:text-sm text-slate-500 hover:text-red-500"
                    onClick={() => { setCategory('all'); setRatingFilter('all'); setOnlineOnly(false); setSearch(''); }}
                  >
                    ✕ Clear all
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Mentors Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {mentors.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-16 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-5">
                  <Users className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">No mentors found</h3>
                <p className="text-slate-500 mb-6 max-w-xs mx-auto">
                  {category !== 'all' || ratingFilter !== 'all' || onlineOnly || search
                    ? 'Try adjusting your filters or search criteria'
                    : 'Be the first mentor! Register as a mentor to help others.'}
                </p>
                {(category !== 'all' || ratingFilter !== 'all' || onlineOnly || search) && (
                  <Button 
                    onClick={() => {
                      setCategory('all');
                      setRatingFilter('all');
                      setOnlineOnly(false);
                      setSearch('');
                    }}
                    className="bg-gradient-to-br from-emerald-500 to-teal-600 hover:opacity-90 text-white border-0 shadow-sm"
                  >
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            mentors.map((mentor) => (
              <Card key={mentor._id} className="card-hover shadow-sm hover:shadow-md border border-slate-200 rounded-xl overflow-hidden transition-all duration-200" data-testid={`mentor-card-${mentor._id}`}>
                <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
                  <div className="flex items-start gap-3">
                    <img
                      src={mentor.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(mentor.name || 'Mentor')}&background=10b981&color=fff`}
                      alt={mentor.name}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover ring-2 ring-emerald-100 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base sm:text-lg truncate">{mentor.name}</CardTitle>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="flex">{renderStars(mentor.rating || 0)}</div>
                        <span className="text-xs text-slate-500">({mentor.totalReviews || 0})</span>
                      </div>
                    </div>
                    {mentor.isOnline && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs shrink-0">Online</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 pb-4 sm:pb-5">
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap gap-1.5">
                      {mentor.specialization?.slice(0, 3).map((spec) => (
                        <Badge key={spec} variant="secondary" className="text-xs">{spec}</Badge>
                      ))}
                    </div>

                    <p className="text-sm text-slate-600 line-clamp-2">
                      {mentor.bio || 'No bio available'}
                    </p>

                    {typeof mentor.distance === 'number' && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{mentor.distance.toFixed(1)} km away</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{mentor.activeMentees || 0} / {mentor.maxMentees} mentees</span>
                    </div>

                    <Link to={`/user/mentors/${mentor._id}`} className="block mt-3">
                      <Button
                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold shadow-sm hover:shadow-md transition-all duration-200 py-2"
                        data-testid={`view-mentor-${mentor._id}`}
                      >
                        View Profile
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
};

export default MentorsPage;
