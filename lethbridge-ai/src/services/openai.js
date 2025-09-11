// src/services/openai.js - Fixed version for your database structure
import { eventService, preferencesService, personalListingService, marketplaceService } from './supabase';
import { format, parseISO, isWithinInterval, addDays, isToday, isTomorrow, startOfDay, endOfDay } from 'date-fns';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

if (!OPENAI_API_KEY || OPENAI_API_KEY === 'placeholder-key') {
  console.warn('⚠️ OpenAI API key not found. AI features will use fallback mode.');
}

// Event categories
export const EVENT_CATEGORIES = [
  'Family & Kids',
  'Sports & Recreation',
  'Arts & Culture',
  'Music & Concerts',
  'Food & Dining',
  'Community',
  'Education',
  'Business & Networking',
  'Health & Wellness',
  'Seasonal & Holiday',
  'Other'
];

// Core OpenAI API call function
async function callOpenAI(messages, options = {}) {
  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'placeholder-key') {
    throw new Error('OpenAI API key not configured. Please add your API key to continue.');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: options.model || 'gpt-3.5-turbo',
        messages: messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 300,
        ...options
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API Error:', errorData);
      throw new Error(errorData.error?.message || 'Failed to connect to AI service');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw error;
  }
}

// Check if query is asking about today's events
function isTodayQuery(query) {
  const todayKeywords = [
    'today', 'tonight', 'now', 'happening today', 'happening now',
    'going on today', 'events today', 'what\'s on today', 'what is happening today',
    'what\'s happening today', 'is there any event happening today'
  ];
  const lowerQuery = query.toLowerCase();
  return todayKeywords.some(keyword => lowerQuery.includes(keyword));
}

// Fallback search when AI is not available
async function fallbackSearch(query) {
  try {
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
    const checkingToday = isTodayQuery(query);
    
    const [events, listings, marketplace] = await Promise.all([
      eventService.getEvents(),
      personalListingService.getListings(),
      marketplaceService.getListings({})
    ]);

    let matchingEvents = events;
    let matchingListings = listings;
    let matchingMarketplace = marketplace;

    // If checking for today's events, filter by date
    if (checkingToday) {
      const today = new Date();
      const todayStart = startOfDay(today);
      const todayEnd = endOfDay(today);

      // Filter events by today's date
      matchingEvents = events.filter(event => {
        if (event.start_date) {
          const eventDate = new Date(event.start_date);
          return eventDate >= todayStart && eventDate <= todayEnd;
        }
        return false;
      });

      // Filter community listings for events happening today
      // Check using the listing_type field
      matchingListings = listings.filter(listing => {
        // Check if it's an event listing
        const isEventListing = listing.listing_type === 'event';
        
        // For event listings, check if they have today's date
        if (isEventListing && listing.start_date) {
          const listingDate = new Date(listing.start_date);
          return listingDate >= todayStart && listingDate <= todayEnd;
        }
        return false;
      });

      // Don't include marketplace items for today queries
      matchingMarketplace = [];
    } else {
      // Regular keyword search
      matchingEvents = events.filter(event => {
        const searchText = `${event.title} ${event.description || ''} ${event.category} ${event.location}`.toLowerCase();
        return searchTerms.some(term => searchText.includes(term));
      });

      matchingListings = listings.filter(listing => {
        const searchText = `${listing.title} ${listing.description || ''} ${listing.category || ''}`.toLowerCase();
        return searchTerms.some(term => searchText.includes(term));
      });

      matchingMarketplace = marketplace.filter(item => {
        const searchText = `${item.title} ${item.description || ''} ${item.category || ''}`.toLowerCase();
        return searchTerms.some(term => searchText.includes(term));
      });
    }

    return {
      events: matchingEvents.slice(0, 10),
      personalListings: matchingListings.slice(0, 10),
      marketplace: matchingMarketplace.slice(0, 10),
      filters: { keywords: searchTerms, dateRange: checkingToday ? 'today' : null }
    };
  } catch (error) {
    console.error('Fallback search error:', error);
    return { events: [], personalListings: [], marketplace: [], filters: {} };
  }
}

