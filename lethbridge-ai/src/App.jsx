// src/App.jsx - Complete Fixed Version
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { authService, profileService, supabase, chatService } from './services/supabase';
import HomePage from './pages/HomePage';
import EventsPage from './pages/EventsPage';
import PersonalListingsPage from './pages/PersonalListingsPage';
import DashboardPage from './pages/DashboardPage';
import AuthPage from './pages/AuthPage';
import ProfileSettingsPage from './pages/ProfileSettingsPage';
import MarketplacePage from './pages/MarketplacePage'; 
import MyPostsPage from './pages/MyPostsPage';
import MessagesPage from './pages/MessagesPage';
import Footer from './components/Footer';

import { 
  UserCircleIcon, 
  CalendarIcon, 
  BuildingOfficeIcon,
  HomeIcon,
  CogIcon,
  SparklesIcon,
  TagIcon,
  BellIcon,
  ChartBarIcon,
  ArrowRightOnRectangleIcon,
  ShoppingBagIcon,
  ChatBubbleLeftIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h2>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Navigation component with mobile menu
function Navigation({ user, profile }) {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      checkUnreadMessages();
      
      // Listen for messages being read
      const handleMessagesRead = () => {
        checkUnreadMessages();
      };
      
      window.addEventListener('messagesRead', handleMessagesRead);
      
      // Check for new messages periodically
      const interval = setInterval(checkUnreadMessages, 30000);
      
      return () => {
        window.removeEventListener('messagesRead', handleMessagesRead);
        clearInterval(interval);
      };
    }
  }, [user]);

  const checkUnreadMessages = async () => {
    try {
      const conversations = await chatService.getConversations(user.id);
      
      let totalUnread = 0;
      for (const conv of conversations) {
        const messages = await chatService.getMessages(conv.id);
        const unread = messages.filter(msg => 
          msg.sender_id !== user.id && msg.is_read === false
        ).length;
        totalUnread += unread;
      }
      
      console.log('Total unread messages:', totalUnread);
      setUnreadCount(totalUnread);
    } catch (error) {
      console.error('Error checking unread messages:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      navigate('/');
      window.location.reload();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link to="/" className="flex items-center">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-1.5 rounded-lg font-bold text-lg">
                LA
              </div>
              <span className="ml-3 text-xl font-semibold text-gray-900">
                Lethbridge AI
              </span>
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden sm:ml-8 sm:flex sm:space-x-6">
              <Link
                to="/events"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                <CalendarIcon className="w-4 h-4 mr-1" />
                Events
              </Link>
              <Link
                to="/community"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                <UserCircleIcon className="w-4 h-4 mr-1" />
                Community
              </Link>
              <Link
                to="/marketplace"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                <ShoppingBagIcon className="w-4 h-4 mr-1" />
                Marketplace
              </Link>
              
              {/* Desktop only - My Posts and Messages */}
              {user && (
                <>
                  <Link
                    to="/my-posts"
                    className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    <TagIcon className="w-4 h-4 mr-1" />
                    My Posts
                  </Link>
                  <Link
                    to="/messages"
                    className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-700 hover:text-gray-900 relative"
                  >
                    <ChatBubbleLeftIcon className="w-4 h-4 mr-1" />
                    Messages
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Link>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center">
            {/* Mobile menu button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="sm:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              {showMobileMenu ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>

            {/* Desktop User Menu */}
            <div className="hidden sm:block">
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <div className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-50">
                      {profile?.avatar_url ? (
                        <img
                          className="h-8 w-8 rounded-full object-cover"
                          src={profile.avatar_url}
                          alt={profile.display_name}
                        />
                      ) : (
                        <UserCircleIcon className="h-8 w-8 text-gray-400" />
                      )}
                      <span className="hidden md:block text-gray-700">
                        {profile?.display_name || user.email?.split('@')[0] || 'Account'}
                      </span>
                    </div>
                  </button>
                  
                  {showDropdown && (
                    <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5">
                      <div className="px-4 py-2 text-xs text-gray-500 border-b">
                        {user.email}
                      </div>
                      
                      {profile?.profile_type === 'business' ? (
                        <Link
                          to="/dashboard"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setShowDropdown(false)}
                        >
                          <ChartBarIcon className="w-4 h-4 mr-3" />
                          Dashboard
                        </Link>
                      ) : (
                        <Link
                          to="/listings"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setShowDropdown(false)}
                        >
                          <TagIcon className="w-4 h-4 mr-3" />
                          Personal Listings
                        </Link>
                      )}
                      
                      <Link
                        to="/settings"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setShowDropdown(false)}
                      >
                        <CogIcon className="w-4 h-4 mr-3" />
                        Settings
                      </Link>
                      
                      <div className="border-t">
                        <button
                          onClick={handleSignOut}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
                        >
                          <ArrowRightOnRectangleIcon className="w-4 h-4 mr-3" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/auth"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  Sign In / Sign Up
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu - Clean slide-down panel */}
      {showMobileMenu && (
        <div className="sm:hidden border-t border-gray-200 bg-white">
          <div className="pt-2 pb-3 space-y-1">
            {/* Main Navigation */}
            <Link
              to="/events"
              className="block px-4 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              onClick={() => setShowMobileMenu(false)}
            >
              <div className="flex items-center">
                <CalendarIcon className="w-5 h-5 mr-3" />
                Events
              </div>
            </Link>
            
            <Link
              to="/community"
              className="block px-4 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              onClick={() => setShowMobileMenu(false)}
            >
              <div className="flex items-center">
                <UserCircleIcon className="w-5 h-5 mr-3" />
                Community
              </div>
            </Link>
            
            <Link
              to="/marketplace"
              className="block px-4 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              onClick={() => setShowMobileMenu(false)}
            >
              <div className="flex items-center">
                <ShoppingBagIcon className="w-5 h-5 mr-3" />
                Marketplace
              </div>
            </Link>

            {/* User Section - only if logged in */}
            {user && (
              <>
                <div className="border-t border-gray-200 my-2"></div>
                
                <Link
                  to="/my-posts"
                  className="block px-4 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                  onClick={() => setShowMobileMenu(false)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <TagIcon className="w-5 h-5 mr-3" />
                      My Posts
                    </div>
                  </div>
                </Link>
                
                <Link
                  to="/messages"
                  className="block px-4 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                  onClick={() => setShowMobileMenu(false)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <ChatBubbleLeftIcon className="w-5 h-5 mr-3" />
                      Messages
                    </div>
                    {unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </Link>
                
                {profile?.profile_type === 'business' ? (
                  <Link
                    to="/dashboard"
                    className="block px-4 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    <div className="flex items-center">
                      <ChartBarIcon className="w-5 h-5 mr-3" />
                      Dashboard
                    </div>
                  </Link>
                ) : (
                  <Link
                    to="/listings"
                    className="block px-4 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    <div className="flex items-center">
                      <HomeIcon className="w-5 h-5 mr-3" />
                      Personal Listings
                    </div>
                  </Link>
                )}
                
                <Link
                  to="/settings"
                  className="block px-4 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                  onClick={() => setShowMobileMenu(false)}
                >
                  <div className="flex items-center">
                    <CogIcon className="w-5 h-5 mr-3" />
                    Settings
                  </div>
                </Link>
                
                <div className="border-t border-gray-200 my-2"></div>
                
                <button
                  onClick={handleSignOut}
                  className="block w-full text-left px-4 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    <ArrowRightOnRectangleIcon className="w-5 h-5 mr-3" />
                    Sign Out
                  </div>
                </button>
              </>
            )}
            
            {/* Sign In button for non-logged in users */}
            {!user && (
              <>
                <div className="border-t border-gray-200 my-2"></div>
                <Link
                  to="/auth"
                  className="block px-4 py-2 text-base font-medium text-blue-600 hover:text-blue-700 hover:bg-gray-50"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Sign In / Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      console.log('Initializing auth...');
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          console.error('Session error:', error);
          setLoading(false);
          setAuthInitialized(true);
          return;
        }
        
        if (session?.user) {
          console.log('Session found:', session.user.email);
          setUser(session.user);
          
          profileService.getProfile(session.user.id)
            .then(userProfile => {
              if (mounted && userProfile) {
                setProfile(userProfile);
                console.log('Profile loaded:', userProfile.display_name);
              }
            })
            .catch(profileError => {
              console.error('Profile load error:', profileError);
              // Try to create profile if it doesn't exist
              profileService.createProfile({
                user_id: session.user.id,
                display_name: session.user.email?.split('@')[0] || 'User',
                profile_type: 'personal'
              })
              .then(newProfile => {
                if (mounted && newProfile) {
                  setProfile(newProfile);
                }
              })
              .catch(createError => {
                console.error('Profile creation error:', createError);
              });
            });

          // Check for unread messages on login
          const checkMessages = async () => {
            try {
              const conversations = await chatService.getConversations(session.user.id);
              let unreadCount = 0;
              
              for (const conv of conversations) {
                const messages = await chatService.getMessages(conv.id);
                const unread = messages.filter(msg => 
                  msg.sender_id !== session.user.id && !msg.is_read
                ).length;
                unreadCount += unread;
              }
              
              if (unreadCount > 0) {
                toast(`You have ${unreadCount} unread message${unreadCount > 1 ? 's' : ''}`, {
                  icon: '💬',
                  duration: 5000
                });
              }
            } catch (error) {
              console.error('Error checking messages:', error);
            }
          };
          
          checkMessages();
        } else {
          console.log('No session found');
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        if (mounted) {
          setLoading(false);
          setAuthInitialized(true);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (!mounted) return;
        
        switch (event) {
          case 'SIGNED_IN':
          case 'TOKEN_REFRESHED':
          case 'USER_UPDATED':
            if (session?.user) {
              setUser(session.user);
              profileService.getProfile(session.user.id)
                .then(userProfile => {
                  if (mounted) setProfile(userProfile);
                })
                .catch(error => {
                  console.error('Profile load error on auth change:', error);
                });
            }
            break;
            
          case 'SIGNED_OUT':
            setUser(null);
            setProfile(null);
            break;
        }
      }
    );

    const loadingTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Auth initialization timeout - forcing load complete');
        setLoading(false);
        setAuthInitialized(true);
      }
    }, 3000);

    return () => {
      mounted = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    window.updateAppProfile = (newProfile) => {
      setProfile(newProfile);
    };
    
    return () => {
      delete window.updateAppProfile;
    };
  }, []);

  // Periodic session validation
  useEffect(() => {
    if (!authInitialized) return;

    const validateSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session validation error:', error);
          return;
        }
        
        if (session?.user && !user) {
          console.log('Restoring lost session');
          setUser(session.user);
          const userProfile = await profileService.getProfile(session.user.id);
          setProfile(userProfile);
        } else if (!session && user) {
          console.log('Session expired');
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error('Session validation error:', error);
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        validateSession();
      }
    };
    
    const handleFocus = () => {
      validateSession();
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    validateSession();
    
    const interval = setInterval(validateSession, 30000);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, authInitialized]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Toaster position="top-right" />
          <Navigation user={user} profile={profile} />
          
          <main>
            <Routes>
              <Route path="/" element={<HomePage user={user} profile={profile} />} />
              <Route path="/events" element={<EventsPage user={user} profile={profile} />} />
              <Route path="/community" element={<PersonalListingsPage user={user} profile={profile} />} />
              <Route path="/marketplace" element={<MarketplacePage user={user} profile={profile} />} />
              <Route path="/listings" element={<PersonalListingsPage user={user} profile={profile} />} />
              <Route path="/messages" element={user ? <MessagesPage user={user} /> : <Navigate to="/auth" />} />
              <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
              <Route
                path="/dashboard"
                element={
                  user && profile?.profile_type === 'business' ? (
                    <DashboardPage user={user} profile={profile} />
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />
              <Route
                path="/settings"
                element={
                  user ? (
                    <ProfileSettingsPage user={user} profile={profile} />
                  ) : (
                    <Navigate to="/auth" replace />
                  )
                }
              />
              <Route
                path="/my-posts"
                element={user ? <MyPostsPage user={user} profile={profile} /> : <Navigate to="/auth" />}
              />
            </Routes>
          </main>
          <Footer profile={profile} />
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;