import React, { useState, useEffect } from 'react';
import { businessService, eventService, aiAgentService, imageService, supabase, subscriptionService } from '../services/supabase';
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
    if (!user || profile?.profile_type !== 'business') return;
    
    loadSubscriptionTiers();
    loadBusinessData();
  }, [user, profile]);

  const loadBusinessData = async () => {
    try {
      setLoading(true);
      
      const businessData = await businessService.getBusinessByOwner(user.id);
      if (businessData) {
        setBusiness(businessData);
        
        // Load events
        const { data: eventsData } = await supabase
          .from('events')
          .select('*')
          .eq('business_id', businessData.id)
          .order('start_date', { ascending: false });
        
        setEvents(eventsData || []);
        
        // Load AI config
        const agentConfig = await aiAgentService.getAgentConfig(businessData.id);
        setAIAgentConfig(agentConfig);
      }
    } catch (error) {
      console.error('Error loading business data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSubscriptionTiers = async () => {
    try {
      const tiers = await subscriptionService.getTiers();
      setSubscriptionTiers(tiers || []);
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

  // Handle plan upgrades
  const handleUpgradePlan = async (tier) => {
    const confirmUpgrade = window.confirm(
      `Upgrade to ${tier.name.charAt(0).toUpperCase() + tier.name.slice(1)} plan for $${tier.price}/month?\n\n` +
      `${tier.name === 'pro' ? '✨ This will unlock the AI Business Assistant!' : 'This will unlock additional features.'}\n\n` +
      `Note: This is a demo simulation - no actual payment will be processed.`
    );

    if (!confirmUpgrade) return;

    const loadingToast = toast.loading(`Processing upgrade to ${tier.name} plan...`);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const tierData = await subscriptionService.getTierByName(tier.name);
      if (!tierData) {
        throw new Error('Could not find subscription tier');
      }

      await businessService.updateBusiness(business.id, {
        subscription_tier_id: tierData.id
      });

      // If upgrading to Pro, create/enable AI agent
      if (tier.name === 'pro') {
        if (!aiAgentConfig) {
          await aiAgentService.createAgentConfig(business.id, {
            is_active: true,
            agent_personality: 'professional',
            welcome_message: 'Hello! How can I help you today?',
            business_info: {
              description: business.description || '',
              hours: business.hours || '',
              services: business.services || []
            },
            agent_name: business.name + ' Assistant',
            max_response_length: 500
          });
        } else {
          await aiAgentService.updateAgentConfig(business.id, {
            is_active: true
          });
        }
      }

      toast.dismiss(loadingToast);
      toast.success(
        <div>
          <strong>🎉 Successfully upgraded to {tier.name}!</strong>
          {tier.name === 'pro' && (
            <p className="text-sm mt-1">
              Your AI Assistant is now active! Check the AI Assistant tab to configure it.
            </p>
          )}
        </div>,
        { duration: 5000 }
      );

      await loadBusinessData();
      
      if (tier.name === 'pro') {
        setActiveTab('ai-agent');
      }

    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(`Upgrade Failed: ${error.message}`);
      console.error('Upgrade error:', error);
    }
  };

  // Handle plan downgrades
  const handleDowngradePlan = async (tier) => {
    const confirmDowngrade = window.confirm(
      `Downgrade to ${tier.name.charAt(0).toUpperCase() + tier.name.slice(1)} plan for $${tier.price}/month?\n\n` +
      `⚠️ You will lose access to some features.\n\n` +
      `Note: This is a demo simulation.`
    );

    if (!confirmDowngrade) return;

    const loadingToast = toast.loading(`Processing downgrade to ${tier.name} plan...`);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const tierData = await subscriptionService.getTierByName(tier.name);
      if (!tierData) {
        throw new Error('Could not find subscription tier');
      }

      await businessService.updateBusiness(business.id, {
        subscription_tier_id: tierData.id
      });

      // If downgrading from Pro, disable AI
      if (currentTier.name === 'pro' && tier.name !== 'pro') {
        if (aiAgentConfig) {
          await aiAgentService.updateAgentConfig(business.id, {
            is_active: false
          });
        }
      }

      toast.dismiss(loadingToast);
      toast.success(`Successfully changed to ${tier.name} plan`, { duration: 4000 });
      
      await loadBusinessData();
      
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(`Downgrade failed: ${error.message}`);
      console.error('Downgrade error:', error);
    }
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
               currentTier.name === 'professional' ? 'Professional' : 'Pro'} Plan
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
                              {aiAgentConfig.monthly_queries_used || 0} / {aiAgentConfig.monthly_queries_limit || 1000} queries used this month
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
                <p className="text-gray-600 mb-4">Upgrade to Pro plan to enable AI features</p>
                <button 
                  onClick={() => setActiveTab('settings')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  View Upgrade Options
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
              aiAgentConfig={aiAgentConfig}
              onUpdate={loadBusinessData}
              onUpgrade={handleUpgradePlan}
              onDowngrade={handleDowngradePlan}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Settings Tab Component with properly working subscription plans
// Settings Tab Component with COMPLETE feature lists
function SettingsTab({ business, currentTier, subscriptionTiers, aiAgentConfig, onUpdate, onUpgrade, onDowngrade }) {
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
      onUpdate();
      toast.success('Business profile updated successfully!');
    } catch (error) {
      toast.error('Error updating business profile');
      console.error('Error:', error);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-6">Business Settings</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Business Information Form */}
        <div>
          <h4 className="font-medium text-gray-900 mb-4">Business Information</h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ... form fields ... */}
            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save Changes
            </button>
          </form>
        </div>

        {/* Subscription Plans - COMPLETE */}
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Subscription Plans</h4>
          <p className="text-sm text-gray-600 mb-6">
            Choose the plan that best fits your business needs
          </p>
          
          <div className="space-y-4">
            {/* Starter Plan - $14/month */}
            <div className={`p-6 border-2 rounded-lg transition-all ${
              currentTier.name === 'starter' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h5 className="font-bold text-lg text-gray-900">Starter</h5>
                  {currentTier.name === 'starter' && (
                    <span className="inline-block mt-1 px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded">
                      CURRENT PLAN
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-3xl font-bold">$14</span>
                  <span className="text-gray-600">/mo</span>
                </div>
              </div>
              
              <ul className="space-y-2 text-sm text-gray-600 mb-4">
                <li className="flex items-start">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Up to 10 events per month</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>3 images per event</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Basic analytics</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Standard listing placement</span>
                </li>
              </ul>
              
              {currentTier.name !== 'starter' && (
                <button
                  onClick={() => onDowngrade({ name: 'starter', price: 14 })}
                  className="w-full px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white font-semibold rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all shadow-sm"
                >
                  Downgrade to Starter
                </button>
              )}
            </div>

            {/* Professional Plan - $29/month */}
            <div className={`p-6 border-2 rounded-lg transition-all relative ${
              currentTier.name === 'professional' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-blue-400'
            }`}>
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  MOST POPULAR
                </span>
              </div>
              
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h5 className="font-bold text-lg text-gray-900">Professional</h5>
                  {currentTier.name === 'professional' && (
                    <span className="inline-block mt-1 px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded">
                      CURRENT PLAN
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-3xl font-bold">$29</span>
                  <span className="text-gray-600">/mo</span>
                </div>
              </div>
              
              <ul className="space-y-2 text-sm text-gray-600 mb-4">
                <li className="flex items-start">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="font-semibold text-gray-900">Unlimited events</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>10 images per event</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="font-semibold text-gray-900">Priority placement in search</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Advanced analytics & insights</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Featured business badge</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Email marketing tools (coming soon)</span>
                </li>
              </ul>
              
              {currentTier.name !== 'professional' && (
                <button
                  onClick={() => {
                    if (currentTier.name === 'starter') {
                      onUpgrade({ name: 'professional', price: 29 });
                    } else {
                      onDowngrade({ name: 'professional', price: 29 });
                    }
                  }}
                  className={`w-full px-4 py-2 font-semibold rounded-lg transition-all shadow-sm ${
                    currentTier.name === 'starter'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                      : 'bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-700 hover:to-gray-800'
                  }`}
                >
                  {currentTier.name === 'starter' ? 'Upgrade' : 'Downgrade'} to Professional
                </button>
              )}
            </div>

            {/* Pro Plan - $50/month */}
            <div className={`p-6 border-2 rounded-lg transition-all ${
              currentTier.name === 'pro' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h5 className="font-bold text-lg text-gray-900">Pro</h5>
                  {currentTier.name === 'pro' && (
                    <span className="inline-block mt-1 px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded">
                      CURRENT PLAN
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-3xl font-bold">$50</span>  
                  <span className="text-gray-600">/mo</span>
                </div>
              </div>
              
              <ul className="space-y-2 text-sm text-gray-600 mb-4">
                <li className="flex items-start">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="font-semibold text-gray-900">Everything in Professional</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Unlimited images</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="font-semibold text-purple-600">🤖 AI Business Assistant (1000 queries/mo)</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Premium placement (always on top)</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Custom branding options</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Dedicated support</span>
                </li>
              </ul>
              
              {currentTier.name !== 'pro' && (
                <button
                  onClick={() => onUpgrade({ name: 'pro', price: 50 })}
                  className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg"
                >
                  Unlock AI with Pro
                </button>
              )}
            </div>
          </div>

          {/* Contact for Custom Plans */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 text-center">
              Need a custom plan for your business? 
              <button 
                onClick={() => window.open('mailto:support@lethbridgeai.com', '_blank')}
                className="ml-1 text-blue-600 hover:text-blue-700 font-semibold"
              >
                Contact us
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}



// Event Card Component (keeping the same)
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

// Event Modal Component (keeping the same with minor fix)
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
    if (!formData.description || formData.description.trim().length < 10) {
      toast.error('Please write at least a brief description first (10+ characters)');
      return;
    }

    setEnhancing(true);
    try {
      const enhancedText = await aiService.enhanceDescription(formData.description, 'event');
      setFormData({ ...formData, description: enhancedText });
      toast.success('Description enhanced with AI!');
    } catch (error) {
      console.error('Enhancement error:', error);
      toast.error(error.message || 'Failed to enhance description');
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

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Title *
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
                Category *
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

            {/* Description with AI Enhancement */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Description *
                </label>
                <button
                  type="button"
                  onClick={handleEnhanceDescription}
                  disabled={enhancing || !formData.description || formData.description.trim().length < 10}
                  className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                    enhancing || !formData.description || formData.description.trim().length < 10
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-sm'
                  }`}
                >
                  <SparklesIcon className="w-4 h-4" />
                  {enhancing ? 'Enhancing...' : 'Enhance with AI'}
                </button>
              </div>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="Describe your event in detail. What makes it special?"
                required
              />
              <div className="mt-1 text-xs text-gray-500">
                {formData.description && formData.description.length < 10 && 
                  'Add more detail (10+ chars) to enable AI enhancement'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date & Time *
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
                Location *
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

            <div className="flex justify-end gap-3 pt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {event ? 'Update Event' : 'Create Event'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;