// Parse user query with AI
async function parseUserQuery(query) {
  // First check if it's a today query directly
  if (isTodayQuery(query)) {
    return {
      dateRange: 'today',
      keywords: query.toLowerCase().split(' ')
        .filter(word => word.length > 2 && !['today', 'tonight', 'now', 'happening', 'event', 'events', 'what\'s', 'there', 'any'].includes(word))
    };
  }

  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'placeholder-key') {
    return {
      keywords: query.toLowerCase().split(' ').filter(word => word.length > 2)
    };
  }

  try {
    const systemPrompt = `Parse this query about events/items in Lethbridge and return a JSON object with:
    - dateRange: "today", "this_weekend", "next_week", or null
    - categories: array of matching categories
    - keywords: array of search keywords
    - priceRange: "free", "budget", or null
    
    Query: "${query}"
    
    Respond with only valid JSON.`;

    const response = await callOpenAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query }
    ], {
      temperature: 0.3,
      max_tokens: 150
    });

    const parsed = JSON.parse(response);
    
    // Double-check for today queries
    if (isTodayQuery(query)) {
      parsed.dateRange = 'today';
    }
    
    return parsed;
  } catch (error) {
    console.error('Error parsing query:', error);
    return {
      keywords: query.toLowerCase().split(' ').filter(word => word.length > 2),
      dateRange: isTodayQuery(query) ? 'today' : null
    };
  }
}

// Filter events based on criteria
function filterEvents(events, filters) {
  return events.filter(event => {
    // Handle today's date filtering
    if (filters.dateRange === 'today' && event.start_date) {
      const eventDate = new Date(event.start_date);
      if (!isToday(eventDate)) return false;
    } else if (filters.dateRange && event.start_date) {
      const eventDate = new Date(event.start_date);
      const now = new Date();
      
      switch (filters.dateRange) {
        case 'this_weekend':
          const saturday = new Date(now);
          saturday.setDate(now.getDate() + (6 - now.getDay()));
          const sunday = new Date(saturday);
          sunday.setDate(saturday.getDate() + 1);
          
          if (eventDate < saturday || eventDate > sunday) return false;
          break;
        case 'next_week':
          if (!isWithinInterval(eventDate, { 
            start: now, 
            end: addDays(now, 7) 
          })) return false;
          break;
      }
    }

    // Keyword filtering - only apply if NOT a date-only query
    if (filters.keywords && filters.keywords.length > 0 && filters.dateRange !== 'today') {
      const searchText = `${event.title} ${event.description || ''} ${event.category} ${event.location}`.toLowerCase();
      const hasKeyword = filters.keywords.some(keyword => 
        searchText.includes(keyword.toLowerCase())
      );
      if (!hasKeyword) return false;
    }

    if (filters.categories && filters.categories.length > 0) {
      if (!filters.categories.includes(event.category)) return false;
    }

    if (filters.priceRange === 'free' && !event.is_free) return false;

    return true;
  });
}

// Filter community listings based on criteria
function filterListings(listings, filters) {
  return listings.filter(listing => {
    // For today queries, show ALL event-type listings with today's date
    if (filters.dateRange === 'today') {
      // Check if it's an event listing using multiple possible field names
      const isEventListing = 
        listing.category === 'Event/Activity' ||
        listing.category === 'Event' ||
        listing.type === 'Event/Activity' ||
        (listing.tags && (
          listing.tags.includes('Event/Activity') || 
          listing.tags.includes('Event')
        ));
      
      if (!isEventListing) return false;
      
      // Check if it has today's date in any possible date field
      const listingDate = listing.date || listing.event_date || listing.start_date;
      if (listingDate) {
        const dateObj = new Date(listingDate);
        return isToday(dateObj);
      }
      
      // If no date field, check if "today" or date is mentioned in title/description
      const todayDateStr = format(new Date(), 'MMM d');
      const searchText = `${listing.title} ${listing.description || ''}`.toLowerCase();
      return searchText.includes('today') || 
             searchText.includes('tonight') ||
             searchText.includes(todayDateStr.toLowerCase());
    }

    // Keyword filtering for non-date queries
    if (filters.keywords && filters.keywords.length > 0) {
      const searchText = `${listing.title} ${listing.description || ''} ${listing.category || ''}`.toLowerCase();
      const hasKeyword = filters.keywords.some(keyword => 
        searchText.includes(keyword.toLowerCase())
      );
      if (!hasKeyword) return false;
    }

    return true;
  });
}

