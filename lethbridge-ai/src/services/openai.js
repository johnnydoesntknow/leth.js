// src/services/openai.js - FIXED VERSION
import { eventService, preferencesService, personalListingService, marketplaceService, businessService, aiAgentService } from './supabase';
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

// Handle plural/singular variations
function normalizeSearchTerm(term) {
  const pluralMap = {
    'bikes': 'bike',
    'cars': 'car',
    'events': 'event',
    'tickets': 'ticket',
    'tools': 'tool',
    'books': 'book',
    'games': 'game',
    'toys': 'toy'
  };
  
  return pluralMap[term] || term;
}

// Fallback search when AI is not available
async function fallbackSearch(query) {
  try {
    const searchTerms = query.toLowerCase().split(' ')
      .filter(term => term.length > 2)
      .map(term => normalizeSearchTerm(term));
    
    const checkingToday = isTodayQuery(query);
    
    const [events, listings, marketplace] = await Promise.all([
      eventService.getEvents(),
      personalListingService.getListings(),
      marketplaceService.getListings({})
    ]);

    let matchingEvents = events;
    let matchingListings = listings;
    let matchingMarketplace = marketplace;

    if (checkingToday) {
      const today = new Date();
      const todayStart = startOfDay(today);
      const todayEnd = endOfDay(today);

      matchingEvents = events.filter(event => {
        if (event.start_date) {
          const eventDate = new Date(event.start_date);
          return eventDate >= todayStart && eventDate <= todayEnd;
        }
        return false;
      });

      matchingListings = listings.filter(listing => {
        const isEventListing = listing.listing_type === 'event';
        
        if (isEventListing && listing.start_date) {
          const listingDate = new Date(listing.start_date);
          return listingDate >= todayStart && listingDate <= todayEnd;
        }
        return false;
      });

      matchingMarketplace = [];
    } else {
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
        return searchTerms.some(term => {
          return searchText.includes(term) || 
                 searchText.includes(term + 's') || 
                 searchText.includes(term.replace(/s$/, ''));
        });
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
  // Check for business info questions
  const businessInfoPatterns = {
    hours: /\b(hours|open|closed|schedule)\b/i,
    menu: /\b(menu|food|dishes|prices|items)\b/i,
    contact: /\b(phone|call|email|contact|address|location)\b/i,
    services: /\b(services|offer|provide|specialties)\b/i,
    faq: /\b(faq|questions|policies|return|cancellation)\b/i
  };
  
  let queryType = 'general';
  for (const [type, pattern] of Object.entries(businessInfoPatterns)) {
    if (pattern.test(query)) {
      queryType = type;
      break;
    }
  }
  
  if (isTodayQuery(query)) {
    return {
      dateRange: 'today',
      keywords: [],
      queryType: 'events'
    };
  }

  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'placeholder-key') {
    return {
      keywords: query.toLowerCase().split(' ')
        .filter(word => word.length > 2)
        .map(word => normalizeSearchTerm(word)),
      queryType
    };
  }

  try {
    const systemPrompt = `Parse this query about events/businesses in Lethbridge and return a JSON object with:
    - dateRange: "today", "this_weekend", "next_week", or null
    - categories: array of matching categories
    - keywords: array of search keywords (normalize plurals to singular)
    - priceRange: "free", "budget", or null
    - queryType: "hours", "menu", "contact", "services", "events", or "general"
    
    If they're asking about hours, menu, contact info, or services for a business, set queryType appropriately.
    
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
    parsed.queryType = parsed.queryType || queryType;
    
    if (parsed.keywords) {
      parsed.keywords = parsed.keywords.map(k => normalizeSearchTerm(k));
    }
    
    return parsed;
  } catch (error) {
    console.error('Error parsing query:', error);
    return {
      keywords: query.toLowerCase().split(' ')
        .filter(word => word.length > 2)
        .map(word => normalizeSearchTerm(word)),
      dateRange: isTodayQuery(query) ? 'today' : null,
      queryType
    };
  }
}

// Filter events based on criteria
function filterEvents(events, filters) {
  return events.filter(event => {
    if (filters.dateRange === 'today') {
      if (!event.start_date) return false;
      const eventDate = new Date(event.start_date);
      if (!isToday(eventDate)) return false;
      return true;
    }
    
    if (filters.dateRange && event.start_date) {
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

    if (filters.keywords && filters.keywords.length > 0) {
      const businessName = event.businesses?.name || '';
      const searchText = `${event.title} ${event.description || ''} ${event.category} ${event.location} ${businessName}`.toLowerCase();
      const hasKeyword = filters.keywords.some(keyword => {
        const normalized = normalizeSearchTerm(keyword.toLowerCase());
        return searchText.includes(normalized) || 
               searchText.includes(normalized + 's') ||
               searchText.includes(keyword.toLowerCase());
      });
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
    if (filters.dateRange === 'today') {
      const isEventListing = listing.listing_type === 'event';
      if (!isEventListing) return false;
      
      if (listing.start_date) {
        const dateObj = new Date(listing.start_date);
        return isToday(dateObj);
      }
      return false;
    }

    if (filters.keywords && filters.keywords.length > 0) {
      const searchText = `${listing.title} ${listing.description || ''} ${listing.category || ''}`.toLowerCase();
      const hasKeyword = filters.keywords.some(keyword => {
        const normalized = normalizeSearchTerm(keyword.toLowerCase());
        return searchText.includes(normalized) || 
               searchText.includes(normalized + 's') ||
               searchText.includes(keyword.toLowerCase());
      });
      if (!hasKeyword) return false;
    }

    return true;
  });
}

// Filter marketplace based on criteria
function filterMarketplace(items, filters) {
  if (filters.dateRange) return [];
  
  return items.filter(item => {
    if (filters.keywords && filters.keywords.length > 0) {
      const searchText = `${item.title} ${item.description || ''} ${item.category || ''}`.toLowerCase();
      const hasKeyword = filters.keywords.some(keyword => {
        const normalized = normalizeSearchTerm(keyword.toLowerCase());
        return searchText.includes(normalized) || 
               searchText.includes(normalized + 's') ||
               searchText.includes(keyword.toLowerCase());
      });
      if (!hasKeyword) return false;
    }
    
    return true;
  });
}

// Generate response for search results
async function generateSearchResponse(events, listings, marketplace, businesses, query, filters) {
  const totalResults = events.length + listings.length + marketplace.length + businesses.length;
  
  // Handle specific business info queries - ONLY show requested info
  if (filters?.queryType && filters.queryType !== 'general' && filters.queryType !== 'events') {
    if (businesses.length > 0) {
      const business = businesses[0];
      let response = `**${business.name}**\n\n`;
      
      if (business.ai_config && business.ai_config.is_active) {
        const config = business.ai_config;
        
        switch (filters.queryType) {
          case 'hours':
            response += config.business_info?.hours 
              ? `🕐 **Hours:**\n${config.business_info.hours}` 
              : 'Hours information not available.';
            break;
            
          case 'menu':
            if (config.menu_data?.categories?.length > 0) {
              response += `📋 **Menu:**\n\n`;
              config.menu_data.categories.forEach(category => {
                response += `**${category.name}**\n`;
                category.items?.forEach(item => {
                  response += `• ${item.name}`;
                  if (item.description) response += ` - ${item.description}`;
                  if (item.price) response += ` ($${item.price})`;
                  response += '\n';
                });
                response += '\n';
              });
            } else {
              response += 'Menu not available.';
            }
            break;
            
          case 'contact':
  // For contact queries, show ONLY the specific info requested
  if (query.toLowerCase().includes('phone') || query.toLowerCase().includes('number')) {
    return `**${business.name}**\n\n📞 **Phone:** ${business.phone || 'Phone number not available.'}`;
  } else if (query.toLowerCase().includes('address') || query.toLowerCase().includes('location')) {
    return `**${business.name}**\n\n📍 **Address:** ${business.address || 'Address not available.'}`;
  } else if (query.toLowerCase().includes('email')) {
    return `**${business.name}**\n\n📧 **Email:** ${business.email || 'Email not available.'}`;
  } else if (query.toLowerCase().includes('website')) {
    return `**${business.name}**\n\n🌐 **Website:** ${business.website || 'Website not available.'}`;
  } else {
    // Show all contact info if generic contact request
    response += `📍 **Address:** ${business.address || 'N/A'}\n`;
    response += `📞 **Phone:** ${business.phone || 'N/A'}\n`;
    response += `📧 **Email:** ${business.email || 'N/A'}\n`;
    response += `🌐 **Website:** ${business.website || 'N/A'}\n`;
    return response;
  }
            break;
            
          case 'services':
            response += config.business_info?.services 
              ? `🛠️ **Services:**\n${config.business_info.services}` 
              : 'Services information not available.';
            break;
            
          case 'faq':
            if (config.faq_data?.length > 0) {
              response += `❓ **Frequently Asked Questions:**\n\n`;
              config.faq_data.forEach(faq => {
                response += `**Q: ${faq.question}**\n`;
                response += `A: ${faq.answer}\n\n`;
              });
            } else {
              response += 'No FAQs available.';
            }
            break;
        }
        
        // DON'T show events unless specifically asked
        return response;
      } else {
        return `${business.name} does not have an AI assistant configured yet. Please contact them directly for information.`;
      }
    } else {
      return `I couldn't find that business. Try searching with different keywords.`;
    }
  }
  
  // For general business searches (just the business name), show everything INCLUDING events
  if (businesses.length > 0 && filters?.queryType === 'general' && !filters?.dateRange) {
    let response = '';
    
    businesses.slice(0, 3).forEach(business => {
      response += `🏢 **${business.name}**\n`;
      if (business.category) response += `   Type: ${business.category}\n`;
      if (business.address) response += `   📍 ${business.address}\n`;
      if (business.phone) response += `   📞 ${business.phone}\n`;
      if (business.email) response += `   📧 ${business.email}\n`;
      if (business.website) response += `   🌐 ${business.website}\n`;
      
      if (business.ai_config && business.ai_config.is_active) {
        const config = business.ai_config;
        response += `   💬 AI Assistant: "${config.agent_name}" available\n`;
        
        if (config.business_info?.hours) {
          response += `   🕐 Hours: ${config.business_info.hours.substring(0, 50)}...\n`;
        }
      }
      response += '\n';
    });
    
    // Show events for this business
    const businessEvents = events.filter(e => 
      businesses.some(b => b.name === e.businesses?.name)
    );
    
    if (businessEvents.length > 0) {
      response += `**Their Events:**\n`;
      businessEvents.slice(0, 3).forEach(event => {
        const date = event.start_date ? format(parseISO(event.start_date), 'MMM d') : 'Date TBA';
        response += `📅 ${event.title} - ${date}\n`;
      });
    }
    
    return response;
  }
  
  // Special handling for today queries with no results
  if (filters?.dateRange === 'today' && totalResults === 0) {
    return `No events found for today in Lethbridge. Check back tomorrow or browse upcoming events in the Events section!`;
  }
  
  if (totalResults === 0) {
    return `I couldn't find anything matching "${query}" in Lethbridge. Try different keywords or browse the categories!`;
  }

  let response = '';
  const hasSpecificSearch = filters?.keywords && filters.keywords.length > 0;
  
  // For today queries, show events
  if (filters?.dateRange === 'today') {
    response += `**Today's Events in Lethbridge:**\n\n`;
    
    if (events.length > 0) {
      response += `**Events:**\n`;
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
        const price = listing.price === 0 || listing.price_type === 'free' ? 'Free' : `$${listing.price}`;
        response += `• **${listing.title}**`;
        if (listing.location) response += ` at ${listing.location}`;
        response += ` (${price})`;
        if (listing.description) {
          const cleanDesc = listing.description.replace(/^"|"$/g, '');
          response += `\n  ${cleanDesc.substring(0, 100)}...`;
        }
        response += '\n';
      });
    }
  } else if (hasSpecificSearch) {
    // For keyword searches, show ALL matching types
    let foundSomething = false;
    
    // Show businesses FIRST if found
    if (businesses && businesses.length > 0) {
      response += `**Found ${businesses.length} Business${businesses.length > 1 ? 'es' : ''}:**\n\n`;
      businesses.slice(0, 5).forEach(business => {
        response += `🏢 **${business.name}**\n`;
        if (business.category) response += `   Type: ${business.category}\n`;
        if (business.address) response += `   📍 ${business.address}\n`;
        if (business.phone) response += `   📞 ${business.phone}\n`;
        
        // Show AI config info if available
        if (business.ai_config && business.ai_config.is_active) {
          const config = business.ai_config;
          response += `   💬 AI Assistant: "${config.agent_name}" available\n`;
          
          if (config.business_info?.hours) {
            response += `   🕐 Hours: ${config.business_info.hours.substring(0, 50)}...\n`;
          }
          
          if (config.menu_data?.categories?.length > 0) {
            response += `   📋 Menu/Services available\n`;
          }
          
          if (config.faq_data?.length > 0) {
            response += `   ❓ ${config.faq_data.length} FAQs available\n`;
          }
        }
        response += '\n';
      });
      foundSomething = true;
    }
    
    // Show events if found
    if (events.length > 0) {
      if (foundSomething) response += '\n';
      response += `**Found ${events.length} Event${events.length > 1 ? 's' : ''}:**\n\n`;
      events.slice(0, 5).forEach(event => {
        const date = event.start_date ? format(parseISO(event.start_date), 'MMM d') : 'Date TBA';
        const price = event.is_free ? 'Free' : `$${event.cost || 0}`;
        response += `📅 **${event.title}**\n`;
        response += `   📍 ${event.location} | 📆 ${date} | 💵 ${price}\n`;
        if (event.description) {
          response += `   ${event.description.substring(0, 80)}...\n`;
        }
        response += '\n';
      });
      foundSomething = true;
    }
    
    // Show marketplace items if found
    if (marketplace.length > 0) {
      if (foundSomething) response += '\n';
      response += `**Found ${marketplace.length} Item${marketplace.length > 1 ? 's' : ''} for Sale:**\n\n`;
      marketplace.slice(0, 5).forEach(item => {
        response += `🛍️ **${item.title}** - $${item.price || 0}\n`;
        if (item.condition) response += `   Condition: ${item.condition}\n`;
        if (item.description) {
          response += `   ${item.description.substring(0, 80)}...\n`;
        }
        response += '\n';
      });
      foundSomething = true;
    }
    
    // Show community listings if found
    if (listings.length > 0 && listings.some(l => l.listing_type !== 'event')) {
      if (foundSomething) response += '\n';
      response += `**Found ${listings.length} Community Listing${listings.length > 1 ? 's' : ''}:**\n\n`;
      listings.slice(0, 5).forEach(listing => {
        response += `📌 **${listing.title}**\n`;
        if (listing.location) response += `   📍 ${listing.location}\n`;
        if (listing.description) {
          response += `   ${listing.description.substring(0, 80)}...\n`;
        }
        response += '\n';
      });
      foundSomething = true;
    }
    
    // If nothing found
    if (!foundSomething) {
      response = `No items found matching "${query}". Try different search terms or browse the categories.`;
    }
  }

  return response || 'Try searching for something specific!';
}

