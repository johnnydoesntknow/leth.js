import React, { useState, useEffect } from 'react';
import { businessService, eventService, aiAgentService, imageService, subscriptionService } from '../services/supabase';
import { aiService, EVENT_CATEGORIES } from '../services/openai';
import BusinessAIAgentSetup from '../components/BusinessAIAgentSetup';
import { 
  PlusIcon, 
  CalendarIcon, 
  ChartBarIcon,
  BuildingOfficeIcon,
  PencilIcon,
  TrashIcon,
  SparklesIcon,
  EyeIcon,
  XMarkIcon,
  CheckIcon,
  PhotoIcon,
  CogIcon,
  BanknotesIcon,
  ChatBubbleBottomCenterTextIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

// Simple date formatter
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  return date.toLocaleDateString('en-US', options);
};

function DashboardPage({ user, profile }) {
  const [activeTab, setActiveTab] = useState('events');
  const [business, setBusiness] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiAgentConfig, setAIAgentConfig] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [subscriptionTiers, setSubscriptionTiers] = useState([]);

  useEffect(() => {
    loadBusinessData();
    loadSubscriptionTiers();
  }, [user]);

  const loadBusinessData = async () => {
    try {
      const businesses = await businessService.getBusinesses();
      const userBusiness = businesses.find(b => b.owner_id === user.id);
      
      if (userBusiness) {
        setBusiness(userBusiness);
        const businessEvents = await businessService.getBusinessEvents(userBusiness.id);
        setEvents(businessEvents);
        
        // Load AI agent config
        const agentConfig = await aiAgentService.getAgentConfig(userBusiness.id);
        setAIAgentConfig(agentConfig);
        
        // Load analytics
        const analyticsData = await businessService.getBusinessAnalytics(userBusiness.id);
        setAnalytics(analyticsData);
      }
    } catch (error) {
      console.error('Error loading business data:', error);
      toast.error('Error loading your business data');
    } finally {
      setLoading(false);
    }
  };

  const loadSubscriptionTiers = async () => {
    try {
      const tiers = await subscriptionService.getTiers();
      setSubscriptionTiers(tiers);
    } catch (error) {
      console.error('Error loading subscription tiers:', error);
    }
  };

  const handleCreateBusiness = async (businessData) => {
    try {
      const newBusiness = await businessService.createBusiness({
        ...businessData,
        owner_id: user.id
      });
      setBusiness(newBusiness);
      toast.success('Business profile created successfully!');
      loadBusinessData();
    } catch (error) {
      toast.error('Error creating business profile');
      console.error('Error:', error);
    }
  };

  const handleAIAgentSave = async (config) => {
    try {
      if (aiAgentConfig) {
        await aiAgentService.updateAgentConfig(business.id, config);
      } else {
        await aiAgentService.createAgentConfig(business.id, config);
      }
      toast.success('AI Agent configuration saved!');
      setShowAIModal(false);
      loadBusinessData();
    } catch (error) {
      toast.error('Error saving AI Agent configuration');
      console.error('Error:', error);
    }
  };

  // Get current subscription tier
  const currentTier = business?.subscription_tier || subscriptionTiers.find(t => t.name === 'starter') || {
    name: 'starter',
    max_events_per_month: 10,
    max_images_per_event: 3,
    ai_agent_enabled: false,
    ai_agent_monthly_queries: 0
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!business) {
    return <CreateBusinessForm onSubmit={handleCreateBusiness} />;
  }

  const tabs = [
    { id: 'events', label: 'Events', icon: CalendarIcon },
    { id: 'analytics', label: 'Analytics', icon: ChartBarIcon },
    { id: 'ai-agent', label: 'AI Assistant', icon: ChatBubbleBottomCenterTextIcon },
    { id: 'settings', label: 'Settings', icon: CogIcon }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{business.name}</h1>
            <p className="mt-2 text-gray-600">
              {currentTier.name === 'starter' ? 'Starter' : 
               currentTier.name === 'professional' ? 'Professional' : 'Enterprise'} Plan
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Monthly Events</p>
            <p className="text-2xl font-bold text-gray-900">
              {events.length} / {currentTier.max_events_per_month === -1 ? '∞' : currentTier.max_events_per_month}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                disabled={tab.id === 'ai-agent' && !currentTier.ai_agent_enabled}
                className={`relative flex-1 py-4 px-1 text-center font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-500'
                    : 'text-gray-500 hover:text-gray-700'
                } ${tab.id === 'ai-agent' && !currentTier.ai_agent_enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center justify-center">
                  <tab.icon className="w-5 h-5 mr-2" />
                  <span>{tab.label}</span>
                </div>
                {tab.id === 'ai-agent' && !currentTier.ai_agent_enabled && (
                  <span className="absolute -top-1 -right-1 bg-yellow-400 text-xs px-1.5 py-0.5 rounded-full">
                    Pro
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Events Tab */}
          {activeTab === 'events' && (
            <EventsTab 
              events={events} 
              business={business}
              currentTier={currentTier}
              onUpdate={loadBusinessData}
            />
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <AnalyticsTab 
              events={events}
              analytics={analytics}
              currentTier={currentTier}
            />
          )}

          {/* AI Agent Tab */}
          {activeTab === 'ai-agent' && (
            currentTier.ai_agent_enabled ? (
              <div>
                {showAIModal ? (
                  <BusinessAIAgentSetup
                    businessId={business.id}
                    businessInfo={business}
                    currentConfig={aiAgentConfig}
                    onSave={handleAIAgentSave}
                    onClose={() => setShowAIModal(false)}
                  />
                ) : (
                  <div>
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-2">AI Business Assistant</h3>
                      <p className="text-gray-600">
                        Your AI assistant can answer customer questions about your business 24/7.
                      </p>
                    </div>

                    {aiAgentConfig ? (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-medium">Status: {aiAgentConfig.is_active ? 'Active' : 'Inactive'}</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {aiAgentConfig.monthly_queries_used} / {aiAgentConfig.monthly_queries_limit} queries used this month
                            </p>
                          </div>
                          <button
                            onClick={() => setShowAIModal(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            Configure
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowAIModal(true)}
                        className="w-full py-12 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
                      >
                        <ChatBubbleBottomCenterTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600">Set up your AI Assistant</p>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <ChatBubbleBottomCenterTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">AI Assistant not available</h3>
                <p className="text-gray-600 mb-4">Upgrade to Professional plan to enable AI features</p>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Upgrade Plan
                </button>
              </div>
            )
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <SettingsTab 
              business={business}
              currentTier={currentTier}
              subscriptionTiers={subscriptionTiers}
              onUpdate={loadBusinessData}
              onUpgrade={() => toast.info('Subscription upgrade coming soon!')}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Create Business Form Component
function CreateBusinessForm({ onSubmit }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    address: '',
    phone: '',
    email: '',
    website: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.category) {
      toast.error('Please provide business name and category');
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Your Business Profile</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            >
              <option value="">Select a category</option>
              <option value="restaurant">Restaurant</option>
              <option value="retail">Retail</option>
              <option value="services">Services</option>
              <option value="entertainment">Entertainment</option>
              <option value="health">Health & Wellness</option>
              <option value="education">Education</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Website
            </label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <button
            onClick={handleSubmit}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Business Profile
          </button>
        </div>
      </div>
    </div>
  );
}

// Events Tab Component
function EventsTab({ events, business, currentTier, onUpdate }) {
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  const handleDelete = async (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await eventService.deleteEvent(eventId);
        toast.success('Event deleted successfully');
        onUpdate();
      } catch (error) {
        toast.error('Error deleting event');
      }
    }
  };

  const canCreateMoreEvents = () => {
    if (currentTier.max_events_per_month === -1) return true;
    const thisMonth = new Date().getMonth();
    const eventsThisMonth = events.filter(e => 
      new Date(e.created_at).getMonth() === thisMonth
    ).length;
    return eventsThisMonth < currentTier.max_events_per_month;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">Your Events</h3>
        {canCreateMoreEvents() ? (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Create Event
          </button>
        ) : (
          <div className="text-sm text-gray-600">
            Event limit reached for this month
          </div>
        )}
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No events yet</h3>
          <p className="text-gray-600 mb-4">Create your first event to start attracting customers!</p>
          {canCreateMoreEvents() && (
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Create Your First Event
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <EventCard 
              key={event.id} 
              event={event} 
              onEdit={() => {
                setEditingEvent(event);
                setShowModal(true);
              }}
              onDelete={() => handleDelete(event.id)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <EventModal
          event={editingEvent}
          business={business}
          currentTier={currentTier}
          onClose={() => {
            setShowModal(false);
            setEditingEvent(null);
          }}
          onSave={onUpdate}
        />
      )}
    </div>
  );
}

// Analytics Tab Component
function AnalyticsTab({ events, analytics, currentTier }) {
  const totalViews = events.reduce((sum, event) => sum + (event.view_count || 0), 0);
  const averageViews = events.length > 0 ? Math.round(totalViews / events.length) : 0;

  return (
    <div>
      <h3 className="text-lg font-semibold mb-6">Performance Analytics</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Events</p>
              <p className="text-3xl font-bold text-gray-900">{events.length}</p>
            </div>
            <CalendarIcon className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Views</p>
              <p className="text-3xl font-bold text-gray-900">{totalViews}</p>
            </div>
            <EyeIcon className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Average Views</p>
              <p className="text-3xl font-bold text-gray-900">{averageViews}</p>
            </div>
            <ChartBarIcon className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Top Performing Events */}
      <div>
        <h4 className="font-medium text-gray-900 mb-4">Top Performing Events</h4>
        <div className="space-y-3">
          {events
            .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
            .slice(0, 5)
            .map((event) => (
              <div key={event.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                <div>
                  <p className="font-medium text-gray-900">{event.title}</p>
                  <p className="text-sm text-gray-600">
                    {formatDate(event.start_date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{event.view_count || 0}</p>
                  <p className="text-sm text-gray-600">views</p>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* AI Agent Analytics */}
      {analytics?.aiAgent && (
        <div className="mt-8">
          <h4 className="font-medium text-gray-900 mb-4">AI Assistant Performance</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Monthly Queries</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.aiAgent.monthly_queries_used} / {analytics.aiAgent.monthly_queries_limit}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Query Usage</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round((analytics.aiAgent.monthly_queries_used / analytics.aiAgent.monthly_queries_limit) * 100)}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Settings Tab Component
function SettingsTab({ business, currentTier, subscriptionTiers, onUpdate, onUpgrade }) {
  const [formData, setFormData] = useState({
    name: business.name,
    description: business.description || '',
    category: business.category || '',
    address: business.address || '',
    phone: business.phone || '',
    email: business.email || '',
    website: business.website || ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await businessService.updateBusiness(business.id, formData);
      onUpdate(formData);
      toast.success('Business profile updated successfully!');
    } catch (error) {
      toast.error('Error updating business profile');
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-6">Business Settings</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Business Information */}
        <div>
          <h4 className="font-medium text-gray-900 mb-4">Business Information</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">Select a category</option>
                <option value="restaurant">Restaurant</option>
                <option value="retail">Retail</option>
                <option value="services">Services</option>
                <option value="entertainment">Entertainment</option>
                <option value="health">Health & Wellness</option>
                <option value="education">Education</option>
                <option value="other">Other</option>
              </select>
            </div>

            <button
              onClick={handleSubmit}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </div>

        {/* Subscription Plans */}
        <div>
          <h4 className="font-medium text-gray-900 mb-4">Subscription Plan</h4>
          <div className="space-y-4">
            {subscriptionTiers.map((tier) => (
              <div
                key={tier.id}
                className={`p-4 border rounded-lg ${
                  tier.name === currentTier.name
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h5 className="font-medium text-gray-900">
                    {tier.name === 'starter' ? 'Starter' : 
                     tier.name === 'professional' ? 'Professional' : 'Enterprise'}
                  </h5>
                  <span className="text-lg font-bold">
                    ${tier.price}/mo
                  </span>
                </div>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>
                    {tier.max_events_per_month === -1 
                      ? '✓ Unlimited events' 
                      : `✓ ${tier.max_events_per_month} events/month`}
                  </li>
                  {tier.ai_agent_enabled && (
                    <li>✓ AI Business Agent ({tier.ai_agent_monthly_queries} queries)</li>
                  )}
                  <li>✓ {tier.max_images_per_event} images per event</li>
                  {tier.features && JSON.parse(tier.features).map((feature, idx) => (
                    <li key={idx}>✓ {feature}</li>
                  ))}
                </ul>
                {tier.name !== currentTier.name && (
                  <button
                    onClick={() => onUpgrade(tier)}
                    className="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {tier.price > currentTier.price ? 'Upgrade' : 'Switch'} to {tier.name}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Event Card Component
function EventCard({ event, onEdit, onDelete }) {
  const isUpcoming = new Date(event.start_date) > new Date();
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      {event.event_images && event.event_images[0] ? (
        <img 
          src={event.event_images[0].image_url} 
          alt={event.title}
          className="w-full h-48 object-cover"
        />
      ) : (
        <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
          <CalendarIcon className="w-16 h-16 text-gray-400" />
        </div>
      )}
      
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-semibold text-gray-900">{event.title}</h4>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            isUpcoming ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {isUpcoming ? 'Upcoming' : 'Past'}
          </span>
        </div>
        
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{event.description}</p>
        
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            <span>{formatDate(event.start_date)}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPinIcon className="w-4 h-4" />
            <span className="line-clamp-1">{event.location}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className={`font-medium ${event.is_free ? 'text-green-600' : 'text-gray-900'}`}>
              {event.is_free ? 'Free' : `$${event.cost}`}
            </span>
            <div className="flex items-center gap-1">
              <EyeIcon className="w-4 h-4" />
              <span>{event.view_count || 0}</span>
            </div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t flex gap-2">
          <button
            onClick={onEdit}
            className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="flex-1 px-3 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-sm"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// Event Modal Component
function EventModal({ event, business, currentTier, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: event?.title || '',
    description: event?.description || '',
    category: event?.category || '',
    location: event?.location || '',
    address: event?.address || '',
    start_date: event?.start_date || '',
    end_date: event?.end_date || '',
    cost: event?.cost || 0,
    is_free: event?.is_free || false,
    age_min: event?.age_min || 0,
    age_max: event?.age_max || 99,
    website_url: event?.website_url || '',
    images: []
  });
  const [enhancing, setEnhancing] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const eventData = {
        ...formData,
        business_id: business.id,
        organizer_id: business.owner_id
      };

      if (event) {
        await eventService.updateEvent(event.id, eventData);
        toast.success('Event updated successfully!');
      } else {
        await eventService.createEvent(eventData, formData.images);
        toast.success('Event created successfully!');
      }
      onSave();
      onClose();
    } catch (error) {
      toast.error('Error saving event');
      console.error('Error:', error);
    }
  };

  const handleEnhanceDescription = async () => {
    if (!formData.title || !formData.description) {
      toast.error('Please provide a title and basic description first');
      return;
    }

    setEnhancing(true);
    try {
      const enhanced = await aiService.enhanceEventDescription({
        title: formData.title,
        category: formData.category,
        description: formData.description
      });
      setFormData({ ...formData, description: enhanced });
      toast.success('Description enhanced with AI!');
    } catch (error) {
      toast.error('Error enhancing description');
    } finally {
      setEnhancing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {event ? 'Edit Event' : 'Create New Event'}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              >
                <option value="">Select a category</option>
                {EVENT_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                maxLength={currentTier.max_event_description_length}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
              <div className="mt-2 flex justify-between items-center">
                <p className="text-sm text-gray-500">
                  {formData.description.length} / {currentTier.max_event_description_length} characters
                </p>
                <button
                  type="button"
                  onClick={handleEnhanceDescription}
                  disabled={enhancing}
                  className="flex items-center px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 disabled:opacity-50"
                >
                  <SparklesIcon className="w-4 h-4 mr-1" />
                  {enhancing ? 'Enhancing...' : 'Enhance with AI'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="Venue name or area"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="123 Main St, Lethbridge, AB"
              />
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_free}
                  onChange={(e) => setFormData({ ...formData, is_free: e.target.checked, cost: 0 })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-600 mr-2"
                />
                <span className="text-sm font-medium text-gray-700">This is a free event</span>
              </label>
            </div>

            {!formData.is_free && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Cost
                </label>
                <input
                  type="number"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Age
                </label>
                <input
                  type="number"
                  value={formData.age_min}
                  onChange={(e) => setFormData({ ...formData, age_min: parseInt(e.target.value) || 0 })}
                  min="0"
                  max="99"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Age
                </label>
                <input
                  type="number"
                  value={formData.age_max}
                  onChange={(e) => setFormData({ ...formData, age_max: parseInt(e.target.value) || 99 })}
                  min="0"
                  max="99"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {event ? 'Update Event' : 'Create Event'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;