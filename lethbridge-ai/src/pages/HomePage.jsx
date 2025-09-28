// src/pages/HomePage.jsx
import React, { useState, useRef, useEffect } from 'react';
import { aiService, EVENT_CATEGORIES } from '../services/openai';
import { eventService, preferencesService, supabase, interactionService, businessService } from '../services/supabase';
import EventDetailsModal from '../components/EventDetailsModal';
import EventMap from '../components/EventMap';
import WeatherWidget from '../components/WeatherWidget';
import { MapIcon } from '@heroicons/react/24/outline';
import { format, parseISO, differenceInDays, isToday, isTomorrow } from 'date-fns';
import { 
  PaperAirplaneIcon, 
  SparklesIcon, 
  CalendarIcon, 
  MapPinIcon,
  CurrencyDollarIcon,
  ClockIcon,
  TagIcon,
  HeartIcon,
  FireIcon,
  ChevronRightIcon,
  MegaphoneIcon,
  TicketIcon,
  UserGroupIcon,
  MusicalNoteIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

function HomePage({ user, profile }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [featuredEvents, setFeaturedEvents] = useState([]);
  const [todayEvents, setTodayEvents] = useState([]);
  const [weekendEvents, setWeekendEvents] = useState([]);
  const [savedEvents, setSavedEvents] = useState(new Set());
  const [promotedEvent, setPromotedEvent] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [allEvents, setAllEvents] = useState([]); // For map markers
  const [allBusinesses, setAllBusinesses] = useState([]); // For map markers
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadEvents();
    loadBusinesses(); // Load businesses for map
    if (user) {
      loadSavedEvents();
    }
  }, [user]);

  const loadEvents = async () => {
    try {
      // Load promoted event
      const promoted = await eventService.getEvents({ promoted: true, limit: 1 });
      if (promoted.length > 0) setPromotedEvent(promoted[0]);

      // Load all events with business information
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select(`
          *,
          businesses (
            id,
            name,
            subscription_tier_id,
            subscription_tier:subscription_tier_id (
              id,
              name,
              price
            )
          )
        `)
        .order('start_date', { ascending: true });

      if (eventsError) {
        console.error('Error loading events:', eventsError);
        setFeaturedEvents([]);
        setAllEvents([]);
      } else {
        // Store all events for the map
        setAllEvents(eventsData || []);
        
        // Filter for events from businesses with Professional OR Pro subscriptions
        const featuredTierEvents = (eventsData || []).filter(event => {
          const tierName = event.businesses?.subscription_tier?.name;
          return tierName === 'professional' || tierName === 'pro';
        });
        
        setFeaturedEvents(featuredTierEvents);
      }

      // Load today's events (all tiers)
      const today = await eventService.searchEvents({ dateRange: 'today' });
      setTodayEvents(today);

      // Load weekend events (all tiers)  
      const weekend = await eventService.searchEvents({ dateRange: 'this_weekend' });
      setWeekendEvents(weekend);
      
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const loadBusinesses = async () => {
    try {
      const businesses = await businessService.getBusinesses();
      setAllBusinesses(businesses || []);
    } catch (error) {
      console.error('Error loading businesses:', error);
      setAllBusinesses([]);
    }
  };

  const loadSavedEvents = async () => {
    try {
      const saved = localStorage.getItem('savedEvents');
      if (saved) {
        setSavedEvents(new Set(JSON.parse(saved)));
      }
    } catch (error) {
      console.error('Error loading saved events:', error);
    }
  };

  const handleEventClick = async (event) => {
    setSelectedEvent(event);
    
    if (user) {
      try {
        await eventService.incrementViewCount(event.id);
        await interactionService.createInteraction(event.id, user.id, 'view');
      } catch (error) {
        console.error('Error tracking view:', error);
      }
    }
  };

  const handleSaveEvent = async (eventId) => {
    const newSavedEvents = new Set(savedEvents);
    
    if (savedEvents.has(eventId)) {
      newSavedEvents.delete(eventId);
    } else {
      newSavedEvents.add(eventId);
      
      if (user) {
        try {
          await interactionService.createInteraction(eventId, user.id, 'save');
        } catch (error) {
          console.error('Error tracking save:', error);
        }
      }
    }
    
    setSavedEvents(newSavedEvents);
    localStorage.setItem('savedEvents', JSON.stringify(Array.from(newSavedEvents)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const result = await aiService.searchEvents(input, user?.id);
      
      const assistantMessage = {
        role: 'assistant',
        content: result.message,
        events: result.events,
        personalListings: result.personalListings,
        marketplace: result.marketplace,
        filters: result.filters,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      toast.error('Sorry, I had trouble searching for events. Please try again.');
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatEventTime = (dateString) => {
    const date = parseISO(dateString);
    if (isToday(date)) return `Today at ${format(date, 'h:mm a')}`;
    if (isTomorrow(date)) return `Tomorrow at ${format(date, 'h:mm a')}`;
    return format(date, 'EEE, MMM d • h:mm a');
  };

  const quickActions = [
    { text: "What's happening today?", icon: CalendarIcon },
    { text: "Free weekend activities", icon: TicketIcon },
    { text: "Family events near me", icon: UserGroupIcon },
    { text: "Live music this week", icon: MusicalNoteIcon }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {user ? `Welcome back, ${profile?.display_name || 'Friend'}!` : 'Discover Lethbridge'}
        </h1>
        <p className="text-gray-600">Find events, activities, and connect with your community</p>
      </div>

      {/* Promoted Event Banner */}
      {promotedEvent && (
        <div className="mb-8">
          <div
            onClick={() => handleEventClick(promotedEvent)}
            className="relative bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white cursor-pointer hover:shadow-lg transition-shadow"
          >
            <div className="absolute top-4 right-4 bg-yellow-400 text-gray-900 px-3 py-1 rounded-full text-xs font-bold flex items-center">
              <MegaphoneIcon className="w-3 h-3 mr-1" />
              PROMOTED
            </div>
            
            <h3 className="text-2xl font-bold mb-2 pr-32">{promotedEvent.title}</h3>
            <p className="text-blue-100 mb-4 line-clamp-2 max-w-2xl">{promotedEvent.description}</p>
            
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                <span>{formatEventTime(promotedEvent.start_date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPinIcon className="w-4 h-4" />
                <span>{promotedEvent.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <CurrencyDollarIcon className="w-4 h-4" />
                <span className="font-semibold">
                  {promotedEvent.is_free ? 'FREE EVENT' : `$${promotedEvent.cost}`}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid - AI Assistant and Right Column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - AI Assistant */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* AI Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <SparklesIcon className="w-6 h-6 text-white" />
                  <h2 className="text-lg font-semibold text-white">Ask Lethbridge AI</h2>
                </div>
                {messages.length > 0 && (
                  <button
                    onClick={() => setMessages([])}
                    className="text-white/80 hover:text-white text-sm"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Messages Area */}
            <div className="h-[600px] overflow-y-auto p-4 bg-gray-50">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <SparklesIcon className="w-12 h-12 text-gray-300 mb-4" />
                  <p className="text-gray-600 mb-6">Ask me anything about events in Lethbridge!</p>
                  
                  <div className="grid grid-cols-2 gap-3 max-w-md w-full">
                    {quickActions.map((action, index) => (
                      <button
                        key={index}
                        onClick={() => setInput(action.text)}
                        className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                      >
                        <action.icon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{action.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg p-4 ${
                          message.role === 'user'
                            ? 'bg-blue-500 text-white'
                            : 'bg-white border border-gray-200'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        
                        {/* Display Events */}
                        {message.events && message.events.length > 0 && 
                          (!message.filters?.queryType || message.filters.queryType === 'general' || message.filters.queryType === 'events') && (
                          <div className="mt-4 space-y-3">
                            <p className="text-sm font-medium text-gray-700">Events:</p>
                            {message.events.map((event) => (
                              <div
                                key={event.id}
                                onClick={() => handleEventClick(event)}
                                className="bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-gray-100 transition-colors flex gap-3"
                              >
                                {(event.image_url || event.event_images?.[0]?.image_url) ? (
                                  <img 
                                    src={event.image_url || event.event_images[0].image_url} 
                                    alt={event.title}
                                    className="w-20 h-20 object-cover rounded-lg"
                                  />
                                ) : (
                                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <CalendarIcon className="w-8 h-8 text-blue-500" />
                                  </div>
                                )}
                                
                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-900">{event.title}</h4>
                                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                                    <span className="flex items-center gap-1">
                                      <CalendarIcon className="w-4 h-4" />
                                      {format(parseISO(event.start_date), 'MMM d, h:mm a')}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <MapPinIcon className="w-4 h-4" />
                                      {event.location}
                                    </span>
                                  </div>
                                  <div className="mt-1">
                                    <span className={`text-sm font-semibold ${event.is_free ? 'text-green-600' : 'text-blue-600'}`}>
                                      {event.is_free ? 'FREE' : `$${event.cost}`}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Display Community Listings */}
                        {message.personalListings && message.personalListings.length > 0 && 
                          (!message.filters?.queryType || message.filters.queryType === 'general') && (
                          <div className="mt-4 space-y-3">
                            <p className="text-sm font-medium text-gray-700">Community Listings:</p>
                            {message.personalListings.map((listing) => (
                              <div
                                key={listing.id}
                                onClick={() => {
                                  if (listing.listing_type === 'event') {
                                    window.location.href = `/community?listing=${listing.id}`;
                                  } else {
                                    window.location.href = `/community`;
                                  }
                                }}
                                className="bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-gray-100 transition-colors flex gap-3"
                              >
                                {listing.images && listing.images[0] ? (
                                  <img 
                                    src={listing.images[0]} 
                                    alt={listing.title}
                                    className="w-20 h-20 object-cover rounded-lg"
                                  />
                                ) : (
                                  <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    {listing.listing_type === 'event' ? (
                                      <CalendarIcon className="w-8 h-8 text-purple-500" />
                                    ) : (
                                      <UserGroupIcon className="w-8 h-8 text-purple-500" />
                                    )}
                                  </div>
                                )}
                                
                                <div className="flex-1">
                                  <h5 className="font-semibold text-gray-900">{listing.title}</h5>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {listing.category} {listing.listing_type === 'event' && '• Event'}
                                  </p>
                                  {listing.location && (
                                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                      <MapPinIcon className="w-3 h-3" />
                                      {listing.location}
                                    </p>
                                  )}
                                  {listing.listing_type === 'event' && listing.start_date && (
                                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                      <ClockIcon className="w-3 h-3" />
                                      {format(parseISO(listing.start_date), 'MMM d, h:mm a')}
                                    </p>
                                  )}
                                  {(listing.price_type === 'free' || listing.price === 0) && (
                                    <span className="text-sm font-semibold text-green-600">FREE</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Display Marketplace Items */}
                        {message.marketplace && message.marketplace.length > 0 && 
                          (!message.filters?.queryType || message.filters.queryType === 'general') && (
                          <div className="mt-4 space-y-3">
                            <p className="text-sm font-medium text-gray-700">For Sale:</p>
                            {message.marketplace.map((item) => (
                              <div
                                key={item.id}
                                onClick={() => window.location.href = `/marketplace?item=${item.id}`}
                                className="bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-gray-100 transition-colors flex gap-3"
                              >
                                {item.images && item.images[0] ? (
                                  <img 
                                    src={item.images[0]} 
                                    alt={item.title}
                                    className="w-20 h-20 object-cover rounded-lg"
                                  />
                                ) : (
                                  <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <TagIcon className="w-8 h-8 text-green-500" />
                                  </div>
                                )}
                                <div className="flex-1">
                                  <h5 className="font-semibold text-gray-900">{item.title}</h5>
                                  <p className="text-xl font-bold text-blue-600">
                                    ${item.price || 'Free'}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {item.condition} • {item.location || 'Lethbridge'}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex space-x-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="p-4 bg-white border-t">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about events, activities, or things to do..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <PaperAirplaneIcon className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column - Featured, Today & Weekend */}
        <div className="space-y-6">
          {/* Featured Events */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Featured Events</h3>
              <Link
                to="/events"
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                View All →
              </Link>
            </div>
            
            {featuredEvents.length > 0 ? (
              <div className="space-y-3">
                {featuredEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    onClick={() => handleEventClick(event)}
                    className="flex gap-3 p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    {event.image_url ? (
                      <img
                        src={event.image_url}
                        alt={event.title}
                        className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                        <CalendarIcon className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 text-sm line-clamp-1">{event.title}</h4>
                      <p className="text-xs text-gray-600 mt-1">{event.category}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-500">
                          {format(parseISO(event.start_date), 'MMM d')}
                        </span>
                        <span className={`text-xs font-medium ${event.is_free ? 'text-green-600' : 'text-gray-900'}`}>
                          {event.is_free ? 'FREE' : `$${event.cost}`}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No featured events</p>
            )}
          </div>

          {/* Today's Events */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Today</h3>
              <span className="text-sm text-gray-500">{todayEvents.length} events</span>
            </div>
            
            {todayEvents.length > 0 ? (
              <div className="space-y-3">
                {todayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    onClick={() => handleEventClick(event)}
                    className="p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <h4 className="font-medium text-gray-900 text-sm line-clamp-1">{event.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <ClockIcon className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-600">
                        {format(parseISO(event.start_date), 'h:mm a')}
                      </span>
                      {event.is_free && (
                        <span className="text-xs text-green-600 font-medium">FREE</span>
                      )}
                    </div>
                  </div>
                ))}
                {todayEvents.length > 3 && (
                  <Link
                    to="/events?filter=today"
                    className="block text-center text-sm text-blue-600 hover:text-blue-700 pt-2"
                  >
                    View all {todayEvents.length} events →
                  </Link>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No events scheduled for today</p>
            )}
          </div>

          {/* Weekend Events */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">This Weekend</h3>
              <FireIcon className="w-5 h-5 text-orange-500" />
            </div>
            
            {weekendEvents.length > 0 ? (
              <div className="space-y-3">
                {weekendEvents.slice(0, 4).map((event) => (
                  <div
                    key={event.id}
                    onClick={() => handleEventClick(event)}
                    className="group cursor-pointer"
                  >
                    <h4 className="font-medium text-gray-900 text-sm group-hover:text-blue-600 line-clamp-1">
                      {event.title}
                    </h4>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-1">{event.location}</p>
                  </div>
                ))}
                <Link
                  to="/events?filter=weekend"
                  className="block text-center text-sm text-blue-600 hover:text-blue-700 pt-2"
                >
                  See all weekend events →
                </Link>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No events scheduled this weekend</p>
            )}
          </div>
        </div>
      </div>

      {/* NEW SECTION: Weather & Map - Under AI, Above Footer */}
      <div className="mt-12 space-y-8">
        {/* Weather & Map Toggle Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Weather Widget - Takes 1 column */}
          <div className="lg:col-span-1">
            <WeatherWidget />
          </div>
          
          {/* Map Toggle & Info - Takes 2 columns */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Event Map</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Explore {allEvents.length} events and {allBusinesses.length} local businesses
                </p>
              </div>
              <button
                onClick={() => setShowMap(!showMap)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <MapIcon className="w-5 h-5" />
                {showMap ? 'Hide Map' : 'Show Map'}
              </button>
            </div>
            
            {/* Map Stats */}
            {!showMap && (
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{todayEvents.length}</p>
                  <p className="text-xs text-gray-600">Today's Events</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{weekendEvents.length}</p>
                  <p className="text-xs text-gray-600">Weekend Events</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {allEvents.filter(e => e.is_free).length}
                  </p>
                  <p className="text-xs text-gray-600">Free Events</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Collapsible Map Section */}
        {showMap && (
          <div className="animate-fadeIn">
            <EventMap 
              events={allEvents}
              businesses={allBusinesses}
              height="500px"
              onEventClick={handleEventClick}
            />
          </div>
        )}
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onSave={handleSaveEvent}
          isSaved={savedEvents.has(selectedEvent.id)}
        />
      )}
    </div>
  );
}

export default HomePage;