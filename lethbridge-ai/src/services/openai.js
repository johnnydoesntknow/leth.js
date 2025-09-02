// src/services/openai.js - Fixed version with better error handling
import { eventService, preferencesService, personalListingService } from './supabase';
import { format, parseISO, isWithinInterval, addDays, isToday, isTomorrow } from 'date-fns';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

if (!OPENAI_API_KEY || OPENAI_API_KEY === 'placeholder-key') {
  console.warn('⚠️ OpenAI API key not found. AI features will not work.');
}

// Categories for events
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
  'Seasonal & Holiday'
];

// Direct API calls to OpenAI
async function callOpenAI(messages, options = {}) {
  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'placeholder-key') {
    throw new Error('OpenAI API key not configured');
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
      console.error('OpenAI API Error Response:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw error;
  }
}

// Simple fallback search without OpenAI
async function fallbackSearch(query) {
  try {
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
    
    // Get all events and listings
    const [events, listings] = await Promise.all([
      eventService.getEvents(),
      personalListingService.getListings()
    ]);

    // Filter based on search terms
    const matchingEvents = events.filter(event => {
      const searchText = `${event.title} ${event.description || ''} ${event.category} ${event.location}`.toLowerCase();
      return searchTerms.some(term => searchText.includes(term));
    });

    const matchingListings = listings.filter(listing => {
      const searchText = `${listing.title} ${listing.description || ''} ${listing.category || ''}`.toLowerCase();
      return searchTerms.some(term => searchText.includes(term));
    });

    return {
      events: matchingEvents.slice(0, 10),
      personalListings: matchingListings.slice(0, 10),
      filters: { keywords: searchTerms }
    };
  } catch (error) {
    console.error('Fallback search error:', error);
    return { events: [], personalListings: [], filters: {} };
  }
}

// Parse user query with OpenAI
async function parseUserQuery(query) {
  try {
    const systemPrompt = `Parse this query about events in Lethbridge and return a JSON object with these fields:
    - dateRange: "today", "this_weekend", "next_week", or null
    - categories: array of categories that match
    - keywords: array of search keywords
    - priceRange: "free", "budget", or null
    
    Query: "${query}"
    
    Respond with only valid JSON.`;

    const response = await callOpenAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query }
    ], {
      temperature: 0.3
    });

    return JSON.parse(response);
  } catch (error) {
    console.error('Error parsing query with AI:', error);
    // Return basic keyword search as fallback
    return {
      keywords: query.toLowerCase().split(' ').filter(word => word.length > 2)
    };
  }
}

