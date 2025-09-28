// src/services/businessAIAgent.js
import { aiAgentService, eventService, businessService } from './supabase';
import { contentModeration } from './moderation';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export const businessAIAgent = {
  // Initialize or get existing agent config
  async initializeAgent(businessId, businessInfo) {
    let agentConfig = await aiAgentService.getAgentConfig(businessId);
    
    if (!agentConfig) {
      // Create default agent configuration
      agentConfig = await aiAgentService.createAgentConfig(businessId, {
        agent_name: `${businessInfo.name} Assistant`,
        agent_personality: 'professional',
        business_info: {
          name: businessInfo.name,
          description: businessInfo.description,
          category: businessInfo.category,
          address: businessInfo.address,
          phone: businessInfo.phone,
          email: businessInfo.email,
          website: businessInfo.website
        },
        enabled: false, // Requires manual activation
        response_style: 'friendly',
        max_response_length: 300
      });
    }
    
    return agentConfig;
  },

  // Build system prompt for the AI agent
  async buildSystemPrompt(agentConfig, businessInfo) {
    const { business_info, menu_data, faq_data, policies, agent_personality } = agentConfig;
    
    // Start with business-specific prompt
    let prompt = `You are an AI assistant for ${business_info.name}. `;
    
    // Add personality traits
    switch (agent_personality) {
      case 'professional':
        prompt += 'You are professional, knowledgeable, and helpful. ';
        break;
      case 'friendly':
        prompt += 'You are warm, friendly, and enthusiastic about helping customers. ';
        break;
      case 'casual':
        prompt += 'You are casual, approachable, and conversational. ';
        break;
    }
    
    // PRIMARY CONTEXT - Business specific
    prompt += `\n\n=== PRIMARY KNOWLEDGE (About ${business_info.name}) ===\n`;
    prompt += `You are the dedicated assistant for this business. When people ask questions, prioritize this information:\n\n`;
    
    prompt += `Business Information:\n`;
    prompt += `- Name: ${business_info.name}\n`;
    prompt += `- Type: ${business_info.category}\n`;
    prompt += `- Description: ${business_info.description}\n`;
    prompt += `- Address: ${business_info.address}\n`;
    prompt += `- Phone: ${business_info.phone}\n`;
    prompt += `- Email: ${business_info.email}\n`;
    if (business_info.operating_hours) {
      prompt += `- Hours: ${JSON.stringify(business_info.operating_hours)}\n`;
    }
    
    // Add menu if available
    if (menu_data && menu_data.categories && menu_data.categories.length > 0) {
      prompt += `\n\nMenu/Services:\n`;
      menu_data.categories.forEach(category => {
        prompt += `\n${category.name}:\n`;
        category.items.forEach(item => {
          prompt += `- ${item.name}: ${item.description} - ${item.price}\n`;
        });
      });
    }
    
    // Add FAQs if available
    if (faq_data && Array.isArray(faq_data) && faq_data.length > 0) {
      prompt += `\n\nFrequently Asked Questions:\n`;
      faq_data.forEach(faq => {
        prompt += `Q: ${faq.question}\nA: ${faq.answer}\n\n`;
      });
    }
    
    // Add policies if available
    if (policies && Object.keys(policies).length > 0) {
      prompt += `\n\nBusiness Policies:\n`;
      if (policies.return_policy) prompt += `Return Policy: ${policies.return_policy}\n`;
      if (policies.cancellation_policy) prompt += `Cancellation Policy: ${policies.cancellation_policy}\n`;
      if (policies.privacy_policy) prompt += `Privacy Policy: ${policies.privacy_policy}\n`;
    }
    
    // SECONDARY CONTEXT - Platform-wide Lethbridge data
    if (agentConfig.include_platform_data) {
      prompt += `\n\n=== SECONDARY KNOWLEDGE (Lethbridge Area Information) ===\n`;
      prompt += `You also have knowledge about the broader Lethbridge area to help visitors:\n\n`;
      
      // Fetch and add platform-wide context
      const lethbridgeContext = await this.fetchLethbridgeContext(businessInfo);
      prompt += lethbridgeContext;
    }
    
    // Add instructions
    prompt += `\n\n=== INSTRUCTIONS ===
- ALWAYS prioritize information about ${business_info.name} when answering questions
- Be helpful and guide customers to make informed decisions
- If asked specifically about ${business_info.name}, use the PRIMARY KNOWLEDGE section
- If asked about other businesses or events in Lethbridge, you can reference SECONDARY KNOWLEDGE
- When mentioning other businesses, always bring the conversation back to how ${business_info.name} can serve them
- If you don't know something specific about ${business_info.name}, suggest contacting them directly
- Keep responses concise (under ${agentConfig.max_response_length} characters)
- Never make up information not provided in your knowledge base
- Always maintain a ${agent_personality} tone
- If asked about current promotions or time-sensitive info, suggest checking with the business directly`;
    
    return prompt;
  },

  // Fetch Lethbridge-wide context from the platform
  async fetchLethbridgeContext(businessInfo) {
    let context = '';
    
    try {
      // Get upcoming events (next 7 days)
      const upcomingEvents = await eventService.getUpcomingEvents(7);
      if (upcomingEvents && upcomingEvents.length > 0) {
        context += `Upcoming Events in Lethbridge:\n`;
        upcomingEvents.slice(0, 10).forEach(event => {
          context += `- "${event.title}" at ${event.location} on ${new Date(event.start_date).toLocaleDateString()} (${event.category}${event.is_free ? ', Free' : `, $${event.cost}`})\n`;
        });
        context += '\n';
      }
      
      // Get other businesses in the same category
      const similarBusinesses = await businessService.getBusinessesByCategory(businessInfo.category);
      if (similarBusinesses && similarBusinesses.length > 0) {
        context += `Other ${businessInfo.category} businesses in Lethbridge:\n`;
        similarBusinesses
          .filter(biz => biz.id !== businessInfo.id) // Exclude current business
          .slice(0, 5)
          .forEach(biz => {
            context += `- ${biz.name} at ${biz.address || 'location not specified'}\n`;
          });
        context += '\n';
      }
      
      // Get popular events this week
      const popularEvents = await eventService.getPopularEvents(5);
      if (popularEvents && popularEvents.length > 0) {
        context += `Popular events this week:\n`;
        popularEvents.forEach(event => {
          context += `- "${event.title}" (${event.view_count} views)\n`;
        });
        context += '\n';
      }
      
      // Add general Lethbridge info
      context += `General Lethbridge Information:\n`;
      context += `- Lethbridge is located in southern Alberta, Canada\n`;
      context += `- Population: approximately 100,000\n`;
      context += `- Known for: University of Lethbridge, coulees, High Level Bridge, Nikka Yuko Japanese Garden\n`;
      context += `- Downtown area features many local businesses, restaurants, and cultural venues\n`;
      
    } catch (error) {
      console.error('Error fetching Lethbridge context:', error);
      context += `[Note: Unable to fetch current platform data]\n`;
    }
    
    return context;
  },

  // Enhanced message processor
  async processMessage(businessId, userMessage, sessionId, userId = null) {
    try {
      // Check query limit
      const { canQuery, used, limit } = await aiAgentService.checkQueryLimit(businessId);
      
      if (!canQuery) {
        return {
          success: false,
          message: "I apologize, but we've reached our conversation limit for this month. Please contact the business directly for further assistance.",
          error: 'QUERY_LIMIT_EXCEEDED'
        };
      }

      // Moderate user input
      const moderation = await contentModeration.moderateChat(userMessage);
      if (!moderation.approved) {
        return {
          success: false,
          message: "I'm sorry, but I cannot process that message. Please keep our conversation appropriate.",
          error: 'CONTENT_MODERATED'
        };
      }

      // Get agent config and business info
      const agentConfig = await aiAgentService.getAgentConfig(businessId);
      if (!agentConfig || !agentConfig.is_active) {
        return {
          success: false,
          message: "I'm sorry, but the AI assistant is not currently available. Please contact the business directly.",
          error: 'AGENT_DISABLED'
        };
      }

      // Get full business info for context
      const businessInfo = await businessService.getBusinessById(businessId);
      
      // Build conversation context with platform data if enabled
      const systemPrompt = await this.buildSystemPrompt(agentConfig, businessInfo);
      
      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          max_tokens: Math.ceil(agentConfig.max_response_length / 4),
          temperature: 0.7,
          presence_penalty: 0.1,
          frequency_penalty: 0.1
        })
      });

      if (!response.ok) {
        throw new Error('OpenAI API error');
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      const tokensUsed = data.usage.total_tokens;

      // Track usage
      await aiAgentService.trackQuery(businessId);

      // Save conversation
      const conversation = {
        messages: [
          { role: 'user', content: userMessage, timestamp: new Date() },
          { role: 'assistant', content: aiResponse, timestamp: new Date() }
        ]
      };
      
      await aiAgentService.saveConversation(
        businessId,
        userId,
        sessionId,
        conversation.messages,
        tokensUsed
      );

      return {
        success: true,
        message: aiResponse,
        usage: {
          queriesUsed: used + 1,
          queriesLimit: limit
        }
      };
    } catch (error) {
      console.error('Business AI Agent error:', error);
      return {
        success: false,
        message: "I apologize, but I'm having trouble processing your request. Please try again or contact the business directly.",
        error: error.message
      };
    }
  },

  // Update agent knowledge base
  async updateKnowledgeBase(businessId, knowledgeType, data) {
    const validTypes = ['business_info', 'menu_data', 'faq_data', 'policies'];
    
    if (!validTypes.includes(knowledgeType)) {
      throw new Error('Invalid knowledge type');
    }

    await aiAgentService.updateKnowledgeBase(businessId, knowledgeType, data);
  },

  // Train agent with example conversations
  async trainAgent(businessId, trainingData) {
    // This would be used for fine-tuning in a production environment
    // For now, we'll store training examples in the knowledge base
    const agentConfig = await aiAgentService.getAgentConfig(businessId);
    
    const updatedKnowledgeBase = {
      ...agentConfig.knowledge_base,
      training_examples: trainingData
    };

    await aiAgentService.updateAgentConfig(businessId, {
      knowledge_base: updatedKnowledgeBase
    });
  },

  // Get agent analytics
  async getAnalytics(businessId, dateRange = null) {
    // Get conversation history
    const conversations = await aiAgentService.getConversations(businessId, dateRange);
    
    // Calculate metrics
    const metrics = {
      totalConversations: conversations.length,
      uniqueUsers: new Set(conversations.map(c => c.user_id || c.session_id)).size,
      averageRating: conversations
        .filter(c => c.user_satisfaction_rating)
        .reduce((sum, c) => sum + c.user_satisfaction_rating, 0) / 
        conversations.filter(c => c.user_satisfaction_rating).length || 0,
      resolvedQueries: conversations.filter(c => c.resolved_query).length,
      totalTokensUsed: conversations.reduce((sum, c) => sum + c.total_tokens_used, 0),
      popularTopics: this.extractPopularTopics(conversations),
      peakHours: this.calculatePeakHours(conversations)
    };

    return metrics;
  },

  // Helper function to extract popular topics
  extractPopularTopics(conversations) {
    const topics = {};
    const commonKeywords = [
      'hours', 'menu', 'price', 'location', 'parking', 'reservation',
      'delivery', 'special', 'event', 'contact'
    ];

    conversations.forEach(conv => {
      conv.messages.forEach(msg => {
        if (msg.role === 'user') {
          const lowercaseMsg = msg.content.toLowerCase();
          commonKeywords.forEach(keyword => {
            if (lowercaseMsg.includes(keyword)) {
              topics[keyword] = (topics[keyword] || 0) + 1;
            }
          });
        }
      });
    });

    return Object.entries(topics)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic, count]) => ({ topic, count }));
  },

  // Helper function to calculate peak hours
  calculatePeakHours(conversations) {
    const hourCounts = new Array(24).fill(0);
    
    conversations.forEach(conv => {
      const hour = new Date(conv.created_at).getHours();
      hourCounts[hour]++;
    });

    const peakHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return peakHours;
  },

  // Generate conversation starter suggestions
  generateStarters(businessInfo, agentConfig) {
    const starters = [];

    // Hours-based starter
    if (businessInfo.operating_hours) {
      starters.push("What are your hours today?");
    }

    // Menu/service-based starter
    if (agentConfig.menu_data && Object.keys(agentConfig.menu_data).length > 0) {
      starters.push("Can I see your menu?");
      starters.push("What are today's specials?");
    }

    // Location-based starter
    if (businessInfo.address) {
      starters.push("Where are you located?");
      starters.push("Do you have parking available?");
    }

    // Category-specific starters
    switch (businessInfo.category) {
      case 'Restaurant':
        starters.push("Do you take reservations?");
        starters.push("Do you offer delivery?");
        break;
      case 'Retail':
        starters.push("What are your return policies?");
        starters.push("Do you offer gift cards?");
        break;
      case 'Services':
        starters.push("How can I book an appointment?");
        starters.push("What services do you offer?");
        break;
    }

    return starters.slice(0, 4); // Return max 4 starters
  },

  // Validate agent configuration
  validateAgentConfig(config) {
    const errors = [];

    if (!config.agent_name || config.agent_name.length < 3) {
      errors.push('Agent name must be at least 3 characters');
    }

    if (!config.business_info || !config.business_info.name) {
      errors.push('Business name is required');
    }

    if (config.max_response_length < 50 || config.max_response_length > 1000) {
      errors.push('Response length must be between 50 and 1000 characters');
    }

    if (config.monthly_queries_limit < 100) {
      errors.push('Monthly query limit must be at least 100');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
};