// Generate response for search results
async function generateSearchResponse(events, listings, marketplace, query, filters) {
  const totalResults = events.length + listings.length + marketplace.length;
  
  // Special handling for today queries with no results
  if (filters?.dateRange === 'today' && totalResults === 0) {
    return `No events found for today in Lethbridge. Check back tomorrow or browse upcoming events in the Events section!`;
  }
  
  if (totalResults === 0) {
    return `I couldn't find anything matching "${query}" in Lethbridge. Try different keywords or browse the categories!`;
  }

  let response = '';
  
  // For today queries, emphasize events
  if (filters?.dateRange === 'today') {
    if (events.length > 0 || listings.length > 0) {
      response += `**Today's Events in Lethbridge:**\n\n`;
      
      if (events.length > 0) {
        response += `**Official Events:**\n`;
        events.slice(0, 5).forEach(event => {
          const time = event.start_time || 'Time TBA';
          const price = event.is_free ? 'Free' : `$${event.cost || 0}`;
          response += `📅 **${event.title}**\n`;
          response += `   📍 ${event.location}\n`;
          response += `   🕐 ${time} | 💵 ${price}\n`;
          if (event.description) {
            response += `   ${event.description.substring(0, 100)}...\n`;
          }
          response += '\n';
        });
      }
      
      if (listings.length > 0) {
        response += `**Community Events:**\n`;
        listings.slice(0, 5).forEach(listing => {
          response += `• **${listing.title}**`;
          if (listing.location) response += ` at ${listing.location}`;
          if (listing.description) {
            response += `\n  ${listing.description.substring(0, 100)}...`;
          }
          response += '\n';
        });
      }
    }
  } else {
    // Regular search results
    if (marketplace.length > 0) {
      response += `**For Sale (${marketplace.length} items):**\n`;
      marketplace.slice(0, 3).forEach(item => {
        const price = item.price === 0 ? 'Free' : `$${item.price}`;
        response += `• ${item.title} - ${price}${item.condition ? ` (${item.condition})` : ''}\n`;
      });
      response += '\n';
    }
    
    if (events.length > 0) {
      response += `**Events (${events.length}):**\n`;
      events.slice(0, 3).forEach(event => {
        const date = event.start_date ? format(parseISO(event.start_date), 'MMM d') : '';
        const price = event.is_free ? 'Free' : `$${event.cost || 0}`;
        response += `• ${event.title} at ${event.location} (${date}, ${price})\n`;
      });
      response += '\n';
    }
    
    if (listings.length > 0) {
      response += `**Community Listings (${listings.length}):**\n`;
      listings.slice(0, 3).forEach(listing => {
        response += `• ${listing.title} (${listing.category || 'Other'})\n`;
      });
    }
  }

  // Try to enhance with AI if available and not a today query
  if (OPENAI_API_KEY && OPENAI_API_KEY !== 'placeholder-key' && filters?.dateRange !== 'today') {
    try {
      const enhancedResponse = await callOpenAI([
        { 
          role: 'system', 
          content: 'You are a helpful Lethbridge community assistant. Make responses friendly, concise, and highlight the best matches.' 
        },
        { 
          role: 'user', 
          content: `User searched for: "${query}"\n\nResults:\n${response}\n\nCreate a brief, friendly response (max 100 words).`
        }
      ], {
        temperature: 0.7,
        max_tokens: 150
      });
      
      return enhancedResponse;
    } catch (error) {
      console.error('Error generating enhanced response:', error);
    }
  }
  
  return response;
}