// Main AI Service Object
export const aiService = {
  // Search for events, listings, and marketplace items
  async searchEvents(query, userId = null) {
    console.log('AI Search Query:', query);
    
    try {
      let filters;
      let matchingEvents = [];
      let matchingListings = [];
      let matchingMarketplace = [];
      let matchingBusinesses = [];

      // Parse the query
      filters = await parseUserQuery(query);
      console.log('Parsed filters:', filters);
      
      // Get all data
      const [allEvents, allListings, allMarketplace, allBusinesses, allAIConfigs] = await Promise.all([
        eventService.getEvents(),
        personalListingService.getListings(),
        marketplaceService.getListings({}),
        businessService.getBusinesses(),  
        aiAgentService.getAllAgentConfigs()  
      ]);
      
      console.log('Data fetched:', {
        events: allEvents.length,
        listings: allListings.length,
        marketplace: allMarketplace.length,
        businesses: allBusinesses.length  
      });

      // Apply filters based on query type
      if (filters.dateRange === 'today') {
        // For today queries, only get today's events
        const today = new Date();
        const todayStart = startOfDay(today);
        const todayEnd = endOfDay(today);
        
        matchingEvents = allEvents.filter(event => {
          if (!event.start_date) return false;
          const eventDate = new Date(event.start_date);
          return eventDate >= todayStart && eventDate <= todayEnd;
        });
        
        matchingListings = allListings.filter(listing => {
          if (listing.listing_type !== 'event') return false;
          if (!listing.start_date) return false;
          const listingDate = new Date(listing.start_date);
          return listingDate >= todayStart && listingDate <= todayEnd;
        });
        
        matchingMarketplace = [];
        matchingBusinesses = [];
      } else {
        // Regular search - filter all types by keywords
        matchingEvents = filterEvents(allEvents, filters);
        matchingListings = filterListings(allListings, filters);
        matchingMarketplace = filterMarketplace(allMarketplace, filters);
        
        // Filter businesses by keywords
        if (filters.keywords && filters.keywords.length > 0) {
          matchingBusinesses = allBusinesses.filter(business => {
            const searchText = `${business.name} ${business.description || ''} ${business.category || ''}`.toLowerCase();
            return filters.keywords.some(keyword => {
              const normalized = normalizeSearchTerm(keyword.toLowerCase());
              return searchText.includes(normalized) || 
                     searchText.includes(normalized + 's') ||
                     searchText.includes(keyword.toLowerCase());
            });
          });
          
          // Attach AI configs to matching businesses
          matchingBusinesses = matchingBusinesses.map(business => {
            const aiConfig = allAIConfigs.find(config => config.business_id === business.id);
            return { ...business, ai_config: aiConfig };
          });
        }
      }
      
      console.log('Filtered results:', {
        events: matchingEvents.length,
        listings: matchingListings.length,
        marketplace: matchingMarketplace.length,
        businesses: matchingBusinesses.length
      });

      const message = await generateSearchResponse(
        matchingEvents, 
        matchingListings, 
        matchingMarketplace,
        matchingBusinesses,
        query,
        filters
      );

      return {
        message,
        events: matchingEvents,
        personalListings: matchingListings,
        marketplace: matchingMarketplace,
        businesses: matchingBusinesses,
        filters,
        totalResults: matchingEvents.length + matchingListings.length + matchingMarketplace.length + matchingBusinesses.length
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
          [],  // No businesses in fallback
          query,
          results.filters
        );
        
        return {
          message,
          events: results.events,
          personalListings: results.personalListings,
          marketplace: results.marketplace,
          businesses: [],
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
          businesses: [],
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