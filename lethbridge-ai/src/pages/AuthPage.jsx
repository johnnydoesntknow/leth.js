import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/supabase';
import { 
  BuildingOfficeIcon, 
  UserCircleIcon,
  HomeIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

function AuthPage() {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileType, setProfileType] = useState('personal');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  });

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const user = await authService.getUser();
      if (user) {
        // User is already logged in, redirect to home
        navigate('/');
      }
    };
    checkAuth();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSignUp && formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (isSignUp && !formData.displayName) {
      toast.error('Please provide a display name');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await authService.signUp(formData.email, formData.password, {
          profile_type: profileType,
          display_name: formData.displayName
        });
        
        // For development with email confirmation disabled:
        // Auto sign in and redirect
        toast.success('Account created! Signing you in...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          await authService.signIn(formData.email, formData.password);
          navigate('/');
        } catch (signInError) {
          // If auto sign-in fails, just show success message
          toast.success('Account created! Please check your email to verify.');
        }
        
      } else {
        await authService.signIn(formData.email, formData.password);
        toast.success('Welcome back!');
        // Always navigate to home after successful login
        navigate('/');
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-4">
              {profileType === 'business' ? (
                <BuildingOfficeIcon className="w-8 h-8 text-blue-600" />
              ) : (
                <UserCircleIcon className="w-8 h-8 text-purple-600" />
              )}
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              {isSignUp ? 'Create Your Account' : 'Welcome Back'}
            </h2>
            <p className="text-gray-600 mt-2">
              {isSignUp 
                ? 'Join Lethbridge AI to discover and share local events' 
                : 'Sign in to manage your events and listings'}
            </p>
          </div>

          {/* Profile Type Selection (Sign Up Only) */}
          {isSignUp && (
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-3">I want to:</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setProfileType('personal')}
                  className={`relative p-4 rounded-lg border-2 transition-all ${
                    profileType === 'personal'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {profileType === 'personal' && (
                    <div className="absolute top-2 right-2">
                      <CheckIcon className="w-5 h-5 text-purple-600" />
                    </div>
                  )}
                  <HomeIcon className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                  <p className="font-medium text-gray-900">Personal Account</p>
                  <p className="text-xs text-gray-600 mt-1">
                    List garage sales, find events
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setProfileType('business')}
                  className={`relative p-4 rounded-lg border-2 transition-all ${
                    profileType === 'business'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {profileType === 'business' && (
                    <div className="absolute top-2 right-2">
                      <CheckIcon className="w-5 h-5 text-blue-600" />
                    </div>
                  )}
                  <BuildingOfficeIcon className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                  <p className="font-medium text-gray-900">Business Account</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Promote events, AI agent
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {profileType === 'business' ? 'Business Name' : 'Display Name'}
                </label>
                <input
                  type="text"
                  required
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder={profileType === 'business' ? 'Your Business Name' : 'Your Name'}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder={profileType === 'business' ? 'business@example.com' : 'you@example.com'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="••••••••"
              />
            </div>

            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="••••••••"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                profileType === 'business' 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          {/* Toggle Sign Up / Sign In */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="ml-1 font-medium text-blue-600 hover:text-blue-700"
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </div>

          {/* Feature List */}
          {isSignUp && (
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="font-medium text-gray-900 mb-4">
                {profileType === 'business' ? 'Business Features' : 'Personal Features'}
              </h3>
              {profileType === 'business' ? (
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    List unlimited business events
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    AI assistant for customer queries (Pro plan)
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    Detailed analytics and insights
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    Featured event placement options
                  </li>
                </ul>
              ) : (
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    List garage sales and personal events
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    Personalized event recommendations
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    Save favorite events and get reminders
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    Connect with your community
                  </li>
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthPage;