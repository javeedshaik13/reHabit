import '@/index.css';
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Calendar, Users, TrendingUp, XCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { API } from '@/lib/config';

const MySubscriptions = ({ user, onLogout }) => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      console.log('Fetching subscriptions from:', `${API}/mentor-plans/subscriptions`);
      const response = await axios.get(`${API}/mentor-plans/subscriptions`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      console.log('Subscriptions response:', response.data);
      setSubscriptions(response.data || []);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      console.error('Error details:', error.response?.data);
      if (error.response?.status === 404) {
        toast.error('Subscriptions endpoint not found');
      } else if (error.response?.status === 401) {
        toast.error('Please log in to view subscriptions');
      } else {
        toast.error(error.response?.data?.message || 'Failed to load subscriptions');
      }
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async (subscriptionId) => {
    setCancelling(subscriptionId);
    try {
      await axios.post(
        `${API}/mentor-plans/subscriptions/${subscriptionId}/cancel`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      toast.success('Subscription cancelled successfully');
      fetchSubscriptions();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast.error('Failed to cancel subscription');
    } finally {
      setCancelling(null);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      active: 'bg-emerald-500',
      pending: 'bg-yellow-500',
      cancelled: 'bg-red-500',
      expired: 'bg-slate-500'
    };
    return (
      <Badge className={`${variants[status]} text-white`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const calculateSessionProgress = (used, total) => {
    return (used / total) * 100;
  };

  const getDaysRemaining = (endDate) => {
    const days = Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <Layout user={user} onLogout={onLogout} role="user">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
        </div>
      </Layout>
    );
  }

  if (!loading && subscriptions.length === 0) {
    return (
      <Layout user={user} onLogout={onLogout} role="user">
        <div className="space-y-6 mt-5">
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Rethink Sans, sans-serif' }}>My Subscriptions</h1>
          <Card className="border border-slate-200 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center text-center py-16 px-6">
              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-5">
                <Users className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-semibold text-slate-700 mb-2">No Active Subscriptions</h3>
              <p className="text-slate-500 max-w-xs mb-6">
                You don't have any mentor subscriptions yet. Browse available mentors and choose a plan to get started!
              </p>
              <Button
                onClick={() => window.location.href = '/user/mentors'}
                className="gap-2 px-6 py-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-0 rounded-xl shadow-md font-semibold transition-all duration-200"
              >
                Browse Mentors
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout} role="user">
      <div className="space-y-6 mt-5">
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'Rethink Sans, sans-serif' }}>My Subscriptions</h1>
        <p className="text-slate-600" style={{ fontFamily: 'Spectral, serif' }}>Manage your mentor subscriptions and track your progress</p>

        <div className="grid gap-6">
          {subscriptions.map((subscription) => {
            const sessionProgress = calculateSessionProgress(
              subscription.sessionsUsed,
              subscription.sessionsTotal
            );
            const daysRemaining = getDaysRemaining(subscription.endDate);

            return (
              <Card key={subscription._id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-2xl">
                        {subscription.mentorId?.name || 'Mentor'}
                      </CardTitle>
                      {getStatusBadge(subscription.status)}
                    </div>
                    <CardDescription className="text-base">
                      {subscription.planId?.displayName} Plan
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-emerald-600">
                      ${subscription.planId?.price}
                    </div>
                    <div className="text-sm text-slate-500">per month</div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Session Progress */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      <span className="font-medium">Session Progress</span>
                    </div>
                    <span className="text-sm text-slate-600">
                      {subscription.sessionsUsed} of {subscription.sessionsTotal} used
                    </span>
                  </div>
                  <Progress value={sessionProgress} className="h-2" />
                  <p className="text-xs text-slate-500 mt-1">
                    {subscription.sessionsTotal - subscription.sessionsUsed} sessions remaining
                  </p>
                </div>

                {/* Subscription Details */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-emerald-600" />
                    <div>
                      <div className="text-xs text-slate-500">Start Date</div>
                    <div className="font-medium">
                      {formatDate(subscription.startDate)}
                    </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-emerald-600" />
                    <div>
                      <div className="text-xs text-slate-500">End Date</div>
                    <div className="font-medium">
                      {formatDate(subscription.endDate)}
                    </div>
                    </div>
                  </div>
                </div>

                {/* Days Remaining Badge */}
                {subscription.status === 'active' && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <span className="font-medium text-emerald-700">
                      {daysRemaining} days remaining in your subscription
                    </span>
                  </div>
                )}

                {/* Additional Members */}
                {subscription.additionalMembers && subscription.additionalMembers.length > 0 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-blue-700">Additional Members</span>
                    </div>
                    <div className="text-sm text-slate-600">
                      {subscription.additionalMembers.length} {subscription.additionalMembers.length === 1 ? 'person' : 'people'} included in this plan
                    </div>
                  </div>
                )}

                {/* Auto Renewal */}
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Auto-renewal</span>
                  </div>
                  <Badge variant={subscription.autoRenew ? 'default' : 'secondary'}>
                    {subscription.autoRenew ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>

                {/* Actions */}
                {subscription.status === 'active' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        className="w-full"
                        disabled={cancelling === subscription._id}
                      >
                        {cancelling === subscription._id ? (
                          <span className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Cancelling...
                          </span>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 mr-2" />
                            Cancel Subscription
                          </>
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-white max-w-md">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold text-slate-900">
                          Cancel Subscription?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-600 space-y-3 pt-2">
                          <p>
                            Are you sure you want to cancel your subscription with <span className="font-semibold text-slate-900">{subscription.mentorId?.name}</span>?
                          </p>
                          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 my-3">
                            <p className="text-emerald-800 text-sm font-medium">
                              💰 You'll receive a prorated refund for the remaining {daysRemaining} days of your subscription.
                            </p>
                          </div>
                          <p className="text-sm text-slate-500">
                            Please note: You'll lose access to all remaining sessions, mentor resources, and benefits immediately after cancellation.
                          </p>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="gap-2 sm:gap-2">
                        <AlertDialogCancel className="mt-0"><button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => window.location.href = '/user/mentors'}>Keep Subscription</button></AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleCancelSubscription(subscription._id)}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          Yes, Cancel
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </Layout>
  );
};

export default MySubscriptions;
