import '@/index.css';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Target, Flame, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:4000';
const API = `${BACKEND_URL}/api`;

const HabitManagement = ({ user, onLogout }) => {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    frequency: 'daily'
  });

  useEffect(() => {
    fetchHabits();
  }, []);

  const fetchHabits = async () => {
    try {
      const response = await axios.get(`${API}/habits`);
      setHabits(response.data);
    } catch (error) {
      toast.error('Failed to load habits');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/habits`, formData);
      setHabits([...habits, response.data]);
      toast.success(`Habit created! Categorized as: ${response.data.category}`);
      setDialogOpen(false);
      setFormData({ title: '', description: '', frequency: 'daily' });
    } catch (error) {
      toast.error('Failed to create habit');
    }
  };

  const handleDelete = async (habitId) => {
    if (!window.confirm('Are you sure you want to delete this habit?')) return;
    
    try {
      await axios.delete(`${API}/habits/${habitId}`);
      setHabits(habits.filter(h => h._id !== habitId));
      toast.success('Habit deleted');
    } catch (error) {
      toast.error('Failed to delete habit');
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
      <div className="container space-y-6 mt-5" data-testid="habit-management-page">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-slate-800" style={{ fontFamily: 'Rethink Sans, sans-serif' }}>My Habits</h1>
            <p className="text-slate-600 mt-1" style={{ fontFamily: 'Spectral, serif' }}>Build and track your daily routines</p>
          </div>
          <div>
            <Button
              className="gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md hover:shadow-lg hover:opacity-90 transition-all duration-200 whitespace-nowrap"
              data-testid="open-add-habit-dialog"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="w-4 h-4 shrink-0" />
              Add New Habit
            </Button>

            {dialogOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                {/* overlay - lighter and theme-aware (removed heavy black) */}
                <div
                  className="absolute inset-0 bg-white/40 dark:bg-slate-800/20 backdrop-blur-sm"
                  onClick={() => setDialogOpen(false)}
                  aria-hidden="true"
                />
                {/* panel */}
                <div className="relative z-10 w-full max-w-lg mx-4">
                  <div className="bg-white rounded-2xl shadow-2xl p-6 border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">Create New Habit</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-900">AI will automatically categorize your habit</p>
                      </div>
                      <button
                        type="button"
                        aria-label="Close"
                        onClick={() => setDialogOpen(false)}
                        className="text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white"
                      >
                        ×
                      </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Habit Title</Label>
                        <Input
                          id="title"
                          name="title"
                          placeholder="e.g., Morning meditation, Daily workout"
                          value={formData.title}
                          onChange={handleChange}
                          required
                          data-testid="habit-title-input"
                          className="  border border-slate-200 dark:border-slate-700 text-slate-900 placeholder-slate-500 dark:placeholder-slate-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Textarea
                          id="description"
                          name="description"
                          placeholder="Add details about your habit..."
                          value={formData.description}
                          onChange={handleChange}
                          data-testid="habit-description-input"
                          className="bg-slate-50 border border-slate-200 dark:border-slate-700 text-slate-900 placeholder-slate-500 dark:placeholder-slate-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="frequency">Frequency</Label>
                        <Select value={formData.frequency} onValueChange={(value) => setFormData({...formData, frequency: value})}>
                          <SelectTrigger data-testid="habit-frequency-select" className="bg-slate-50  border border-slate-200 dark:border-slate-700 text-slate-900 ">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button type="submit" className="w-full" data-testid="submit-habit-btn">Create Habit</Button>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {habits.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Target className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-semibold text-slate-700 mb-2">No habits yet</h3>
                <p className="text-slate-500 mb-4">Create your first habit to get started</p>
                <Button onClick={() => setDialogOpen(true)} data-testid="create-first-habit-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Habit
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {habits.map((habit) => (
              <Card
                key={habit._id}
                className="card-hover hover:shadow-xl hover:scale-[1.02] transition-transform duration-200 cursor-pointer"
                data-testid={`habit-card-${habit._id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{habit.title}</CardTitle>
                      <div className="mt-2">
                        <span className="pill">{habit.category || 'General'}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(habit._id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      data-testid={`delete-habit-${habit._id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {habit.description && (
                    <p className="text-sm text-slate-600 mb-4">{habit.description}</p>
                  )}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 flex items-center gap-1">
                        <Flame className="w-4 h-4 text-orange-500" />
                        Current Streak
                      </span>
                      <span className="font-semibold text-slate-800">{habit.streak} days</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 flex items-center gap-1">
                        <Target className="w-4 h-4 text-emerald-600" />
                        Total Completions
                      </span>
                      <span className="font-semibold text-slate-800">{habit.total_completions}</span>
                    </div>
                  </div>
                  <Link to={`/user/habits/${habit._id}`}>
                    <Button
                      variant="outline"
                      data-testid={`view-habit-${habit._id}`}
                      className="w-full flex items-center justify-center gap-2 border border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 transition-colors"
                    >
                      <Target className="w-4 h-4 text-emerald-600" />
                      <span className="font-medium">View Details</span>
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default HabitManagement;