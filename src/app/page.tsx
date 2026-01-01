'use client';

import { useState, useEffect } from 'react';
import { createClient } from './lib/supabase';
import { 
  Search, ChevronLeft, ChevronRight, Eye, 
  MapPin, X, Check, Users, Car, Shield, 
  DollarSign, RefreshCw, Lock
} from 'lucide-react';

type VerificationRequest = {
  id: string;
  user_id: string;
  document_type: string;
  front_image_url: string;
  back_image_url: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string | null;
  created_at: string;
  updated_at: string | null;
  user?: UserProfile;
};

type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
  updated_at: string | null;
  is_verified: boolean;
  verification_doc_url: string | null;
  verification_status: string | null;
  verified_at: string | null;
};

type CarListing = {
  id: string;
  user_id: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  mileage: number | null;
  fuel_type: string;
  transmission: string;
  engine_capacity: number | null;
  condition: string;
  body_type: string | null;
  assembly: string | null;
  color: string | null;
  location: string;
  registered_in: string | null;
  owner_name: string;
  owner_phone: string;
  owner_email: string;
  images: string[];
  description: string | null;
  features: string[] | null;
  is_sold: boolean;
  views: number;
  is_featured: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string | null;
  user?: UserProfile;
};

type AdminStats = {
  totalUsers: number;
  verifiedUsers: number;
  totalCars: number;
  verifiedCars: number;
  featuredCars: number;
  soldCars: number;
  pendingVerifications: number;
  totalViews: number;
  totalValue: number;
};

type ConfirmationModal = {
  show: boolean;
  type: 'deleteUser' | 'rejectVerification' | null;
  title: string;
  message: string;
  data: any;
  inputValue?: string;
};