// Filter events based on parsed filters
function filterEvents(events, filters) {
  return events.filter(event => {
    // Keyword filtering
    if (filters.keywords && filters.keywords.length > 0) {
      const searchText = `${event.title} ${event.description || ''} ${event.category} ${event.location}`.toLowerCase();
      const hasKeyword = filters.keywords.some(keyword => 
        searchText.includes(keyword.toLowerCase())
      );
      if (!hasKeyword) return false;
    }

    // Date filtering
    if (filters.dateRange && event.start_date) {
      const eventDate = new Date(event.start_date);
      const now = new Date();
      
      switch (filters.dateRange) {
        case 'today':
          if (!isToday(eventDate)) return false;
          break;
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

    // Category filtering
    if (filters.categories && filters.categories.length > 0) {
      if (!filters.categories.includes(event.category)) return false;
    }

    // Price filtering
    if (filters.priceRange === 'free' && !event.is_free) return false;

    return true;
  });
}

// Filter personal listings
function filterPersonalListings(listings, filters) {
  return listings.filter(listing => {
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

// Generate natural language response
async function generateResponse(events, listings, query) {
  const totalResults = events.length + listings.length;
  
  if (totalResults === 0) {
    return `I couldn't find any events or activities matching "${query}". Try different keywords or check out the featured events below!`;
  }

  try {
    const eventDescriptions = events.slice(0, 5).map(event => {
      const date = event.start_date ? format(parseISO(event.start_date), 'MMM d') : '';
      const price = event.is_free ? 'Free' : `$${event.cost || 0}`;
      return `- ${event.title} at ${event.location} (${date}, ${price})`;
    }).join('\n');

    const listingDescriptions = listings.slice(0, 5).map(listing => {
      return `- ${listing.title} (${listing.category || 'Other'})`;
    }).join('\n');

    let prompt = `Create a friendly response about these search results for "${query}":\n\n`;
    if (events.length > 0) {
      prompt += `Events found:\n${eventDescriptions}\n\n`;
    }
    if (listings.length > 0) {
      prompt += `Community listings:\n${listingDescriptions}\n\n`;
    }
    prompt += 'Keep the response brief and conversational.';

    const response = await callOpenAI([
      { role: 'system', content: 'You are a helpful assistant for Lethbridge events.' },
      { role: 'user', content: prompt }
    ], {
      temperature: 0.7,
      max_tokens: 200
    });

    return response;
  } catch (error) {
    // Fallback response if OpenAI fails
    let response = `I found ${totalResults} result${totalResults === 1 ? '' : 's'} for "${query}":\n\n`;
    
    if (events.length > 0) {
      response += `**Events (${events.length}):**\n`;
      events.slice(0, 5).forEach(event => {
        response += `• ${event.title} - ${event.location}\n`;
      });
    }
    
    if (listings.length > 0) {
      if (events.length > 0) response += '\n';
      response += `**Community Listings (${listings.length}):**\n`;
      listings.slice(0, 5).forEach(listing => {
        response += `• ${listing.title}\n`;
      });
    }
    
    return response;
  }
}

// Main AI service
export const aiService = {
  async searchEvents(query, userId = null) {
    console.log('AI Search called with query:', query);
    
    try {
      // Try with OpenAI first
      let filters;
      let matchingEvents = [];
      let matchingListings = [];

      if (OPENAI_API_KEY && OPENAI_API_KEY !== 'placeholder-key') {
        // Parse query with OpenAI
        filters = await parseUserQuery(query);
        console.log('Parsed filters:', filters);

        // Get all events and listings
        const [allEvents, allListings] = await Promise.all([
          eventService.getEvents(),
          personalListingService.getListings()
        ]);

        console.log('Fetched events:', allEvents.length);
        console.log('Fetched listings:', allListings.length);

        // Filter based on parsed query
        matchingEvents = filterEvents(allEvents, filters);
        matchingListings = filterPersonalListings(allListings, filters);
      } else {
        // Use fallback search without OpenAI
        const results = await fallbackSearch(query);
        matchingEvents = results.events;
        matchingListings = results.personalListings;
        filters = results.filters;
      }

      console.log('Matching events:', matchingEvents.length);
      console.log('Matching listings:', matchingListings.length);

      // Generate response
      const message = await generateResponse(matchingEvents, matchingListings, query);

      return {
        message,
        events: matchingEvents,
        personalListings: matchingListings,
        filters,
        totalResults: matchingEvents.length + matchingListings.length
      };
    } catch (error) {
      console.error('AI search error:', error);
      
      // Try fallback search
      try {
        const results = await fallbackSearch(query);
        const message = await generateResponse(results.events, results.personalListings, query);
        
        return {
          message,
          events: results.events,
          personalListings: results.personalListings,
          filters: results.filters,
          totalResults: results.events.length + results.personalListings.length
        };
      } catch (fallbackError) {
        console.error('Fallback search also failed:', fallbackError);
        return {
          message: "I'm having trouble searching for events right now. Please try again later.",
          events: [],
          personalListings: [],
          error: error.message
        };
      }
    }
  },

  // Help businesses write better event descriptions
  async enhanceEventDescription(basicInfo) {
    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'placeholder-key') {
      return basicInfo.description;
    }

    const prompt = `Enhance this event description for "${basicInfo.title}" in category "${basicInfo.category}":
    
    Original: ${basicInfo.description}
    
    Create a compelling 2-3 sentence description that would attract attendees. Keep it concise and engaging.`;

    try {
      const response = await callOpenAI([
        { role: 'system', content: 'You are a helpful marketing assistant.' },
        { role: 'user', content: prompt }
      ], {
        temperature: 0.7,
        max_tokens: 150
      });

      return response;
    } catch (error) {
      console.error('Error enhancing description:', error);
      return basicInfo.description;
    }
  }
};