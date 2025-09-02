// src/pages/ProfileSettingsPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileService, preferencesService, subscriptionService } from '../services/supabase';
import UserPreferencesModal from '../components/UserPreferencesModal';
import { 
  UserCircleIcon, 
  CogIcon, 
  BellIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  ArrowLeftIcon,
  PhotoIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

function ProfileSettingsPage({ user, profile }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [subscriptionTiers, setSubscriptionTiers] = useState([]);
  const [preferences, setPreferences] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  // Profile form data
  const [profileData, setProfileData] = useState({
    display_name: profile?.display_name || '',
    bio: profile?.bio || '',
    avatar_url: profile?.avatar_url || ''
  });

  useEffect(() => {
    loadSubscriptionTiers();
    loadPreferences();
  }, [user]);

  const loadSubscriptionTiers = async () => {
    try {
      const tiers = await subscriptionService.getTiers();
      setSubscriptionTiers(tiers);
    } catch (error) {
      console.error('Error loading subscription tiers:', error);
    }
  };

  const loadPreferences = async () => {
    try {
      const userPrefs = await preferencesService.getPreferences(user.id);
      setPreferences(userPrefs);
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await profileService.updateProfile(user.id, profileData);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Error updating profile');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      // In production, you would upload to your storage service
      // For now, we'll just show a placeholder
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData({ ...profileData, avatar_url: reader.result });
      };
      reader.readAsDataURL(file);
      toast.success('Avatar uploaded successfully!');
    } catch (error) {
      toast.error('Error uploading avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePreferencesSave = async (preferences) => {
    try {
      await preferencesService.updatePreferences(user.id, preferences);
      toast.success('Preferences updated successfully!');
      setShowPreferencesModal(false);
      loadPreferences();
    } catch (error) {
      toast.error('Error updating preferences');
      console.error('Error:', error);
    }
  };

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState({
    email_notifications: true,
    event_reminders: true,
    weekly_digest: false,
    promotional_emails: false
  });

  const handleNotificationUpdate = async (setting, value) => {
    const updated = { ...notificationSettings, [setting]: value };
    setNotificationSettings(updated);
    
    try {
      // Save to backend
      await preferencesService.updatePreferences(user.id, {
        notification_channels: {
          email: updated.email_notifications,
          reminders: updated.event_reminders,
          digest: updated.weekly_digest,
          promotional: updated.promotional_emails
        }
      });
      toast.success('Notification settings updated');
    } catch (error) {
      toast.error('Error updating notifications');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Back
        </button>
        
        <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
        <p className="text-gray-600 mt-2">
          Manage your profile, preferences, and account settings
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <nav className="flex">
            {[
              { id: 'profile', label: 'Profile', icon: UserCircleIcon },
              { id: 'preferences', label: 'Preferences', icon: CogIcon },
              { id: 'notifications', label: 'Notifications', icon: BellIcon },
              profile?.profile_type === 'personal' && { id: 'subscription', label: 'Upgrade', icon: CreditCardIcon },
              { id: 'security', label: 'Security', icon: ShieldCheckIcon }
            ].filter(Boolean).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileUpdate} className="space-y-6 max-w-2xl">
              {/* Avatar Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Profile Picture
                </label>
                <div className="flex items-center gap-4">
                  {profileData.avatar_url ? (
                    <img
                      src={profileData.avatar_url}
                      alt="Avatar"
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">
                        {profileData.display_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <label className="cursor-pointer">
                    <div className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                      {uploadingAvatar ? 'Uploading...' : 'Change Avatar'}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      disabled={uploadingAvatar}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={profileData.display_name}
                  onChange={(e) => setProfileData({ ...profileData, display_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bio
                </label>
                <textarea
                  value={profileData.bio}
                  onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Type
                </label>
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    profile?.profile_type === 'business'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    {profile?.profile_type === 'business' ? 'Business Account' : 'Personal Account'}
                  </div>
                  {profile?.profile_type === 'personal' && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>Listings:</span>
                      <span className="font-medium">
                        {profile.active_listings_count || 0} / {profile.max_listings_allowed || 3}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Profile'}
              </button>
            </form>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div>
              <div className="max-w-2xl">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Event Preferences
                </h3>
                <p className="text-gray-600 mb-6">
                  Customize your experience by setting your preferences for events and activities.
                </p>

                {preferences && (
                  <div className="bg-gray-50 rounded-lg p-6 mb-6">
                    <h4 className="font-medium text-gray-900 mb-3">Current Preferences</h4>
                    <div className="space-y-2 text-sm">
                      {preferences.preferred_categories && preferences.preferred_categories.length > 0 && (
                        <div>
                          <span className="text-gray-600">Interested in: </span>
                          <span className="font-medium">{preferences.preferred_categories.join(', ')}</span>
                        </div>
                      )}
                      {preferences.has_children && (
                        <div>
                          <span className="text-gray-600">Children ages: </span>
                          <span className="font-medium">{preferences.children_ages?.join(', ') || 'Not specified'}</span>
                        </div>
                      )}
                      {preferences.preferred_price_range && (
                        <div>
                          <span className="text-gray-600">Budget preference: </span>
                          <span className="font-medium capitalize">{preferences.preferred_price_range}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setShowPreferencesModal(true)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {preferences ? 'Update Preferences' : 'Set Preferences'}
                </button>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="max-w-2xl">
              <h3 className="text-lg font-medium text-gray-900 mb-6">
                Notification Settings
              </h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Email Notifications</p>
                    <p className="text-sm text-gray-600">Receive updates about events and activities</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationSettings.email_notifications}
                      onChange={(e) => handleNotificationUpdate('email_notifications', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Event Reminders</p>
                    <p className="text-sm text-gray-600">Get notified about upcoming events you're interested in</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationSettings.event_reminders}
                      onChange={(e) => handleNotificationUpdate('event_reminders', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Weekly Digest</p>
                    <p className="text-sm text-gray-600">Summary of events and activities in Lethbridge</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationSettings.weekly_digest}
                      onChange={(e) => handleNotificationUpdate('weekly_digest', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Promotional Emails</p>
                    <p className="text-sm text-gray-600">Special offers and featured events</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationSettings.promotional_emails}
                      onChange={(e) => handleNotificationUpdate('promotional_emails', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Subscription Tab (Personal Accounts Only) */}
          {activeTab === 'subscription' && profile?.profile_type === 'personal' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Upgrade Your Account
              </h3>
              <p className="text-gray-600 mb-6">
                Get more from Lethbridge AI with these upgrade options
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Plus */}
                <div className="border-2 border-gray-200 rounded-lg p-6">
                  <h4 className="text-lg font-bold mb-2">Personal Plus</h4>
                  <p className="text-3xl font-bold mb-4">
                    $5<span className="text-sm text-gray-600 font-normal">/month</span>
                  </p>
                  <ul className="space-y-2 text-sm text-gray-600 mb-6">
                    <li className="flex items-start">
                      <CheckIcon className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
                      <span>Unlimited personal listings</span>
                    </li>
                    <li className="flex items-start">
                      <CheckIcon className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
                      <span>Priority placement in search</span>
                    </li>
                    <li className="flex items-start">
                      <CheckIcon className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
                      <span>Advanced event recommendations</span>
                    </li>
                    <li className="flex items-start">
                      <CheckIcon className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
                      <span>No ads</span>
                    </li>
                  </ul>
                  <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                    Upgrade to Plus
                  </button>
                </div>

                {/* Business Account */}
                <div className="border-2 border-blue-500 rounded-lg p-6 relative">
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                      RECOMMENDED
                    </span>
                  </div>
                  <h4 className="text-lg font-bold mb-2">Business Account</h4>
                  <p className="text-3xl font-bold mb-4">
                    $19<span className="text-sm text-gray-600 font-normal">/month</span>
                  </p>
                  <ul className="space-y-2 text-sm text-gray-600 mb-6">
                    <li className="flex items-start">
                      <CheckIcon className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
                      <span>List business events</span>
                    </li>
                    <li className="flex items-start">
                      <CheckIcon className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
                      <span>Business dashboard</span>
                    </li>
                    <li className="flex items-start">
                      <CheckIcon className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
                      <span>Event analytics</span>
                    </li>
                    <li className="flex items-start">
                      <CheckIcon className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
                      <span>AI assistant (Pro plan)</span>
                    </li>
                  </ul>
                  <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Switch to Business
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="max-w-2xl">
              <h3 className="text-lg font-medium text-gray-900 mb-6">
                Security Settings
              </h3>
              <div className="space-y-4">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-medium mb-2">Email Address</h4>
                  <p className="text-sm text-gray-600">{user.email}</p>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Password</h4>
                  <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                    Change Password
                  </button>
                </div>

                <div className="pt-6 border-t">
                  <h4 className="font-medium text-red-600 mb-3">Danger Zone</h4>
                  <button className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50">
                    Delete Account
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    This action cannot be undone. All your data will be permanently deleted.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Preferences Modal */}
      {showPreferencesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <UserPreferencesModal
            userId={user.id}
            onSave={handlePreferencesSave}
            onClose={() => setShowPreferencesModal(false)}
          />
        </div>
      )}
    </div>
  );
}

export default ProfileSettingsPage;