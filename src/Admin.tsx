import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  Plus, 
  Settings, 
  LogOut, 
  Search, 
  Filter, 
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  X as CloseIcon,
  Save,
  Image as ImageIcon,
  DollarSign,
  Star as StarIcon,
  TrendingUp,
  Megaphone,
  Tag,
  List,
  ChevronRight,
  BarChart3
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { Course } from './data/courses';
import { analyticsService } from './services/analyticsService';
import { courseService } from './services/courseService';
import { settingsService, AppSettings } from './services/settingsService';

import { auth } from './firebase';
import { LogIn as LoginIcon, AlertTriangle } from 'lucide-react';

export default function AdminDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [courses, setCourses] = useState<Course[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [fileImagesPreviews, setFileImagesPreviews] = useState<string[]>([]);
  
  // Settings State
  const [settings, setSettings] = useState<AppSettings>(settingsService.getDefaultSettings());

  // Analytics State
  const [timeframe, setTimeframe] = useState(7);
  const [selectedCourseId, setSelectedCourseId] = useState<string | 'all'>('all');
  const [chartData, setChartData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<{ course: Course; count: number }[]>([]);
  const [trafficSourceStats, setTrafficSourceStats] = useState<{ source: string; count: number }[]>([]);

  const navigate = useNavigate();

  useEffect(() => {
    const updateAnalytics = async () => {
      const data = await analyticsService.getClickDataForChart(timeframe, selectedCourseId === 'all' ? undefined : selectedCourseId);
      setChartData(data);
      
      const top = await analyticsService.getTopProducts(5);
      const topWithDetails = top.map(t => {
        const course = courses.find(c => c.id === t.courseId);
        return {
          course: course || { id: t.courseId, title: 'Unknown Course', price: '0', originalPrice: '0', rating: 0, reviews: 0, image: '', category: 'Unknown', additionalChoices: '' } as Course,
          count: t.count
        };
      }).filter(t => t.course);
      setTopProducts(topWithDetails);

      const stats = await analyticsService.getTrafficSourceStats();
      setTrafficSourceStats(stats);
    };

    updateAnalytics();
    window.addEventListener('analytics-updated', updateAnalytics);
    return () => window.removeEventListener('analytics-updated', updateAnalytics);
  }, [timeframe, selectedCourseId, courses]);

  useEffect(() => {
    const loadInitialData = async () => {
      const [fetchedCourses, fetchedSettings] = await Promise.all([
        courseService.getCourses(),
        settingsService.getSettings()
      ]);
      setCourses(fetchedCourses);
      setSettings(fetchedSettings);
    };

    const handleCoursesUpdate = async () => {
      const fetchedCourses = await courseService.getCourses();
      setCourses(fetchedCourses);
    };

    window.addEventListener('courses-updated', handleCoursesUpdate);
    loadInitialData();
    return () => window.removeEventListener('courses-updated', handleCoursesUpdate);
  }, []);

  const filteredCourses = courses.filter(course => 
    course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleLogout = async () => {
    await auth.signOut();
    sessionStorage.removeItem('admin_session');
    window.dispatchEvent(new Event('admin-logout'));
    toast.success('Logged out successfully');
    navigate('/admin');
  };

  const handleDelete = async (id: string | number) => {
    if (confirm('Are you sure you want to delete this course?')) {
      await courseService.deleteCourse(id);
      toast.success('Course deleted successfully');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGalleryImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setGalleryPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFileImagesPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const additionalChoices = formData.get('additionalChoices') as string;
    
    const galleryFromText = (formData.get('gallery') as string || '').split('\n').filter(Boolean);
    const fileImagesFromText = (formData.get('fileImages') as string || '').split('\n').filter(Boolean);

    const newCourse = {
      title: formData.get('title') as string,
      category: formData.get('category') as string,
      price: `$${formData.get('price')}`,
      originalPrice: `$${formData.get('originalPrice')}`,
      rating: Number(formData.get('rating')),
      reviews: 0,
      image: previewImage || formData.get('image') as string || 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=600&fit=crop',
      additionalChoices: additionalChoices === 'None' ? '' : additionalChoices,
      sourceUrl: formData.get('sourceUrl') as string || '',
      about: formData.get('about') as string || '',
      objectives: (formData.get('objectives') as string || '').split('\n').filter(Boolean),
      gallery: [...galleryFromText, ...galleryPreviews],
      fileImages: [...fileImagesFromText, ...fileImagesPreviews]
    };
    try {
      const result = await courseService.addCourse(newCourse);
      if (result && (result as any).error) {
        throw (result as any).error;
      }
      setIsAddModalOpen(false);
      setPreviewImage(null);
      setGalleryPreviews([]);
      setFileImagesPreviews([]);
      toast.success('Course added successfully!');
    } catch (error: any) {
      console.error('Failed to add course:', error);
      toast.error(`Failed to add course: ${error.message || 'Please check your database connection.'}`);
    }
  };

  const handleEditCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const additionalChoices = formData.get('additionalChoices') as string;
    
    const galleryFromText = (formData.get('gallery') as string || '').split('\n').filter(Boolean);
    const fileImagesFromText = (formData.get('fileImages') as string || '').split('\n').filter(Boolean);

    const updatedCourse = {
      ...editingCourse,
      title: formData.get('title') as string,
      category: formData.get('category') as string,
      price: `$${formData.get('price')}`,
      originalPrice: `$${formData.get('originalPrice')}`,
      rating: Number(formData.get('rating')),
      image: previewImage || formData.get('image') as string || editingCourse.image,
      additionalChoices: additionalChoices === 'None' ? '' : additionalChoices,
      sourceUrl: formData.get('sourceUrl') as string || '',
      about: formData.get('about') as string || '',
      objectives: (formData.get('objectives') as string || '').split('\n').filter(Boolean),
      gallery: [...galleryFromText, ...galleryPreviews],
      fileImages: [...fileImagesFromText, ...fileImagesPreviews]
    };

    try {
      const result = await courseService.updateCourse(updatedCourse);
      if (result && (result as any).error) {
        throw (result as any).error;
      }
      setEditingCourse(null);
      setPreviewImage(null);
      setGalleryPreviews([]);
      setFileImagesPreviews([]);
      toast.success('Course updated successfully!');
    } catch (error: any) {
      console.error('Failed to update course:', error);
      toast.error(`Failed to update course: ${error.message || 'Please check your database connection.'}`);
    }
  };

  const renderDashboard = () => (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {[
          { label: 'Total Clicks', value: chartData.reduce((acc, curr) => acc + curr.clicks, 0), icon: BarChart3, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Last 24h', value: chartData.length > 0 ? chartData[chartData.length - 1].clicks : 0, icon: Clock, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Last 7 Days', value: chartData.slice(-7).reduce((acc, curr) => acc + curr.clicks, 0), icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Last 30 Days', value: chartData.slice(-30).reduce((acc, curr) => acc + curr.clicks, 0), icon: CheckCircle, color: 'text-amber-600', bg: 'bg-amber-50' }
        ].map((stat, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>
              <div className={`rounded-lg ${stat.bg} p-3`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Click Chart */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Click Analytics</h2>
              <p className="text-sm text-slate-500">Overview of user engagement</p>
            </div>
            <div className="flex items-center gap-3">
              <select 
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium focus:outline-none"
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
              >
                <option value="all">All Courses</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
              <select 
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium focus:outline-none"
                value={timeframe}
                onChange={(e) => setTimeframe(Number(e.target.value))}
              >
                <option value={7}>Last 7 Days</option>
                <option value={30}>Last 30 Days</option>
              </select>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="clicks" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorClicks)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products Ranking */}
        <div className="space-y-8">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-lg font-bold text-slate-900">Top Clicked Courses</h2>
            <div className="space-y-4">
              {topProducts.length > 0 ? topProducts.map((item, i) => (
                <div key={item.course.id} className="flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600">
                    {i + 1}
                  </div>
                  <img 
                    src={item.course.image || null} 
                    alt={item.course.title} 
                    className="h-10 w-10 rounded-lg object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-bold text-slate-900">{item.course.title}</p>
                    <p className="text-xs text-slate-500">{item.count} clicks</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BarChart3 className="mb-2 h-12 w-12 text-slate-200" />
                  <p className="text-sm text-slate-500">No click data available yet</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-lg font-bold text-slate-900">Traffic Sources</h2>
            <div className="space-y-4">
              {trafficSourceStats.length > 0 ? trafficSourceStats.map((stat, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                    <span className="text-sm font-medium text-slate-700">{stat.source}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900">{stat.count}</span>
                </div>
              )) : (
                <p className="text-center text-sm text-slate-500 py-4">No traffic source data available</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="max-w-4xl space-y-8">
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-blue-50 p-2">
            <Megaphone className="h-5 w-5 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Announcements & Offers</h2>
        </div>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Global Announcement</label>
            <textarea 
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
              rows={3}
              value={settings.announcement}
              onChange={(e) => setSettings({ ...settings, announcement: e.target.value })}
              placeholder="Enter announcement text..."
            />
          </div>
          
          <button 
            onClick={async () => {
              await settingsService.updateSettings(settings);
              toast.success('Announcements updated successfully');
            }}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-blue-700 active:scale-95"
          >
            <Save className="h-4 w-4" />
            Update Content
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-purple-50 p-2">
            <Tag className="h-5 w-5 text-purple-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Manage Categories</h2>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {settings.categories.map((cat, i) => (
              <div key={i} className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">
                {cat}
                <button 
                  onClick={() => setSettings({ ...settings, categories: settings.categories.filter(c => c !== cat) })}
                  className="text-slate-400 hover:text-red-500"
                >
                  <CloseIcon className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          
          <div className="flex gap-2">
            <input 
              type="text"
              id="new-category"
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
              placeholder="Add new category..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = (e.target as HTMLInputElement).value;
                  if (val && !settings.categories.includes(val)) {
                    setSettings({ ...settings, categories: [...settings.categories, val] });
                    (e.target as HTMLInputElement).value = '';
                  }
                }
              }}
            />
            <button 
              onClick={() => {
                const input = document.getElementById('new-category') as HTMLInputElement;
                if (input.value && !settings.categories.includes(input.value)) {
                  setSettings({ ...settings, categories: [...settings.categories, input.value] });
                  input.value = '';
                }
              }}
              className="rounded-xl bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-800"
            >
              Add
            </button>
          </div>
          <div className="pt-4">
            <button 
              onClick={async () => {
                await settingsService.updateSettings(settings);
                toast.success('Categories updated successfully');
              }}
              className="flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-purple-700 active:scale-95"
            >
              <Save className="h-4 w-4" />
              Save Categories
            </button>
          </div>
        </div>
      </div>

      {/* Manage Coupons Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-amber-50 p-2">
            <Tag className="h-5 w-5 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Manage Coupons</h2>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Coupon Code</label>
              <input 
                type="text"
                id="new-coupon-code"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                placeholder="e.g. SAVE50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Discount (%)</label>
              <input 
                type="number"
                id="new-coupon-discount"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                placeholder="e.g. 50"
              />
            </div>
            <div className="flex items-end">
              <button 
                type="button"
                onClick={() => {
                  const codeInput = document.getElementById('new-coupon-code') as HTMLInputElement;
                  const discountInput = document.getElementById('new-coupon-discount') as HTMLInputElement;
                  const code = codeInput.value.toUpperCase().trim();
                  const discount = Number(discountInput.value);
                  
                  if (code && discount > 0) {
                    if ((settings.coupons || []).some(c => c.code === code)) {
                      toast.error('Coupon code already exists');
                      return;
                    }
                    const newCoupons = [...(settings.coupons || []), { code, discount, isActive: true }];
                    setSettings({ ...settings, coupons: newCoupons });
                    codeInput.value = '';
                    discountInput.value = '';
                    toast.success('Coupon added to list');
                  } else {
                    toast.error('Please enter a valid code and discount');
                  }
                }}
                className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white hover:bg-slate-800"
              >
                Add Coupon
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3">Code</th>
                  <th className="px-6 py-3">Discount</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(settings.coupons || []).map((coupon, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4 font-bold text-slate-900">{coupon.code}</td>
                    <td className="px-6 py-4 text-slate-600">{coupon.discount}%</td>
                    <td className="px-6 py-4">
                      <button 
                        type="button"
                        onClick={() => {
                          const newCoupons = (settings.coupons || []).map((c, idx) => 
                            idx === i ? { ...c, isActive: !c.isActive } : c
                          );
                          setSettings({ ...settings, coupons: newCoupons });
                        }}
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${coupon.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}
                      >
                        {coupon.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        type="button"
                        onClick={() => {
                          const newCoupons = (settings.coupons || []).filter((_, idx) => idx !== i);
                          setSettings({ ...settings, coupons: newCoupons });
                        }}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {(!settings.coupons || settings.coupons.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">No coupons created yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="pt-4">
            <button 
              type="button"
              onClick={async () => {
                await settingsService.updateSettings(settings);
                toast.success('Coupons saved successfully');
              }}
              className="flex items-center gap-2 rounded-xl bg-amber-600 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-amber-700 active:scale-95"
            >
              <Save className="h-4 w-4" />
              Save All Coupons
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Toaster position="top-right" richColors />
      
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-blue-600">
            <BookOpen className="h-6 w-6" />
            <span>Course Hunt</span>
          </Link>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Admin Panel</p>
        </div>

        <nav className="mt-4 px-4">
          <div className="space-y-1">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('courses')}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${activeTab === 'courses' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <List className="h-4 w-4" />
              Courses
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
          </div>
        </nav>

        <div className="absolute bottom-0 w-64 border-t border-slate-200 p-4">
          <button 
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-md">
          <div className="flex items-center justify-between px-8 py-4">
            <h1 className="text-xl font-bold text-slate-900">
              {activeTab === 'dashboard' ? 'Admin Overview' : activeTab === 'courses' ? 'Manage Courses' : 'Panel Settings'}
            </h1>
            <div className="flex items-center gap-4">
              {activeTab === 'courses' && (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search courses..." 
                      className="w-64 rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-blue-700 hover:shadow-lg active:scale-95"
                  >
                    <Plus className="h-4 w-4" />
                    Add New Course
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="p-8">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'settings' && renderSettings()}
          
          {activeTab === 'courses' && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/50 px-6 py-4">
                <h2 className="font-bold text-slate-900">Course List</h2>
                <button 
                  onClick={() => toast.info('Filtering coming soon')}
                  className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"
                >
                  <Filter className="h-4 w-4" />
                  Filter
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      <th className="px-6 py-4">Course</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Price</th>
                      <th className="px-6 py-4">Rating</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCourses.map((course) => (
                      <tr key={course.id} className="group transition-colors hover:bg-slate-50/50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img 
                              src={course.image || null} 
                              alt={course.title} 
                              className="h-10 w-10 rounded-lg object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <p className="font-bold text-slate-900">{course.title}</p>
                              <p className="text-xs text-slate-500">ID: #{course.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                            {course.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-900">{course.price}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-slate-900">{course.rating}</span>
                            <span className="text-slate-400">({course.reviews})</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-green-600">
                            <div className="h-1.5 w-1.5 rounded-full bg-green-600"></div>
                            <span className="text-xs font-bold uppercase tracking-wider">Published</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                            <Link to={`/course/${course.id}`} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-600" title="View">
                              <Eye className="h-4 w-4" />
                            </Link>
                            <button 
                              onClick={() => {
                                setEditingCourse(course);
                                setPreviewImage(course.image);
                                setGalleryPreviews([]);
                                setFileImagesPreviews([]);
                              }}
                              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600" 
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(course.id)}
                              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600" 
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Add/Edit Course Modal */}
      {(isAddModalOpen || editingCourse) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between sticky top-0 bg-white z-10 pb-4 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">
                {editingCourse ? 'Edit Course' : 'Add New Course'}
              </h2>
              <button 
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingCourse(null);
                  setPreviewImage(null);
                  setGalleryPreviews([]);
                  setFileImagesPreviews([]);
                }}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={editingCourse ? handleEditCourse : handleAddCourse} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Course Title</label>
                    <input 
                      name="title" 
                      required 
                      defaultValue={editingCourse?.title}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                      placeholder="e.g. Master React in 30 Days"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-slate-700">Category</label>
                      <select 
                        name="category" 
                        defaultValue={editingCourse?.category}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                      >
                        {settings.categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-slate-700">Rating (1-5)</label>
                      <div className="relative">
                        <StarIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input 
                          name="rating" 
                          type="number" 
                          min="1" 
                          max="5" 
                          defaultValue={editingCourse?.rating || 5}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-slate-700">Price</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input 
                          name="price" 
                          type="number" 
                          required 
                          defaultValue={editingCourse?.price.replace('$', '')}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                          placeholder="19.99"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-slate-700">Original Price</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input 
                          name="originalPrice" 
                          type="number" 
                          defaultValue={editingCourse?.originalPrice.replace('$', '')}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                          placeholder="89.99"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Thumbnail</label>
                    <div className="flex items-center gap-4">
                      <div className="relative h-20 w-20 overflow-hidden rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
                        {previewImage ? (
                          <img src={previewImage || null} alt="Preview" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ImageIcon className="h-6 w-6 text-slate-400" />
                          </div>
                        )}
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleImageChange}
                          className="absolute inset-0 cursor-pointer opacity-0"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-xs text-slate-500">Upload a thumbnail or provide a URL below</p>
                        <div className="relative">
                          <ImageIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input 
                            name="image" 
                            defaultValue={editingCourse?.image}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                            placeholder="https://images.unsplash.com/..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Source Link (Optional)</label>
                    <div className="relative">
                      <Plus className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input 
                        name="sourceUrl" 
                        defaultValue={editingCourse?.sourceUrl}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                        placeholder="e.g. https://mega.nz/..."
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Display Tag</label>
                    <select 
                      name="additionalChoices" 
                      defaultValue={editingCourse?.additionalChoices || 'None'}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                    >
                      <option value="None">None</option>
                      <option value="Popular">Popular</option>
                      <option value="New">New</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">About This Course</label>
                    <textarea 
                      name="about" 
                      rows={4}
                      defaultValue={editingCourse?.about}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                      placeholder="Describe what this course is about..."
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Course Objectives (One per line)</label>
                    <textarea 
                      name="objectives" 
                      rows={3}
                      defaultValue={editingCourse?.objectives?.join('\n')}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none font-mono"
                      placeholder="Master React fundamentals&#10;Build real-world projects&#10;..."
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Gallery Images</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {galleryPreviews.map((p, i) => (
                        <div key={i} className="relative h-12 w-12 rounded-lg overflow-hidden border border-slate-200">
                          <img src={p || null} alt="Preview" className="h-full w-full object-cover" />
                          <button 
                            type="button"
                            onClick={() => setGalleryPreviews(prev => prev.filter((_, idx) => idx !== i))}
                            className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl-lg"
                          >
                            <CloseIcon className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input 
                          type="file" 
                          multiple
                          accept="image/*" 
                          onChange={handleGalleryImagesChange}
                          className="absolute inset-0 cursor-pointer opacity-0"
                        />
                        <button type="button" className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs font-medium text-slate-600 hover:bg-slate-100">
                          <Plus className="h-3 w-3" /> Upload Images
                        </button>
                      </div>
                    </div>
                    <textarea 
                      name="gallery" 
                      rows={2}
                      defaultValue={editingCourse?.gallery?.join('\n')}
                      className="w-full mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none font-mono"
                      placeholder="Or paste URLs (one per line)"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Course File Images</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {fileImagesPreviews.map((p, i) => (
                        <div key={i} className="relative h-12 w-12 rounded-lg overflow-hidden border border-slate-200">
                          <img src={p || null} alt="Preview" className="h-full w-full object-cover" />
                          <button 
                            type="button"
                            onClick={() => setFileImagesPreviews(prev => prev.filter((_, idx) => idx !== i))}
                            className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl-lg"
                          >
                            <CloseIcon className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input 
                          type="file" 
                          multiple
                          accept="image/*" 
                          onChange={handleFileImagesChange}
                          className="absolute inset-0 cursor-pointer opacity-0"
                        />
                        <button type="button" className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs font-medium text-slate-600 hover:bg-slate-100">
                          <Plus className="h-3 w-3" /> Upload Images
                        </button>
                      </div>
                    </div>
                    <textarea 
                      name="fileImages" 
                      rows={2}
                      defaultValue={editingCourse?.fileImages?.join('\n')}
                      className="w-full mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none font-mono"
                      placeholder="Or paste URLs (one per line)"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 sticky bottom-0 bg-white pb-2">
                <button 
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white transition-all hover:bg-blue-700 active:scale-[0.98]"
                >
                  <Save className="h-4 w-4" />
                  {editingCourse ? 'Update Course' : 'Save Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


