// src/services/supabase.js - Complete Fixed Version
import { createClient } from '@supabase/supabase-js';
import { geocodingService } from './geocoding';

// Get environment variables with fallbacks
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'lethbridge-ai-auth',
    storage: window.localStorage,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});

// Error handler
const handleError = (operation, error, throwError = true) => {
  console.error(`${operation} error:`, error);
  if (throwError) throw error;
  return null;
};

// ===== AUTH SERVICES =====
export const authService = {
  async signUp(email, password, metadata = {}) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: window.location.origin
        }
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      return handleError('Sign up', error);
    }
  },

  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      return handleError('Sign in', error);
    }
  },

  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      return handleError('Sign out', error);
    }
  },

  async getUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;
      
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error && error.message !== 'Auth session missing!') throw error;
      
      return user;
    } catch (error) {
      return handleError('Get user', error, false);
    }
  }
};

// ===== PROFILE SERVICES =====
export const profileService = {
  async getProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      return handleError('Get profile', error, false);
    }
  },

  async createProfile(profileData) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert([profileData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      return handleError('Create profile', error);
    }
  },

  async updateProfile(userId, updates) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      return handleError('Update profile', error);
    }
  }
};

// ===== BUSINESS SERVICES =====
export const businessService = {
  async getBusinesses() {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      return handleError('Get businesses', error, false);
    }
  },
  async getBusinessByOwner(ownerId) {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select(`
        *,
        subscription_tier:subscription_tier_id(*)
      `)
      .eq('owner_id', ownerId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (error) {
    return handleError('Get business by owner', error, false);
  }
},

    async createBusiness(businessData) {
    try {
      if (businessData.address && !businessData.latitude) {
        const coords = await geocodingService.getCoordinates(businessData.address);
        if (coords) {
          businessData.latitude = coords.lat;
          businessData.longitude = coords.lon;
          console.log('Geocoded new business location:', coords);
        }
      }
      // Changed from 'free' to 'starter' to match your database
      const { data: starterTier } = await supabase
        .from('business_subscription_tiers')
        .select('id')
        .eq('name', 'starter')
        .single();

      const { data, error } = await supabase
        .from('businesses')
        .insert([{
          ...businessData,
          subscription_tier_id: starterTier?.id
        }])
        .select(`
          *,
          subscription_tier:subscription_tier_id(*)
        `)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      return handleError('Create business', error);
    }
  },

  async getBusinessEvents(businessId) {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          event_images (
            id,
            image_url,
            caption,
            is_primary
          )
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      return handleError('Get business events', error, false);
    }
  },
  

  async getBusinessAnalytics(businessId) {
    try {
      const { data: events } = await supabase
        .from('events')
        .select('view_count, created_at')
        .eq('business_id', businessId);

      const totalViews = events?.reduce((sum, event) => sum + (event.view_count || 0), 0) || 0;
      const totalEvents = events?.length || 0;

      return {
        totalEvents,
        totalViews,
        averageViews: totalEvents > 0 ? Math.round(totalViews / totalEvents) : 0
      };
    } catch (error) {
      return handleError('Get analytics', error, false);
    }
  },

// In supabase.js
async updateBusiness(businessId, updates) {
  try {

    if (updates.address && !updates.latitude) {
        const coords = await geocodingService.getCoordinates(updates.address);
        if (coords) {
          updates.latitude = coords.lat;
          updates.longitude = coords.lon;
          console.log('Geocoded updated business location:', coords);
        }
      }

    
    const { data, error } = await supabase
      .from('businesses')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId)
      .select('*')  // Simplified - just select all columns without the join
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    return handleError('Update business', error);
  }
},

  // You might also want to add a method to get a single business:
  async getBusiness(businessId) {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select(`
          *,
          subscription_tier:subscription_tier_id(*)
        `)
        .eq('id', businessId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      return handleError('Get business', error, false);
    }
  },
async getBusinessesByCategory(category) {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('category', category)
      .order('name');
    
    if (error) throw error;
    return data;
  },
  
  async getBusinessById(id) {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }
};



