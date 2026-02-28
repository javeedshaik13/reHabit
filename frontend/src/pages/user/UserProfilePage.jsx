import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { User, Mail, Award, Target, Trophy, Calendar, ArrowLeft, Edit2, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { API } from '@/lib/config';

const UserProfilePage = ({ user, onLogout }) => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: '',
    avatarEmoji: ''
  });

  const isOwnProfile = !userId || userId === user._id;
  const cameFromProgressMap = location.state?.from === 'progressMap';
  const returnPath = location.state?.returnTo || '/user/dashboard';

  useEffect(() => {
    fetchUserProfile();
  }, [userId]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      if (isOwnProfile) {
        // Fetch own profile with full details
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API}/users/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProfileUser(response.data);
        setFormData({
          name: response.data.name || '',
          email: response.data.email || '',
          bio: response.data.bio || '',
          avatarEmoji: response.data.avatarEmoji || '🧑'
        });
      } else {
        // Fetch other user's public profile
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API}/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProfileUser(response.data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/users/profile`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Profile updated successfully!');
      setEditing(false);
      fetchUserProfile();
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout user={user} onLogout={onLogout} role="user">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600">Loading profile...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!profileUser) {
    return (
      <Layout user={user} onLogout={onLogout} role="user">
        <div className="text-center py-12">
          <p className="text-slate-600 mb-4">User not found</p>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout} role="user">
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Back Button */}
        {!isOwnProfile && (
          <Button 
            variant="ghost" 
            onClick={() => {
              if (cameFromProgressMap) {
                // Navigate back and set query param to open map
                navigate(`${returnPath}?openMap=true`, { replace: true });
              } else {
                navigate(-1);
              }
            }} 
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        )}

        {/* Profile Header */}
        <Card className="overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-emerald-500 to-teal-600"></div>
          <CardContent className="relative pt-0 pb-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 -mt-16">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center text-6xl border-4 border-white shadow-lg">
                  {formData.avatarEmoji || profileUser.avatarEmoji || profileUser.avatar?.emoji || '🧑'}
                </div>
                {isOwnProfile && editing && (
                  <div className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-lg border border-slate-200">
                    <Input
                      type="text"
                      name="avatarEmoji"
                      value={formData.avatarEmoji}
                      onChange={handleChange}
                      maxLength={2}
                      className="w-12 h-8 text-center text-2xl p-0 border-0"
                      placeholder="😀"
                    />
                  </div>
                )}
              </div>

              {/* User Info */}
              <div className="flex-1 text-center sm:text-left min-w-0">
                {isOwnProfile && editing ? (
                  <Input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="text-2xl font-bold mb-2"
                  />
                ) : (
                  <h1 className="text-3xl font-bold text-slate-800" style={{fontFamily: 'Space Grotesk'}}>
                    {profileUser.name}
                  </h1>
                )}
                {isOwnProfile && (
                  <p className="text-slate-600 flex items-center justify-center sm:justify-start gap-2 mt-1">
                    <Mail className="w-4 h-4" />
                    {profileUser.email}
                  </p>
                )}
                {isOwnProfile && editing ? (
                  <Textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    placeholder="Tell us about yourself..."
                    className="mt-3"
                    rows={3}
                  />
                ) : (
                  profileUser.bio && (
                    <p className="text-slate-600 mt-3 max-w-2xl">
                      {profileUser.bio}
                    </p>
                  )
                )}

                {/* Stats for Other Users - Inline */}
                {!isOwnProfile && (
                  <div className="grid grid-cols-4 gap-3 mt-4">
                    <div className="text-center bg-slate-50 rounded-lg p-3">
                      <p className="text-2xl font-bold text-slate-800">{profileUser.xp || 0}</p>
                      <p className="text-xs text-slate-500 mt-1">Total XP</p>
                    </div>
                    <div className="text-center bg-slate-50 rounded-lg p-3">
                      <p className="text-2xl font-bold text-slate-800">{profileUser.level || 1}</p>
                      <p className="text-xs text-slate-500 mt-1">Level</p>
                    </div>
                    <div className="text-center bg-slate-50 rounded-lg p-3">
                      <p className="text-2xl font-bold text-slate-800">🔥</p>
                      <p className="text-xs text-slate-500 mt-1">{profileUser.streak || 0} Days</p>
                    </div>
                    <div className="text-center bg-slate-50 rounded-lg p-3">
                      <p className="text-2xl font-bold text-slate-800">{profileUser.coins || 0}</p>
                      <p className="text-xs text-slate-500 mt-1">Coins</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Edit Button (Own Profile Only) */}
              {isOwnProfile && (
                <div className="flex gap-2 flex-shrink-0">
                  {editing ? (
                    <>
                      <Button
                        onClick={handleSubmit}
                        disabled={loading}
                        size="sm"
                        className="gap-2 px-4 py-2 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-0 rounded-lg shadow font-semibold transition-all duration-200"
                      >
                        <Save className="w-4 h-4" />
                        Save
                      </Button>
                      <Button
                        onClick={() => setEditing(false)}
                        size="sm"
                        className="gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg font-semibold shadow-sm transition-all duration-200"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => setEditing(true)}
                      size="sm"
                      className="gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white border-0 rounded-lg shadow font-semibold transition-all duration-200"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit Profile
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid - Only for Own Profile */}
        {isOwnProfile && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <Award className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-3xl font-bold text-slate-800">{profileUser.xp || 0}</p>
                <p className="text-sm text-slate-500">Total XP</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Target className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-3xl font-bold text-slate-800">{profileUser.level || 1}</p>
                <p className="text-sm text-slate-500">Level</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl mb-2">🔥</div>
                <p className="text-3xl font-bold text-slate-800">{profileUser.streak || 0}</p>
                <p className="text-sm text-slate-500">Day Streak</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Trophy className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-3xl font-bold text-slate-800">{profileUser.coins || 0}</p>
                <p className="text-sm text-slate-500">Coins</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Badges Section */}
        {(isOwnProfile || (profileUser.badges && profileUser.badges.length > 0)) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-600" />
                Badges & Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profileUser.badges && profileUser.badges.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {profileUser.badges.map((badge, index) => (
                    <div key={index} className="text-center p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                      <div className="text-4xl mb-2">{badge.emoji || '🏆'}</div>
                      <p className="font-semibold text-sm text-slate-800">{badge.name}</p>
                      {badge.description && (
                        <p className="text-xs text-slate-500 mt-1">{badge.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No badges earned yet. Keep building habits!</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Additional Info - Only for Own Profile */}
        {isOwnProfile && (
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-500">Role</Label>
                  <p className="font-medium capitalize">{profileUser.role}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Member Since</Label>
                  <p className="font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {new Date(profileUser.createdAt).toLocaleDateString('en-US', { 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default UserProfilePage;