export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'verifications'>('overview');
  
  // Data states
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [cars, setCars] = useState<CarListing[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    verifiedUsers: 0,
    totalCars: 0,
    verifiedCars: 0,
    featuredCars: 0,
    soldCars: 0,
    pendingVerifications: 0,
    totalViews: 0,
    totalValue: 0,
  });

  // Modal states
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImages, setSelectedImages] = useState<{front: string, back: string} | null>(null);
  const [confirmationModal, setConfirmationModal] = useState<ConfirmationModal>({
    show: false,
    type: null,
    title: '',
    message: '',
    data: null,
    inputValue: ''
  });

  // Search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Simple toast function
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium ${
      type === 'success' ? 'bg-green-600' : 'bg-red-600'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  };

  // Check if already authenticated on component mount
  useEffect(() => {
    const savedAuth = localStorage.getItem('adminAuthenticated');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
      loadAdminData();
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (loginData.username === process.env.NEXT_PUBLIC_ADMIN_EMAIL && 
        loginData.password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('adminAuthenticated', 'true');
      loadAdminData();
      showToast('Login successful!', 'success');
    } else {
      setLoginError('Invalid username or password');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('adminAuthenticated');
    showToast('Logged out successfully', 'success');
  };

  const loadAdminData = async () => {
    setLoading(true);
    const supabase = createClient();

    try {
      // Load verification requests with user data
      const { data: verificationData, error: verificationError } = await supabase
        .from('verification_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (verificationError) throw verificationError;

      if (verificationData) {
        // Fetch user data for each request
        const requestsWithUsers = await Promise.all(
          verificationData.map(async (request: any) => {
            const { data: userData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', request.user_id)
              .single();
            
            return {
              ...request,
              user: userData || null
            };
          })
        );
        setVerificationRequests(requestsWithUsers);
      }

      // Load all users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Load all cars with user data
      const { data: carsData, error: carsError } = await supabase
        .from('cars')
        .select('*')
        .order('created_at', { ascending: false });

      if (carsError) throw carsError;

      if (carsData) {
        // Fetch user data for each car
        const carsWithUsers = await Promise.all(
          carsData.map(async (car: any) => {
            const { data: userData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', car.user_id)
              .single();
            
            return {
              ...car,
              user: userData || null
            };
          })
        );
        setCars(carsWithUsers);
      }

      // Calculate stats
      calculateStats(usersData || [], carsData || [], verificationData || []);

    } catch (error: any) {
      console.error('Error loading admin data:', error);
      showToast(`Failed to load admin data: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (
    usersData: UserProfile[], 
    carsData: CarListing[], 
    verificationData: VerificationRequest[]
  ) => {
    const totalUsers = usersData.length;
    const verifiedUsers = usersData.filter(user => user.is_verified).length;
    const totalCars = carsData.length;
    const verifiedCars = carsData.filter(car => car.is_verified).length;
    const featuredCars = carsData.filter(car => car.is_featured).length;
    const soldCars = carsData.filter(car => car.is_sold).length;
    const pendingVerifications = verificationData.filter(req => req.status === 'pending').length;
    const totalViews = carsData.reduce((sum, car) => sum + (car.views || 0), 0);
    const totalValue = carsData.reduce((sum, car) => sum + car.price, 0);

    setStats({
      totalUsers,
      verifiedUsers,
      totalCars,
      verifiedCars,
      featuredCars,
      soldCars,
      pendingVerifications,
      totalViews,
      totalValue,
    });
  };

  const handleVerificationAction = async (requestId: string, action: 'approve' | 'reject', note?: string) => {
    const supabase = createClient();
    
    try {
      // Update verification request
      const { error: requestError } = await supabase
        .from('verification_requests')
        .update({
          status: action === 'approve' ? 'approved' : 'rejected',
          admin_note: note || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (requestError) throw requestError;

      // If approved, update user profile
      if (action === 'approve') {
        const request = verificationRequests.find(req => req.id === requestId);
        if (request) {
          const { error: userError } = await supabase
            .from('profiles')
            .update({
              is_verified: true,
              verification_status: 'approved',
              verified_at: new Date().toISOString()
            })
            .eq('id', request.user_id);

          if (userError) throw userError;
        }
      }

      showToast(`Verification ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
      loadAdminData();
    } catch (error: any) {
      console.error('Error updating verification:', error);
      showToast(`Failed to update verification: ${error.message}`, 'error');
    }
  };

  const handleUserAction = async (userId: string, action: 'verify' | 'unverify' | 'delete') => {
    const supabase = createClient();
    
    try {
      if (action === 'delete') {
        // Pehle user ki saari car listings delete karein
        const { error: carsError } = await supabase
          .from('cars')
          .delete()
          .eq('user_id', userId);

        if (carsError) throw carsError;

        // Phir user ki verification requests delete karein
        const { error: verificationsError } = await supabase
          .from('verification_requests')
          .delete()
          .eq('user_id', userId);

        if (verificationsError) throw verificationsError;

        // Aakhir mein user ka profile delete karein
        const { error: profileError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', userId);

        if (profileError) throw profileError;

        showToast('User and all related data deleted successfully');
      } else {
        const { error } = await supabase
          .from('profiles')
          .update({
            is_verified: action === 'verify',
            verification_status: action === 'verify' ? 'approved' : null,
            verified_at: action === 'verify' ? new Date().toISOString() : null
          })
          .eq('id', userId);

        if (error) throw error;
        showToast(`User ${action === 'verify' ? 'verified' : 'unverified'} successfully`);
      }

      loadAdminData();
    } catch (error: any) {
      console.error('Error performing user action:', error);
      showToast(`Failed to perform action: ${error.message}`, 'error');
    }
  };

  const showVerificationImages = (frontImage: string, backImage: string) => {
    setSelectedImages({ front: frontImage, back: backImage });
    setShowImageModal(true);
  };

  const showConfirmationModal = (type: ConfirmationModal['type'], data: any, title: string, message: string) => {
    setConfirmationModal({
      show: true,
      type,
      title,
      message,
      data,
      inputValue: ''
    });
  };

  const closeConfirmationModal = () => {
    setConfirmationModal({
      show: false,
      type: null,
      title: '',
      message: '',
      data: null,
      inputValue: ''
    });
  };

  const handleConfirmAction = async () => {
    const { type, data, inputValue } = confirmationModal;
    
    if (type === 'deleteUser') {
      await handleUserAction(data.id, 'delete');
    } else if (type === 'rejectVerification') {
      await handleVerificationAction(data.id, 'reject', inputValue);
    }
    
    closeConfirmationModal();
    // Foran data reload karein
    loadAdminData();
  };

  const formatPrice = (price: number) => {
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(1)} Lakh`;
    return `₹${price.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const filteredData = () => {
    let data: any[] = [];
    
    switch (activeTab) {
      case 'overview':
        data = users;
        break;
      case 'verifications':
        data = verificationRequests;
        break;
      case 'users':
        data = users;
        break;
      default:
        data = [];
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter(item => {
        if ('email' in item && item.email) {
          return item.email.toLowerCase().includes(term) ||
                 (item.full_name && item.full_name.toLowerCase().includes(term));
        }
        if ('document_type' in item && item.document_type) {
          return item.document_type.toLowerCase().includes(term) ||
                 (item.user?.email && item.user.email.toLowerCase().includes(term));
        }
        return false;
      });
    }

    return data;
  };

  const paginatedData = () => {
    const data = filteredData();
    const startIndex = (currentPage - 1) * itemsPerPage;
    return data.slice(startIndex, startIndex + itemsPerPage);
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <Lock className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Login</h1>
            <p className="text-gray-600 mt-2">Enter your credentials to access the admin panel</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="text"
                  value={loginData.username}
                  onChange={(e) => setLoginData(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Enter email"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Enter password"
                  required
                />
              </div>

              {loginError && (
                <div className="text-red-600 text-sm text-center">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors font-medium"
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Logout Button */}
      <div className="fixed top-4 right-4 z-40">
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
        >
          <Lock className="h-4 w-4" />
          Logout
        </button>
      </div>

      <div className="pt-20">
        {/* Image Modal */}
        {showImageModal && selectedImages && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="text-lg font-semibold">Verification Documents</h3>
                <button
                  onClick={() => setShowImageModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Front Image</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <img 
                      src={selectedImages.front} 
                      alt="Document Front"
                      className="w-full h-auto max-h-[400px] object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-doc.png';
                      }}
                    />
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Back Image</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <img 
                      src={selectedImages.back} 
                      alt="Document Back"
                      className="w-full h-auto max-h-[400px] object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-doc.png';
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="p-4 border-t flex justify-end">
                <button
                  onClick={() => setShowImageModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {confirmationModal.show && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {confirmationModal.title}
                </h3>
                <p className="text-gray-600 mb-6">
                  {confirmationModal.message}
                </p>
                
                {confirmationModal.type === 'rejectVerification' && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for rejection (optional)
                    </label>
                    <textarea
                      value={confirmationModal.inputValue}
                      onChange={(e) => setConfirmationModal(prev => ({
                        ...prev,
                        inputValue: e.target.value
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      rows={3}
                      placeholder="Enter reason for rejection..."
                    />
                  </div>
                )}

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={closeConfirmationModal}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmAction}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">Manage users, cars, and verification requests</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <div className="mt-2">
                <span className="text-sm text-green-600">
                  {stats.verifiedUsers} verified
                </span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Cars</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalCars}</p>
                </div>
                <Car className="h-8 w-8 text-green-600" />
              </div>
              <div className="mt-2">
                <span className="text-sm text-green-600">{stats.verifiedCars} verified</span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Pending Verifications</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingVerifications}</p>
                </div>
                <Shield className="h-8 w-8 text-yellow-600" />
              </div>
              <p className="text-sm text-gray-500 mt-2">Awaiting review</p>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Value</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatPrice(stats.totalValue)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-red-600" />
              </div>
              <p className="text-sm text-gray-500 mt-2">All listed cars</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-lg mb-6">
            <div className="border-b border-gray-200">
              <div className="flex overflow-x-auto">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`flex-shrink-0 px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === 'overview'
                      ? 'border-red-600 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('verifications')}
                  className={`flex-shrink-0 px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === 'verifications'
                      ? 'border-red-600 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Verifications
                  {stats.pendingVerifications > 0 && (
                    <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                      {stats.pendingVerifications}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('users')}
                  className={`flex-shrink-0 px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === 'users'
                      ? 'border-red-600 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Users
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder={`Search ${activeTab === 'overview' ? 'users' : activeTab}...`}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <button
                  onClick={loadAdminData}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Users</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {paginatedData().map((user: UserProfile) => (
                        <div key={user.id} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="font-bold text-blue-600">
                                {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{user.full_name || 'No Name'}</p>
                              <p className="text-sm text-gray-500">{user.email}</p>
                            </div>
                          </div>
                          <div className="mt-3 flex justify-between items-center">
                            <span className={`px-2 py-1 text-xs rounded ${user.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              {user.is_verified ? 'Verified' : 'Unverified'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(user.created_at)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Pagination for Overview */}
                    {filteredData().length > itemsPerPage && (
                      <div className="flex justify-center items-center gap-2 mt-6">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <span className="text-sm text-gray-600">
                          Page {currentPage} of {Math.ceil(filteredData().length / itemsPerPage)}
                        </span>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredData().length / itemsPerPage)))}
                          disabled={currentPage === Math.ceil(filteredData().length / itemsPerPage)}
                          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Verifications Tab */}
              {activeTab === 'verifications' && (
                <div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">User</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Document Type</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Submitted</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {paginatedData().map((request: VerificationRequest) => (
                          <tr key={request.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                  <span className="font-medium">
                                    {request.user?.full_name?.[0]?.toUpperCase() || request.user?.email?.[0]?.toUpperCase() || 'U'}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium">{request.user?.full_name || 'No Name'}</p>
                                  <p className="text-sm text-gray-500">{request.user?.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                                {request.document_type}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs rounded ${
                                request.status === 'approved' ? 'bg-green-100 text-green-800' :
                                request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {formatDate(request.created_at)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                {request.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => handleVerificationAction(request.id, 'approve')}
                                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center gap-1"
                                    >
                                      <Check className="h-3 w-3" />
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => showConfirmationModal(
                                        'rejectVerification',
                                        request,
                                        'Reject Verification',
                                        `Are you sure you want to reject verification for ${request.user?.full_name || request.user?.email}?`
                                      )}
                                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 flex items-center gap-1"
                                    >
                                      <X className="h-3 w-3" />
                                      Reject
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => showVerificationImages(request.front_image_url, request.back_image_url)}
                                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center gap-1"
                                >
                                  <Eye className="h-3 w-3" />
                                  View Images
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {filteredData().length === 0 && (
                    <div className="text-center py-12">
                      <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No verification requests found</p>
                    </div>
                  )}

                  {/* Pagination */}
                  {filteredData().length > itemsPerPage && (
                    <div className="flex justify-center items-center gap-2 mt-6">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <span className="text-sm text-gray-600">
                        Page {currentPage} of {Math.ceil(filteredData().length / itemsPerPage)}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredData().length / itemsPerPage)))}
                        disabled={currentPage === Math.ceil(filteredData().length / itemsPerPage)}
                        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Users Tab */}
              {activeTab === 'users' && (
                <div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">User</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Joined</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Cars</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {paginatedData().map((user: UserProfile) => {
                          const userCars = cars.filter(car => car.user_id === user.id);
                          
                          return (
                            <tr key={user.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="font-bold text-blue-600">
                                      {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="font-medium">{user.full_name || 'No Name'}</p>
                                    <p className="text-sm text-gray-500">{user.email}</p>
                                    {user.phone && <p className="text-xs text-gray-500">{user.phone}</p>}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 text-xs rounded ${user.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                  {user.is_verified ? 'Verified' : 'Unverified'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {formatDate(user.created_at)}
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm">
                                  <span className="font-medium">{userCars.length}</span>
                                  <span className="text-gray-500 ml-1">cars</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleUserAction(user.id, user.is_verified ? 'unverify' : 'verify')}
                                    className={`px-3 py-1 text-sm rounded ${
                                      user.is_verified 
                                        ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                                        : 'bg-green-600 text-white hover:bg-green-700'
                                    }`}
                                  >
                                    {user.is_verified ? 'Unverify' : 'Verify'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {filteredData().length === 0 && (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No users found</p>
                    </div>
                  )}

                  {/* Pagination */}
                  {filteredData().length > itemsPerPage && (
                    <div className="flex justify-center items-center gap-2 mt-6">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <span className="text-sm text-gray-600">
                        Page {currentPage} of {Math.ceil(filteredData().length / itemsPerPage)}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredData().length / itemsPerPage)))}
                        disabled={currentPage === Math.ceil(filteredData().length / itemsPerPage)}
                        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}