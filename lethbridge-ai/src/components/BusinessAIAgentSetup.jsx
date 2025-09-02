import React, { useState, useEffect } from 'react';
import { aiAgentService } from '../services/supabase';
import { 
  SparklesIcon,
  ChatBubbleBottomCenterTextIcon,
  DocumentTextIcon,
  QuestionMarkCircleIcon,
  CogIcon,
  CheckIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const PERSONALITY_OPTIONS = [
  { value: 'professional', label: 'Professional', description: 'Formal and business-like' },
  { value: 'friendly', label: 'Friendly', description: 'Warm and welcoming' },
  { value: 'casual', label: 'Casual', description: 'Relaxed and conversational' }
];

function BusinessAIAgentSetup({ businessId, currentConfig, onSave, onClose }) {
  const [activeTab, setActiveTab] = useState('basic');
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    agent_name: currentConfig?.agent_name || 'Business Assistant',
    agent_personality: currentConfig?.agent_personality || 'friendly',
    welcome_message: currentConfig?.welcome_message || '',
    is_active: currentConfig?.is_active || false,
    max_response_length: currentConfig?.max_response_length || 500,
    business_info: currentConfig?.business_info || {
      description: '',
      hours: '',
      services: '',
      specialties: ''
    },
    menu_data: currentConfig?.menu_data || {
      categories: []
    },
    faq_data: currentConfig?.faq_data || [],
    policies: currentConfig?.policies || {
      return_policy: '',
      cancellation_policy: '',
      privacy_policy: ''
    }
  });

  // Sample welcome messages
  const sampleWelcomes = {
    professional: "Good day! I'm here to assist you with any questions about our business. How may I help you today?",
    friendly: "Hi there! 👋 Welcome! I'm here to help answer any questions you have. What can I help you with today?",
    casual: "Hey! What's up? I'm here to help with whatever you need. Just ask away!"
  };

  const handlePersonalityChange = (personality) => {
    setConfig({
      ...config,
      agent_personality: personality,
      welcome_message: config.welcome_message || sampleWelcomes[personality]
    });
  };

  const handleAddFAQ = () => {
    setConfig({
      ...config,
      faq_data: [...config.faq_data, { question: '', answer: '' }]
    });
  };

  const handleUpdateFAQ = (index, field, value) => {
    const updatedFAQ = [...config.faq_data];
    updatedFAQ[index][field] = value;
    setConfig({ ...config, faq_data: updatedFAQ });
  };

  const handleRemoveFAQ = (index) => {
    setConfig({
      ...config,
      faq_data: config.faq_data.filter((_, i) => i !== index)
    });
  };

  const handleAddMenuCategory = () => {
    setConfig({
      ...config,
      menu_data: {
        ...config.menu_data,
        categories: [
          ...config.menu_data.categories,
          { name: '', items: [] }
        ]
      }
    });
  };

  const handleUpdateMenuCategory = (index, value) => {
    const updatedCategories = [...config.menu_data.categories];
    updatedCategories[index].name = value;
    setConfig({
      ...config,
      menu_data: { ...config.menu_data, categories: updatedCategories }
    });
  };

  const handleAddMenuItem = (categoryIndex) => {
    const updatedCategories = [...config.menu_data.categories];
    updatedCategories[categoryIndex].items.push({
      name: '',
      description: '',
      price: ''
    });
    setConfig({
      ...config,
      menu_data: { ...config.menu_data, categories: updatedCategories }
    });
  };

  const handleUpdateMenuItem = (categoryIndex, itemIndex, field, value) => {
    const updatedCategories = [...config.menu_data.categories];
    updatedCategories[categoryIndex].items[itemIndex][field] = value;
    setConfig({
      ...config,
      menu_data: { ...config.menu_data, categories: updatedCategories }
    });
  };

  const handleRemoveMenuItem = (categoryIndex, itemIndex) => {
    const updatedCategories = [...config.menu_data.categories];
    updatedCategories[categoryIndex].items = updatedCategories[categoryIndex].items.filter(
      (_, i) => i !== itemIndex
    );
    setConfig({
      ...config,
      menu_data: { ...config.menu_data, categories: updatedCategories }
    });
  };

  const handleRemoveMenuCategory = (index) => {
    const updatedCategories = config.menu_data.categories.filter((_, i) => i !== index);
    setConfig({
      ...config,
      menu_data: { ...config.menu_data, categories: updatedCategories }
    });
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSave(config);
      toast.success('AI Agent configuration saved successfully!');
      onClose();
    } catch (error) {
      console.error('Error saving AI agent config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center">
            <SparklesIcon className="w-6 h-6 text-purple-600 mr-2" />
            <h2 className="text-xl font-semibold">AI Business Assistant Setup</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex space-x-8 px-6">
            {[
              { id: 'basic', label: 'Basic Settings', icon: CogIcon },
              { id: 'business', label: 'Business Info', icon: DocumentTextIcon },
              { id: 'menu', label: 'Menu/Services', icon: DocumentTextIcon },
              { id: 'faq', label: 'FAQs', icon: QuestionMarkCircleIcon },
              { id: 'policies', label: 'Policies', icon: DocumentTextIcon }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Basic Settings Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div>
                <label className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    checked={config.is_active}
                    onChange={(e) => setConfig({ ...config, is_active: e.target.checked })}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-600"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    Enable AI Assistant
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assistant Name
                </label>
                <input
                  type="text"
                  value={config.agent_name}
                  onChange={(e) => setConfig({ ...config, agent_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                  placeholder="Business Assistant"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Personality
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {PERSONALITY_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => handlePersonalityChange(option.value)}
                      className={`p-4 rounded-lg border-2 text-center transition-all ${
                        config.agent_personality === option.value
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium mb-1">{option.label}</div>
                      <div className="text-xs text-gray-600">{option.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Welcome Message
                </label>
                <textarea
                  value={config.welcome_message}
                  onChange={(e) => setConfig({ ...config, welcome_message: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                  placeholder="Hi! How can I help you today?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Response Length
                </label>
                <input
                  type="number"
                  value={config.max_response_length}
                  onChange={(e) => setConfig({ ...config, max_response_length: parseInt(e.target.value) || 500 })}
                  min="100"
                  max="1000"
                  step="50"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Characters per response (100-1000)
                </p>
              </div>
            </div>
          )}

          {/* Business Info Tab */}
          {activeTab === 'business' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Description
                </label>
                <textarea
                  value={config.business_info.description}
                  onChange={(e) => setConfig({
                    ...config,
                    business_info: { ...config.business_info, description: e.target.value }
                  })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                  placeholder="Tell customers about your business..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Hours
                </label>
                <textarea
                  value={config.business_info.hours}
                  onChange={(e) => setConfig({
                    ...config,
                    business_info: { ...config.business_info, hours: e.target.value }
                  })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                  placeholder="Mon-Fri: 9AM-5PM&#10;Sat: 10AM-4PM&#10;Sun: Closed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Services Offered
                </label>
                <textarea
                  value={config.business_info.services}
                  onChange={(e) => setConfig({
                    ...config,
                    business_info: { ...config.business_info, services: e.target.value }
                  })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                  placeholder="List your main services..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specialties
                </label>
                <textarea
                  value={config.business_info.specialties}
                  onChange={(e) => setConfig({
                    ...config,
                    business_info: { ...config.business_info, specialties: e.target.value }
                  })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                  placeholder="What makes your business unique..."
                />
              </div>
            </div>
          )}

          {/* Menu/Services Tab */}
          {activeTab === 'menu' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Menu Categories</h3>
                <button
                  onClick={handleAddMenuCategory}
                  className="flex items-center px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                >
                  <PlusIcon className="w-4 h-4 mr-1" />
                  Add Category
                </button>
              </div>

              {config.menu_data.categories.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No menu categories yet</p>
                  <p className="text-sm text-gray-500">Add categories to organize your menu</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {config.menu_data.categories.map((category, categoryIndex) => (
                    <div key={categoryIndex} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <input
                          type="text"
                          value={category.name}
                          onChange={(e) => handleUpdateMenuCategory(categoryIndex, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 mr-2"
                          placeholder="Category name"
                        />
                        <button
                          onClick={() => handleRemoveMenuCategory(categoryIndex)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-3 ml-4">
                        {category.items.map((item, itemIndex) => (
                          <div key={itemIndex} className="flex gap-2 items-start">
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => handleUpdateMenuItem(categoryIndex, itemIndex, 'name', e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                                placeholder="Item name"
                              />
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => handleUpdateMenuItem(categoryIndex, itemIndex, 'description', e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                                placeholder="Description"
                              />
                              <input
                                type="text"
                                value={item.price}
                                onChange={(e) => handleUpdateMenuItem(categoryIndex, itemIndex, 'price', e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                                placeholder="Price"
                              />
                            </div>
                            <button
                              onClick={() => handleRemoveMenuItem(categoryIndex, itemIndex)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => handleAddMenuItem(categoryIndex)}
                        className="mt-3 flex items-center px-3 py-1 text-purple-600 hover:bg-purple-50 rounded-lg text-sm"
                      >
                        <PlusIcon className="w-4 h-4 mr-1" />
                        Add Item
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* FAQs Tab */}
          {activeTab === 'faq' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Frequently Asked Questions</h3>
                <button
                  onClick={handleAddFAQ}
                  className="flex items-center px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                >
                  <PlusIcon className="w-4 h-4 mr-1" />
                  Add FAQ
                </button>
              </div>

              {config.faq_data.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <QuestionMarkCircleIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No FAQs yet</p>
                  <p className="text-sm text-gray-500">Add common questions and answers</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {config.faq_data.map((faq, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Question
                          </label>
                          <input
                            type="text"
                            value={faq.question}
                            onChange={(e) => handleUpdateFAQ(index, 'question', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                            placeholder="Enter question..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Answer
                          </label>
                          <textarea
                            value={faq.answer}
                            onChange={(e) => handleUpdateFAQ(index, 'answer', e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                            placeholder="Enter answer..."
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveFAQ(index)}
                        className="mt-3 flex items-center px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg text-sm"
                      >
                        <TrashIcon className="w-4 h-4 mr-1" />
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Policies Tab */}
          {activeTab === 'policies' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Return Policy
                </label>
                <textarea
                  value={config.policies.return_policy}
                  onChange={(e) => setConfig({
                    ...config,
                    policies: { ...config.policies, return_policy: e.target.value }
                  })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                  placeholder="Describe your return policy..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cancellation Policy
                </label>
                <textarea
                  value={config.policies.cancellation_policy}
                  onChange={(e) => setConfig({
                    ...config,
                    policies: { ...config.policies, cancellation_policy: e.target.value }
                  })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                  placeholder="Describe your cancellation policy..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Privacy Policy
                </label>
                <textarea
                  value={config.policies.privacy_policy}
                  onChange={(e) => setConfig({
                    ...config,
                    policies: { ...config.policies, privacy_policy: e.target.value }
                  })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                  placeholder="Describe your privacy policy..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {config.is_active ? (
              <span className="flex items-center text-green-600">
                <CheckIcon className="w-4 h-4 mr-1" />
                AI Assistant is active
              </span>
            ) : (
              <span className="flex items-center text-gray-500">
                AI Assistant is inactive
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BusinessAIAgentSetup;