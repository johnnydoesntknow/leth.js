// src/pages/EventsPage.jsx
import React, { useState, useEffect } from 'react';
import { eventService, imageService } from '../services/supabase';
import ChatModal from '../components/ChatModal';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { aiService } from '../services/openai';

import { 
  CalendarIcon, 
  MapPinIcon, 
  CurrencyDollarIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  XMarkIcon,
  PhotoIcon,
  LinkIcon,
  EnvelopeIcon,
  PhoneIcon,
  ChatBubbleLeftIcon,
  EyeIcon,
  SparklesIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

// Event Categories with icons
const EVENT_CATEGORIES = [
  { value: 'family_kids', label: 'Family & Kids', icon: '👨‍👩‍👧‍👦' },
  { value: 'sports_recreation', label: 'Sports & Recreation', icon: '⚽' },
  { value: 'arts_culture', label: 'Arts & Culture', icon: '🎨' },
  { value: 'music_concerts', label: 'Music & Concerts', icon: '🎵' },
  { value: 'food_dining', label: 'Food & Dining', icon: '🍽️' },
  { value: 'community', label: 'Community', icon: '👥' },
  { value: 'education', label: 'Education & Workshops', icon: '📚' },
  { value: 'business_networking', label: 'Business & Networking', icon: '💼' },
  { value: 'health_wellness', label: 'Health & Wellness', icon: '🧘' },
  { value: 'outdoor_adventure', label: 'Outdoor & Adventure', icon: '🏔️' },
  { value: 'nightlife', label: 'Nightlife & Entertainment', icon: '🌃' },
  { value: 'charity_volunteer', label: 'Charity & Volunteer', icon: '🤲' },
  { value: 'other', label: 'Other', icon: '📌' }
];

function EventsPage({ user, profile }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [selectedDetailEvent, setSelectedDetailEvent] = useState(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await eventService.getEvents();
      setEvents(data || []);
    } catch (error) {
      console.error('Error loading events:', error);
      toast.error('Failed to load events');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter(event => {
    if (filter !== 'all' && event.category !== filter) return false;
    if (searchTerm && !event.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !event.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const handleEdit = (event) => {
    setEditingEvent({
      ...event,
      contact_phone: event.contact_phone || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    
    try {
      await eventService.deleteEvent(id);
      toast.success('Event deleted successfully');
      loadEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    }
  };

  const handleCreateOrUpdate = async (eventData) => {
    try {
      if (editingEvent) {
        await eventService.updateEvent(editingEvent.id, eventData);
        toast.success('Event updated successfully');
      } else {
        await eventService.createEvent({
          ...eventData,
          organizer_id: user.id
        });
        toast.success('Event created successfully');
      }
      
      setShowModal(false);
      setEditingEvent(null);
      loadEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error(error.message || 'Failed to save event');
    }
  };

  const handleContactOrganizer = (event) => {
    if (!user) {
      window.location.href = '/auth';
      return;
    }
    setSelectedEvent(event);
    setShowChat(true);
  };

  const handleEventClick = (event) => {
    setSelectedDetailEvent(event);
    if (eventService.incrementViewCount) {
      eventService.incrementViewCount(event.id).catch(console.error);
    }
  };

  const handleContactFromDetail = (event) => {
    setSelectedDetailEvent(null);
    handleContactOrganizer(event);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Local Events</h1>
            <p className="mt-2 text-gray-600">Discover what's happening in Lethbridge</p>
          </div>
          
          {user && (
            <button
              onClick={() => {
                setEditingEvent(null);
                setShowModal(true);
              }}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Create Event
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option value="all">All Categories</option>
          {EVENT_CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>
              {cat.icon} {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-12">
          <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No events found</p>
          {user && events.length === 0 && (
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 text-blue-600 hover:text-blue-700"
            >
              Create your first event
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map(event => (
            <EventCard
              key={event.id}
              event={event}
              onClick={() => handleEventClick(event)}
              onEdit={() => handleEdit(event)}
              onDelete={() => handleDelete(event.id)}
              onContact={() => handleContactOrganizer(event)}
              isOwner={user && event.organizer_id === user.id}
              currentUserId={user?.id}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <EventModal
          event={editingEvent}
          onSave={handleCreateOrUpdate}
          onClose={() => {
            setShowModal(false);
            setEditingEvent(null);
          }}
        />
      )}

      {/* Detail Modal */}
      {selectedDetailEvent && (
        <EventDetailModal
          event={selectedDetailEvent}
          onClose={() => setSelectedDetailEvent(null)}
          onContact={handleContactFromDetail}
          currentUserId={user?.id}
        />
      )}

      {/* Chat Modal */}
      {showChat && selectedEvent && (
        <ChatModal
          user={user}
          profile={profile}
          otherUserId={selectedEvent.organizer_id}
          otherUserName={selectedEvent.organizer_name || 'Event Organizer'}
          onClose={() => {
            setShowChat(false);
            setSelectedEvent(null);
          }}
        />
      )}
    </div>
  );
}

// Event Card Component
function EventCard({ event, onClick, onEdit, onDelete, isOwner, currentUserId }) {
  const categoryInfo = EVENT_CATEGORIES.find(cat => cat.value === event.category);
  
  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      {event.image_url ? (
        <img 
          src={event.image_url} 
          alt={event.title}
          className="w-full h-48 object-cover rounded-t-lg"
        />
      ) : (
        <div className="w-full h-48 bg-gradient-to-br from-blue-400 to-blue-600 rounded-t-lg flex items-center justify-center">
          <span className="text-6xl">{categoryInfo?.icon || '📅'}</span>
        </div>
      )}

      <div className="p-6">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{categoryInfo?.icon || '📅'}</span>
            <span className="text-sm text-gray-600">{categoryInfo?.label || event.category}</span>
          </div>
          {event.is_free && (
            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
              FREE
            </span>
          )}
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2">{event.title}</h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{event.description}</p>

        <div className="space-y-2 text-sm">
          <div className="flex items-center text-gray-700">
            <CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
            {format(parseISO(event.start_date), 'EEEE, MMMM d')}
          </div>
          
          <div className="flex items-center text-gray-700">
            <ClockIcon className="w-4 h-4 mr-2 text-gray-400" />
            {format(parseISO(event.start_date), 'h:mm a')}
            {event.end_date && ` - ${format(parseISO(event.end_date), 'h:mm a')}`}
          </div>

          <div className="flex items-center text-gray-700">
            <MapPinIcon className="w-4 h-4 mr-2 text-gray-400" />
            <span className="truncate">{event.location}</span>
          </div>

          {!event.is_free && event.cost && (
            <div className="flex items-center text-gray-700">
              <CurrencyDollarIcon className="w-4 h-4 mr-2 text-gray-400" />
              ${event.cost}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t mt-4">
          <div className="flex items-center text-gray-500 text-sm">
            <EyeIcon className="w-4 h-4 mr-1" />
            <span>{event.view_count || 0} views</span>
          </div>
          
          <div className="flex gap-2">
            {isOwner && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Event Detail Modal
function EventDetailModal({ event, onClose, onContact, currentUserId }) {
  if (!event) return null;
  
  const categoryInfo = EVENT_CATEGORIES.find(cat => cat.value === event.category);
  const canContact = currentUserId !== event.organizer_id;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="relative">
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{categoryInfo?.icon || '📅'}</span>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{event.title}</h2>
                {event.is_free && (
                  <span className="inline-block mt-1 px-3 py-1 text-sm rounded-full bg-green-100 text-green-800">
                    FREE EVENT
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {event.image_url && (
            <div className="p-6 border-b">
              <img 
                src={event.image_url} 
                alt={event.title}
                className="w-full h-64 object-cover rounded-lg"
              />
            </div>
          )}
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">About This Event</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{event.description}</p>
                
                <div className="mt-6 space-y-3">
                  <div className="flex items-center text-gray-700">
                    <CalendarIcon className="w-5 h-5 mr-3 text-gray-400" />
                    <span>{format(parseISO(event.start_date), 'EEEE, MMMM d, yyyy')}</span>
                  </div>
                  
                  <div className="flex items-center text-gray-700">
                    <ClockIcon className="w-5 h-5 mr-3 text-gray-400" />
                    <span>
                      {format(parseISO(event.start_date), 'h:mm a')}
                      {event.end_date && ` - ${format(parseISO(event.end_date), 'h:mm a')}`}
                    </span>
                  </div>
                  
                  <div className="flex items-center text-gray-700">
                    <MapPinIcon className="w-5 h-5 mr-3 text-gray-400" />
                    <span>{event.location}</span>
                  </div>
                  
                  {!event.is_free && event.cost && (
                    <div className="flex items-center text-gray-700">
                      <CurrencyDollarIcon className="w-5 h-5 mr-3 text-gray-400" />
                      <span>${event.cost}</span>
                    </div>
                  )}

                  {event.website_url && (
                    <a 
                      href={event.website_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center text-blue-600 hover:underline"
                    >
                      <LinkIcon className="w-5 h-5 mr-3" />
                      Event Website
                    </a>
                  )}

                  <div className="flex items-center text-gray-500">
                    <EyeIcon className="w-5 h-5 mr-3 text-gray-400" />
                    <span>{event.view_count || 0} views</span>
                  </div>
                </div>
              </div>

              <div className="md:border-l md:pl-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact Organizer</h3>
                
                {canContact ? (
                  <div className="space-y-3">
                    <button
                      onClick={() => onContact(event)}
                      className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <ChatBubbleLeftIcon className="w-5 h-5 mr-2" />
                      Send Message
                    </button>

                    {event.contact_email && (
                      
                      <a  href={`mailto:${event.contact_email}`}
                        className="w-full flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        <EnvelopeIcon className="w-5 h-5 mr-2" />
                        Email
                      </a>
                    )}

                    {event.contact_phone && (
                      
                       <a href={`tel:${event.contact_phone}`}
                        className="w-full flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        <PhoneIcon className="w-5 h-5 mr-2" />
                        Call
                      </a>
                    )}

                    <div className="pt-3 border-t">
                      <p className="text-sm text-gray-600 mb-1">Posted by:</p>
                      <p className="font-medium text-gray-900">
                        {event.organizer_name || 'Event Organizer'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">This is your event</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Event Modal Component
function EventModal({ event, onSave, onClose }) {
  const [formData, setFormData] = useState({
    title: event?.title || '',
    description: event?.description || '',
    category: event?.category || 'other',
    start_date: event?.start_date || '',
    end_date: event?.end_date || '',
    location: event?.location || '',
    cost: event?.cost || 0,
    is_free: event?.is_free ?? true,
    website_url: event?.website_url || '',
    contact_email: event?.contact_email || '',
    contact_phone: event?.contact_phone || '',
    max_attendees: event?.max_attendees || '',
    image_url: event?.image_url || ''
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [enhancing, setEnhancing] = useState(false);

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

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const url = await imageService.uploadImage(file, 'event-images');
      setFormData({ ...formData, image_url: url });
      toast.success('Image uploaded!');
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description || !formData.start_date || !formData.location) {
      toast.error('Please fill in all required fields');
      return;
    }

    onSave({
      ...formData,
      cost: formData.is_free ? 0 : parseFloat(formData.cost) || 0,
      max_attendees: formData.max_attendees ? parseInt(formData.max_attendees) : null
    });
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

          <form onSubmit={handleSubmit} className="space-y-4">
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
              >
                {EVENT_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price
              </label>
              <div className="flex items-center gap-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_free}
                    onChange={(e) => setFormData({ ...formData, is_free: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm">Free Event</span>
                </label>
                {!formData.is_free && (
                  <input
                    type="number"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                )}
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
                placeholder="Venue name and address"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Information (Optional)
              </label>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="contact@example.com"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="(403) 555-0123"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website URL
                </label>
                <input
                  type="url"
                  value={formData.website_url}
                  onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Attendees
                </label>
                <input
                  type="number"
                  value={formData.max_attendees}
                  onChange={(e) => setFormData({ ...formData, max_attendees: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Leave empty for unlimited"
                  min="1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Image
              </label>
              {formData.image_url ? (
                <div className="relative">
                  <img src={formData.image_url} alt="Event" className="w-full h-48 object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, image_url: '' })}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-500">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                  {uploadingImage ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  ) : (
                    <div className="text-center">
                      <PhotoIcon className="w-8 h-8 text-gray-400 mx-auto" />
                      <span className="text-sm text-gray-500">Click to upload image</span>
                    </div>
                  )}
                </label>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
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

export default EventsPage;