// ===== EVENT SERVICES =====
export const eventService = {
  async getEvents(filters = {}) {
    try {
      let query = supabase
        .from('events')
        .select(`
          *,
          businesses (
            id,
            name,
            description,
            logo_url
          ),
          event_images (
            id,
            image_url,
            caption,
            is_primary
          )
        `)
        .order('start_date', { ascending: true });

      // Apply filters
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }
      
      if (filters.isFree) {
        query = query.eq('is_free', true);
      }
      
      if (filters.featured) {
        query = query.eq('is_featured', true);
      }
      
      if (filters.promoted) {
        query = query.eq('is_promoted', true);
      }
      
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Get events error:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Get events error:', error);
      return [];
    }
  },

  async createEvent(eventData) {
    try {
    if (eventData.location && !eventData.latitude) {
      console.log('📍 Geocoding location:', eventData.location);
      const coords = await geocodingService.getCoordinates(eventData.location);
      console.log('📍 Geocoding result:', coords);
      
      if (coords) {
        eventData.latitude = coords.lat;
        eventData.longitude = coords.lon;
        console.log('📍 Saved coords:', coords.lat, coords.lon);
      }
    }
      // Remove any extra fields that don't belong in the database
      const { images, ...eventDataForDb } = eventData;
      
      const { data: event, error } = await supabase
        .from('events')
        .insert([{
          ...eventDataForDb,
          is_approved: true,
          moderation_status: 'approved'
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Create event error:', error);
        throw error;
      }

      return event;
    } catch (error) {
      console.error('Create event error:', error);
      throw error;
    }
  },

  async updateEvent(eventId, updates) {
    try {

      if (updates.location && !updates.latitude) {
      const coords = await geocodingService.getCoordinates(updates.location);
      if (coords) {
        updates.latitude = coords.lat;
        updates.longitude = coords.lon;
        console.log('Geocoded updated event location:', coords);
      }
    }
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', eventId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      return handleError('Update event', error);
    }
  },

  async deleteEvent(eventId) {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);
      
      if (error) throw error;
    } catch (error) {
      return handleError('Delete event', error);
    }
  },

  async searchEvents(searchParams = {}) {
    return this.getEvents(searchParams);
  },

  async incrementViewCount(eventId) {
    try {
      const { data: event } = await supabase
        .from('events')
        .select('view_count')
        .eq('id', eventId)
        .single();
      
      if (event) {
        await supabase
          .from('events')
          .update({ view_count: (event.view_count || 0) + 1 })
          .eq('id', eventId);
      }
    } catch (error) {
      console.error('Increment view count error:', error);
    }
  },
async getUpcomingEvents(days = 7) {
    const now = new Date();
    const future = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
    
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .gte('start_date', now.toISOString())
      .lte('start_date', future.toISOString())
      .order('start_date', { ascending: true });
    
    if (error) throw error;
    return data;
  },
  
  async getPopularEvents(limit = 5) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .gte('start_date', new Date().toISOString())
      .order('view_count', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  }
};


// ===== AI AGENT SERVICES =====
export const aiAgentService = {
  async getAgentConfig(businessId) {
    try {
      const { data, error } = await supabase
        .from('business_ai_agents')
        .select('*')
        .eq('business_id', businessId)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Get AI agent error:', error);
      }
      
      return data;
    } catch (error) {
      console.error('Get AI agent config error:', error);
      return null;
    }
  },

