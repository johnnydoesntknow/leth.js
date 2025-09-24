import React, { useState, useEffect } from 'react';
import { preferencesService } from '../services/supabase';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const EVENT_CATEGORIES = [
  'Family & Kids',
  'Sports & Recreation',
  'Arts & Culture',
  'Music & Concerts',
  'Food & Drink',
  'Community',
  'Education & Learning',
  'Business & Networking',
  'Health & Wellness',
  'Technology',
  'Charity & Fundraising',
  'Seasonal & Holiday'
];

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday', 
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

const AGE_GROUPS = [
  { value: '0-2', label: 'Baby (0-2)' },
  { value: '3-5', label: 'Toddler (3-5)' },
  { value: '6-9', label: 'Child (6-9)' },
  { value: '10-12', label: 'Pre-teen (10-12)' },
  { value: '13-17', label: 'Teen (13-17)' }
];

function UserPreferencesModal({ userId, onSave, onClose }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    preferred_categories: [],
    has_children: false,
    children_ages: [],
    notification_enabled: true,
    max_event_cost: null,
    preferred_price_range: 'any',
    preferred_days: []
  });

  useEffect(() => {
    loadPreferences();
  }, [userId]);

  const loadPreferences = async () => {
    try {
      const data = await preferencesService.getPreferences(userId);
      if (data) {
        setPreferences({
          preferred_categories: data.preferred_categories || [],
          has_children: data.has_children || false,
          children_ages: data.children_ages || [],
          notification_enabled: data.notification_enabled !== false,
          max_event_cost: data.max_event_cost || null,
          preferred_price_range: data.preferred_price_range || 'any',
          preferred_days: data.preferred_days || []
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast.error('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryToggle = (category) => {
    const newCategories = preferences.preferred_categories.includes(category)
      ? preferences.preferred_categories.filter(c => c !== category)
      : [...preferences.preferred_categories, category];
    
    setPreferences({ ...preferences, preferred_categories: newCategories });
  };

  const handleDayToggle = (day) => {
    const newDays = preferences.preferred_days.includes(day)
      ? preferences.preferred_days.filter(d => d !== day)
      : [...preferences.preferred_days, day];
    
    setPreferences({ ...preferences, preferred_days: newDays });
  };

  const handleChildAgeToggle = (ageGroup) => {
    const newAges = preferences.children_ages.includes(ageGroup)
      ? preferences.children_ages.filter(a => a !== ageGroup)
      : [...preferences.children_ages, ageGroup];
    
    setPreferences({ ...preferences, children_ages: newAges });
  };
const handleSubmit = async (e) => {
  e.preventDefault();
  setSaving(true);

  try {
    await onSave(preferences);
    // Remove this line - let the parent handle the success notification
    // toast.success('Preferences saved successfully!');
    onClose();
  } catch (error) {
    console.error('Error saving preferences:', error);
    toast.error('Failed to save preferences');
  } finally {
    setSaving(false);
  }
};

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-8 max-w-3xl w-full">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <h2 className="text-xl font-semibold">Event Preferences</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-8">
          {/* Event Categories */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Preferred Event Categories
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Select categories you're interested in to get personalized recommendations
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {EVENT_CATEGORIES.map(category => (
                <label
                  key={category}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                    preferences.preferred_categories.includes(category)
                      ? 'bg-blue-50 border-blue-500'
                      : 'bg-white border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={preferences.preferred_categories.includes(category)}
                    onChange={() => handleCategoryToggle(category)}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium">
                    {category}
                  </span>
                  {preferences.preferred_categories.includes(category) && (
                    <CheckIcon className="w-4 h-4 ml-auto text-blue-600" />
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Family Preferences */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Family Preferences
            </h3>
            <label className="flex items-center mb-4">
              <input
                type="checkbox"
                checked={preferences.has_children}
                onChange={(e) => setPreferences({ 
                  ...preferences, 
                  has_children: e.target.checked,
                  children_ages: e.target.checked ? preferences.children_ages : []
                })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-600"
              />
              <span className="ml-2 text-sm text-gray-700">
                I have children and want to see family-friendly events
              </span>
            </label>

            {preferences.has_children && (
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  Select your children's age groups for better recommendations:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {AGE_GROUPS.map(ageGroup => (
                    <label
                      key={ageGroup.value}
                      className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                        preferences.children_ages.includes(ageGroup.value)
                          ? 'bg-blue-50 border-blue-500'
                          : 'bg-white border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={preferences.children_ages.includes(ageGroup.value)}
                        onChange={() => handleChildAgeToggle(ageGroup.value)}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium">
                        {ageGroup.label}
                      </span>
                      {preferences.children_ages.includes(ageGroup.value) && (
                        <CheckIcon className="w-4 h-4 ml-auto text-blue-600" />
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Schedule Preferences */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Schedule Preferences
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Select days when you're typically available for events
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {DAYS_OF_WEEK.map(day => (
                <label
                  key={day}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                    preferences.preferred_days.includes(day)
                      ? 'bg-blue-50 border-blue-500'
                      : 'bg-white border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={preferences.preferred_days.includes(day)}
                    onChange={() => handleDayToggle(day)}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium">
                    {day}
                  </span>
                  {preferences.preferred_days.includes(day) && (
                    <CheckIcon className="w-4 h-4 ml-auto text-blue-600" />
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Budget Preferences */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Budget Preferences
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price Range Preference
                </label>
                <select
                  value={preferences.preferred_price_range}
                  onChange={(e) => setPreferences({ 
                    ...preferences, 
                    preferred_price_range: e.target.value 
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="any">Any price</option>
                  <option value="free">Free events only</option>
                  <option value="budget">Budget-friendly (Under $25)</option>
                  <option value="moderate">Moderate ($25-$50)</option>
                  <option value="premium">Premium ($50+)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Event Cost (Optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    $
                  </span>
                  <input
                    type="number"
                    value={preferences.max_event_cost || ''}
                    onChange={(e) => setPreferences({ 
                      ...preferences, 
                      max_event_cost: e.target.value ? parseFloat(e.target.value) : null
                    })}
                    min="0"
                    step="5"
                    placeholder="No limit"
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  We'll only show events within your budget
                </p>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Notifications
            </h3>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.notification_enabled}
                onChange={(e) => setPreferences({ 
                  ...preferences, 
                  notification_enabled: e.target.checked 
                })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-600"
              />
              <span className="ml-2 text-sm text-gray-700">
                Email me about new events matching my preferences
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default UserPreferencesModal;