// Main AI Service Object
export const aiService = {
  // Search for events, listings, and marketplace items
  async searchEvents(query, userId = null) {
    console.log('AI Search:', query);
    
    try {
      // FIRST: Get all the data to see what fields exist
      const [allEvents, allListings] = await Promise.all([
        eventService.getEvents(),
        personalListingService.getListings()
      ]);
      
      // Debug: Log the structure of the first listing to see available fields
      if (allListings.length > 0) {
        console.log('Sample listing structure:', Object.keys(allListings[0]));
        console.log('First listing:', allListings[0]);
      }
      
      let filters;
      let matchingEvents = [];
      let matchingListings = [];
      let matchingMarketplace = [];

      // Check if this is a today query
      const checkingToday = isTodayQuery(query);
      
      // Determine if this is primarily an event query
      const eventKeywords = ['today', 'tonight', 'tomorrow', 'weekend', 'happening', 
                            'events', 'activities', 'what to do', 'going on'];
      const isEventFocused = eventKeywords.some(keyword => 
        query.toLowerCase().includes(keyword)
      );

      if (OPENAI_API_KEY && OPENAI_API_KEY !== 'placeholder-key') {
        // Use AI to parse the query
        filters = await parseUserQuery(query);
        
        // For non-today queries, also get marketplace
        const allMarketplace = (isEventFocused || checkingToday) 
          ? [] 
          : await marketplaceService.getListings({});

        // Filter events
        matchingEvents = filterEvents(allEvents, filters);
        
        // Filter listings
        matchingListings = filterListings(allListings, filters);

        // Filter marketplace items if not event-focused
        if (!isEventFocused && !checkingToday) {
          matchingMarketplace = allMarketplace.filter(item => {
            if (filters.keywords && filters.keywords.length > 0) {
              const searchText = `${item.title} ${item.description || ''}`.toLowerCase();
              return filters.keywords.some(keyword => 
                searchText.includes(keyword.toLowerCase())
              );
            }
            return false;
          });
        }
      } else {
        // Use fallback search without AI
        const results = await fallbackSearch(query);
        matchingEvents = results.events;
        matchingListings = results.personalListings;
        matchingMarketplace = (isEventFocused || checkingToday) ? [] : results.marketplace;
        filters = results.filters;
      }

      // Debug log for today queries
      if (checkingToday) {
        console.log('Today query results:', {
          events: matchingEvents.length,
          listings: matchingListings.length,
          allListingsCount: allListings.length,
          filters
        });
      }

      const message = await generateSearchResponse(
        matchingEvents, 
        matchingListings, 
        matchingMarketplace,
        query,
        filters
      );

      return {
        message,
        events: matchingEvents,
        personalListings: matchingListings,
        marketplace: matchingMarketplace,
        filters,
        totalResults: matchingEvents.length + matchingListings.length + matchingMarketplace.length
      };
    } catch (error) {
      console.error('Search error:', error);
      
      // Try fallback search
      try {
        const results = await fallbackSearch(query);
        const message = await generateSearchResponse(
          results.events, 
          results.personalListings,
          results.marketplace,
          query,
          results.filters
        );
        
        return {
          message,
          events: results.events,
          personalListings: results.personalListings,
          marketplace: results.marketplace,
          filters: results.filters,
          totalResults: results.events.length + results.personalListings.length + results.marketplace.length
        };
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        return {
          message: "I'm having trouble searching right now. Please try browsing the categories instead.",
          events: [],
          personalListings: [],
          marketplace: [],
          error: error.message
        };
      }
    }
  },

  // Enhance description with AI
  async enhanceDescription(originalText, type = 'general') {
    if (!originalText || originalText.trim().length < 10) {
      throw new Error('Please provide at least 10 characters to enhance');
    }

    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'placeholder-key') {
      // Return a simple enhancement without AI
      const enhanced = originalText.trim();
      return enhanced.charAt(0).toUpperCase() + enhanced.slice(1);
    }

    const prompts = {
      event: `Enhance this event description to be exciting and informative. Include what attendees can expect. Keep it under 150 words:\n\n"${originalText}"`,
      
      listing: `Enhance this community listing to be clear and appealing. Highlight the value to the community. Keep it under 100 words:\n\n"${originalText}"`,
      
      marketplace: `Enhance this marketplace listing to appeal to buyers. Highlight features and condition. Keep it under 100 words:\n\n"${originalText}"`,
      
      general: `Enhance this description to be clearer and more engaging. Keep it concise:\n\n"${originalText}"`
    };

    try {
      const response = await callOpenAI([
        { 
          role: 'system', 
          content: 'You are a helpful writing assistant. Enhance descriptions to be engaging and clear. Return only the improved text.'
        },
        { 
          role: 'user', 
          content: prompts[type] || prompts.general 
        }
      ], {
        temperature: 0.7,
        max_tokens: 200
      });

      return response.trim();
    } catch (error) {
      console.error('Enhancement error:', error);
      throw new Error('Unable to enhance description. Please try again or continue with your original text.');
    }
  },

  // Specific search helper
  async searchSpecific(query) {
    return this.searchEvents(query);
  }
};