async getAllAgentConfigs() {
  try {
    const { data, error } = await supabase
      .from('business_ai_agents')
      .select('*')
      .eq('is_active', true);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Get all AI configs error:', error);
    return [];
  }
},
  async createAgentConfig(businessId, config) {
    try {
      const { data, error } = await supabase
        .from('business_ai_agents')
        .insert([{ 
          business_id: businessId,
          is_active: config.is_active || true,  // Changed from is_enabled
          agent_personality: config.agent_personality || 'professional',  // Changed from personality_type
          welcome_message: config.welcome_message || 'Hello! How can I help you today?',
          business_info: config.business_info || {},
          max_response_length: config.max_response_length || 500,
          agent_name: config.agent_name || 'AI Assistant',
          monthly_queries_limit: 1000,  // Pro tier gets 1000 queries
          monthly_queries_used: 0,
          menu_data: config.menu_data || {},
          faq_data: config.faq_data || {},
          policies: config.policies || {}
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      return handleError('Create AI agent config', error);
    }
  },

  async updateAgentConfig(businessId, updates) {
    try {
      // Map the field names if needed
      const mappedUpdates = {
        ...updates,
        is_active: updates.is_enabled !== undefined ? updates.is_enabled : updates.is_active,
        agent_personality: updates.personality_type || updates.agent_personality,
      };
      
      // Remove undefined fields
      Object.keys(mappedUpdates).forEach(key => 
        mappedUpdates[key] === undefined && delete mappedUpdates[key]
      );

      const { data, error } = await supabase
        .from('business_ai_agents')
        .update(mappedUpdates)
        .eq('business_id', businessId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      return handleError('Update AI agent config', error);
    }
  }
};

// ===== IMAGE SERVICES =====
export const imageService = {
  async uploadImage(file, bucket = 'event-images') {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);

      if (error) {
        console.error('Upload error:', error);
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Upload image error:', error);
      throw error;
    }
  }
};

// ===== SUBSCRIPTION SERVICES =====
export const subscriptionService = {
  async getTiers() {
    try {
      const { data, error } = await supabase
        .from('business_subscription_tiers')
        .select('*')
        .order('price', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      return handleError('Get subscription tiers', error, false);
    }
  },


async getTierByName(name) {
    try {
      const { data, error } = await supabase
        .from('business_subscription_tiers')
        .select('*')
        .eq('name', name)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      return handleError('Get tier by name', error, false);
    }
  },

async createTier(tierData) {
    try {
      const { data, error } = await supabase
        .from('business_subscription_tiers')
        .insert([{
          name: tierData.name,
          price: tierData.price,
          max_events_per_month: tierData.max_events_per_month,
          max_images_per_event: tierData.max_images_per_event,
          ai_agent_enabled: tierData.ai_agent_enabled || false,
          ai_agent_monthly_queries: tierData.ai_agent_monthly_queries || 0,
          features: JSON.stringify(tierData.features || [])
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      return handleError('Create tier', error);
    }
  }
};

// ===== PREFERENCES SERVICES =====
export const preferencesService = {
  async getPreferences(userId) {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(); // Changed from .single() to .maybeSingle()
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error getting preferences:', error);
      return null; // Return null instead of throwing
    }
  },

  async updatePreferences(userId, preferences) {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      return handleError('Update preferences', error);
    }
  }
};



// ===== PERSONAL LISTING SERVICES =====
export const personalListingService = {
  async createListing(listingData, userId) {
    try {
      const { data, error } = await supabase
        .from('personal_listings')
        .insert([{
          ...listingData,
          user_id: userId
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      return handleError('Create listing', error);
    }
  },

  async getListings() {
    try {
      const { data, error } = await supabase
        .from('personal_listings')
        .select('*')
        .eq('is_active', true)
        .eq('moderation_status', 'approved')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting listings:', error);
      return [];
    }
  },

  async getUserListings(userId) {
    try {
      const { data, error } = await supabase
        .from('personal_listings')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      return handleError('Get user listings', error, false) || [];
    }
  },

  async updateListing(id, updates) {
    try {
      const { data, error } = await supabase
        .from('personal_listings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      return handleError('Update listing', error);
    }
  },

  async deleteListing(id, userId) {
    try {
      const { error } = await supabase
        .from('personal_listings')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      
      if (error) throw error;
    } catch (error) {
      return handleError('Delete listing', error);
    }
  }
};

// ===== INTERACTION SERVICES =====
export const interactionService = {
  async createInteraction(eventId, userId, interactionType) {
    try {
      const { data, error } = await supabase
        .from('user_interactions')
        .insert([{
          user_id: userId,
          event_id: eventId,
          interaction_type: interactionType
        }])
        .select()
        .single();
      
      if (error && error.code !== '23505') throw error;
      return data;
    } catch (error) {
      console.error('Create interaction error:', error);
      return null;
    }
  }
};
// ===== MARKETPLACE SERVICES =====
export const marketplaceService = {
  async getListings(filters = {}) {
    try {
      let query = supabase
        .from('marketplace_listings')
        .select('*')
        .eq('is_active', true)
        .eq('is_sold', false)
        .order('created_at', { ascending: false });

      if (filters.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }
      
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }
      
      if (filters.minPrice) {
        query = query.gte('price', filters.minPrice);
      }
      
      if (filters.maxPrice) {
        query = query.lte('price', filters.maxPrice);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get marketplace listings error:', error);
      return [];
    }
  },

  async createListing(listingData) {
    try {
      // Ensure listing_type is an array
      const processedData = {
        ...listingData,
        listing_type: listingData.listing_type || ['sell']
      };
      
      const { data, error } = await supabase
        .from('marketplace_listings')
        .insert([processedData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create listing error:', error);
      throw error;
    }
  },

  async updateListing(listingId, updates) {
    try {
      const { data, error } = await supabase
        .from('marketplace_listings')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', listingId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update listing error:', error);
      throw error;
    }
  },

  async deleteListing(listingId) {
    try {
      const { error } = await supabase
        .from('marketplace_listings')
        .update({ is_active: false })
        .eq('id', listingId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Delete listing error:', error);
      throw error;
    }
  },


  async getUserListings(userId) {
    try {
      const { data, error } = await supabase
        .from('marketplace_listings')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get user listings error:', error);
      return [];
    }
  }
};

  
// ===== CHAT SERVICES =====
export const chatService = {
  async getOrCreateConversation(user1Id, user2Id) {
    try {
      // Order the IDs to ensure consistency
      const [participantA, participantB] = [user1Id, user2Id].sort();
      
      // Check if conversation exists
      const { data: existing, error: searchError } = await supabase
        .from('conversations')
        .select('*')
        .eq('participant1_id', participantA)
        .eq('participant2_id', participantB)
        .single();

      if (existing) return existing;

      // Create new conversation with ordered IDs
      const { data, error } = await supabase
        .from('conversations')
        .insert([{
          participant1_id: participantA,
          participant2_id: participantB,
          last_message: null,
          last_message_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('Create conversation error:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      // If it's not a "not found" error, throw it
      if (error.code !== 'PGRST116') {
        console.error('Get/create conversation error:', error);
        throw error;
      }
      return null;
    }
  },

  async getMessages(conversationId) {
    try {
      // Simple query without the join first
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get sender profiles separately if needed
      if (messages && messages.length > 0) {
        const senderIds = [...new Set(messages.map(m => m.sender_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', senderIds);

        // Merge profile data with messages
        const messagesWithProfiles = messages.map(msg => ({
          ...msg,
          sender: profiles?.find(p => p.user_id === msg.sender_id) || null
        }));

        return messagesWithProfiles;
      }

      return messages || [];
    } catch (error) {
      console.error('Get messages error:', error);
      return [];
    }
  },

  async sendMessage(conversationId, senderId, content) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([{
          conversation_id: conversationId,
          sender_id: senderId,
          content,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      // Update conversation's last message
      await supabase
        .from('conversations')
        .update({
          last_message: content,
          last_message_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      return data;
    } catch (error) {
      console.error('Send message error:', error);
      throw error;
    }
  },
  async markMessagesAsRead(conversationId, userId) {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId); // Only mark messages from the OTHER person as read
    
    if (error) throw error;
  } catch (error) {
    console.error('Error marking messages as read:', error);
  }
},

  async getConversations(userId) {
    try {
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Get participant profiles separately
      if (conversations && conversations.length > 0) {
        const participantIds = [...new Set(
          conversations.flatMap(c => [c.participant1_id, c.participant2_id])
        )];

        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', participantIds);

        // Add profile data to conversations
        const conversationsWithProfiles = conversations.map(conv => ({
          ...conv,
          participant1: profiles?.find(p => p.user_id === conv.participant1_id),
          participant2: profiles?.find(p => p.user_id === conv.participant2_id)
        }));

        return conversationsWithProfiles;
      }

      return conversations || [];
    } catch (error) {
      console.error('Get conversations error:', error);
      return [];
    }
  },

  subscribeToMessages(conversationId, callback) {
    return supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        }, 
        callback
      )
      .subscribe();
  }
};


// ===== NOTIFICATION SERVICES =====
export const notificationService = {
  async getNotifications(userId) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get notifications error:', error);
      return [];
    }
  },

  async markAsRead(notificationId) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Mark notification as read error:', error);
    }
  },

  async createNotification(userId, type, title, content, relatedId = null) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([{
          user_id: userId,
          type,
          title,
          content,
          related_id: relatedId
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create notification error:', error);
      throw error;
    }
  },

  subscribeToNotifications(userId, callback) {
    return supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe();
  }

};

