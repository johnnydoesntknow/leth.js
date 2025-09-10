// src/services/supabase.js - Complete Fixed Version
import { createClient } from '@supabase/supabase-js';

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

    async createBusiness(businessData) {
    try {
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

  async createAgentConfig(businessId, config) {
    try {
      const { data, error } = await supabase
        .from('business_ai_agents')
        .insert([{ business_id: businessId, ...config }])
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
      const { data, error } = await supabase
        .from('business_ai_agents')
        .update(updates)
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