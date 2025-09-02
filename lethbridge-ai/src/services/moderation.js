// src/services/moderation.js
import { moderationService } from './supabase';

// OpenAI moderation endpoint (free)
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// Google Cloud Vision API for image moderation
const GOOGLE_CLOUD_API_KEY = import.meta.env.VITE_GOOGLE_CLOUD_API_KEY;
const GOOGLE_VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';

export const contentModeration = {
  // Text moderation using OpenAI
  async moderateText(text, contentId, contentTable) {
    try {
      const response = await fetch('https://api.openai.com/v1/moderations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          input: text
        })
      });

      if (!response.ok) {
        throw new Error('Moderation API error');
      }

      const data = await response.json();
      const result = data.results[0];

      // Determine action based on moderation results
      let action = 'approved';
      let shouldReject = false;

      // Check for high-confidence violations
      const categories = result.categories;
      const categoryScores = result.category_scores;

      // Define thresholds for auto-rejection
      const rejectThresholds = {
        'sexual/minors': 0.5,
        'hate': 0.7,
        'hate/threatening': 0.5,
        'self-harm': 0.7,
        'self-harm/intent': 0.5,
        'self-harm/instructions': 0.5,
        'violence': 0.8,
        'violence/graphic': 0.7
      };

      // Check each category
      for (const [category, threshold] of Object.entries(rejectThresholds)) {
        if (categoryScores[category] > threshold) {
          shouldReject = true;
          action = 'rejected';
          break;
        }
      }

      // Flag for manual review if moderate confidence
      if (!shouldReject && result.flagged) {
        action = 'manual_review';
      }

      // Log moderation result
      await moderationService.logModeration(
        'text',
        contentId,
        contentTable,
        result,
        action
      );

      // Update content status
      await moderationService.updateModerationStatus(
        contentTable,
        contentId,
        action
      );

      return {
        approved: action === 'approved',
        flagged: result.flagged,
        action,
        categories: result.categories,
        scores: result.category_scores
      };
    } catch (error) {
      console.error('Text moderation error:', error);
      // Default to manual review on error
      await moderationService.updateModerationStatus(
        contentTable,
        contentId,
        'manual_review'
      );
      return {
        approved: false,
        flagged: true,
        action: 'manual_review',
        error: error.message
      };
    }
  },

  // Image moderation using Google Cloud Vision
  async moderateImage(imageUrl, contentId, contentTable) {
    try {
      const requestBody = {
        requests: [{
          image: {
            source: {
              imageUri: imageUrl
            }
          },
          features: [
            { type: 'SAFE_SEARCH_DETECTION' },
            { type: 'LABEL_DETECTION', maxResults: 10 }
          ]
        }]
      };

      const response = await fetch(
        `${GOOGLE_VISION_API_URL}?key=${GOOGLE_CLOUD_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        throw new Error('Vision API error');
      }

      const data = await response.json();
      const result = data.responses[0];
      
      if (!result.safeSearchAnnotation) {
        throw new Error('No safe search results');
      }

      const safeSearch = result.safeSearchAnnotation;
      const labels = result.labelAnnotations || [];

      // Define likelihood levels
      const likelihoodLevels = {
        'UNKNOWN': 0,
        'VERY_UNLIKELY': 1,
        'UNLIKELY': 2,
        'POSSIBLE': 3,
        'LIKELY': 4,
        'VERY_LIKELY': 5
      };

      // Check for inappropriate content
      let action = 'approved';
      let shouldReject = false;

      // Auto-reject thresholds
      const rejectConditions = [
        likelihoodLevels[safeSearch.adult] >= 4,
        likelihoodLevels[safeSearch.violence] >= 4,
        likelihoodLevels[safeSearch.racy] >= 5,
        likelihoodLevels[safeSearch.medical] >= 4,
        likelihoodLevels[safeSearch.spoof] >= 5
      ];

      if (rejectConditions.some(condition => condition)) {
        shouldReject = true;
        action = 'rejected';
      } else if (
        likelihoodLevels[safeSearch.adult] >= 3 ||
        likelihoodLevels[safeSearch.violence] >= 3 ||
        likelihoodLevels[safeSearch.racy] >= 3
      ) {
        action = 'manual_review';
      }

      // Check labels for additional context
      const problematicLabels = [
        'weapon', 'gun', 'knife', 'drug', 'alcohol', 'tobacco',
        'gambling', 'adult content', 'explicit'
      ];

      const hasProblematicLabel = labels.some(label => 
        problematicLabels.some(problem => 
          label.description.toLowerCase().includes(problem)
        )
      );

      if (hasProblematicLabel && action === 'approved') {
        action = 'manual_review';
      }

      // Log moderation result
      await moderationService.logModeration(
        'image',
        contentId,
        contentTable,
        { safeSearch, labels },
        action
      );

      // Update content status
      await moderationService.updateModerationStatus(
        contentTable,
        contentId,
        action
      );

      return {
        approved: action === 'approved',
        action,
        safeSearch,
        labels: labels.map(l => l.description)
      };
    } catch (error) {
      console.error('Image moderation error:', error);
      // Default to manual review on error
      await moderationService.updateModerationStatus(
        contentTable,
        contentId,
        'manual_review'
      );
      return {
        approved: false,
        action: 'manual_review',
        error: error.message
      };
    }
  },

  // Moderate event data (text + images)
  async moderateEvent(eventId, eventData, images = []) {
    const results = {
      text: null,
      images: [],
      overallApproved: true
    };

    // Moderate text content
    const textToModerate = `${eventData.title} ${eventData.description}`;
    results.text = await this.moderateText(textToModerate, eventId, 'events');
    
    if (results.text.action === 'rejected') {
      results.overallApproved = false;
    }

    // Moderate images
    for (const image of images) {
      const imageResult = await this.moderateImage(
        image.url,
        image.id,
        'event_images'
      );
      results.images.push(imageResult);
      
      if (imageResult.action === 'rejected') {
        results.overallApproved = false;
      }
    }

    return results;
  },

  // Moderate personal listing
  async moderatePersonalListing(listingId, listingData, images = []) {
    const results = {
      text: null,
      images: [],
      overallApproved: true
    };

    // Moderate text content
    const textToModerate = `${listingData.title} ${listingData.description}`;
    results.text = await this.moderateText(
      textToModerate,
      listingId,
      'personal_listings'
    );
    
    if (results.text.action === 'rejected') {
      results.overallApproved = false;
    }

    // Moderate images if any
    for (const imageUrl of images) {
      const imageResult = await this.moderateImage(
        imageUrl,
        listingId,
        'personal_listings'
      );
      results.images.push(imageResult);
      
      if (imageResult.action === 'rejected') {
        results.overallApproved = false;
      }
    }

    return results;
  },

  // Moderate chat messages for business AI agents
  async moderateChat(message) {
    try {
      const response = await fetch('https://api.openai.com/v1/moderations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          input: message
        })
      });

      if (!response.ok) {
        throw new Error('Moderation API error');
      }

      const data = await response.json();
      const result = data.results[0];

      return {
        approved: !result.flagged,
        categories: result.categories,
        scores: result.category_scores
      };
    } catch (error) {
      console.error('Chat moderation error:', error);
      return {
        approved: true, // Allow chat to continue on error
        error: error.message
      };
    }
  },

  // Batch moderation for multiple items
  async batchModerate(items, type = 'text') {
    const results = await Promise.allSettled(
      items.map(item => {
        if (type === 'text') {
          return this.moderateText(item.content, item.id, item.table);
        } else {
          return this.moderateImage(item.url, item.id, item.table);
        }
      })
    );

    return results.map((result, index) => ({
      id: items[index].id,
      status: result.status,
      value: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason : null
    }));
  },

  // Helper function to check if content needs moderation
  needsModeration(content, lastModerated = null) {
    // Always moderate new content
    if (!lastModerated) return true;

    // Re-moderate if content was updated after last moderation
    const contentDate = new Date(content.updated_at);
    const moderationDate = new Date(lastModerated);
    
    return contentDate > moderationDate;
  }
};

// Export utility functions
export const moderationUtils = {
  // Format moderation status for display
  formatStatus(status) {
    const statusMap = {
      'pending': { label: 'Pending Review', color: 'yellow' },
      'approved': { label: 'Approved', color: 'green' },
      'rejected': { label: 'Rejected', color: 'red' },
      'manual_review': { label: 'Under Review', color: 'orange' }
    };

    return statusMap[status] || { label: 'Unknown', color: 'gray' };
  },

  // Get human-readable category names
  formatCategory(category) {
    const categoryMap = {
      'sexual': 'Sexual Content',
      'sexual/minors': 'Sexual Content Involving Minors',
      'hate': 'Hate Speech',
      'hate/threatening': 'Threatening Hate Speech',
      'self-harm': 'Self-Harm',
      'self-harm/intent': 'Self-Harm Intent',
      'self-harm/instructions': 'Self-Harm Instructions',
      'violence': 'Violence',
      'violence/graphic': 'Graphic Violence'
    };

    return categoryMap[category] || category;
  },

  // Check if content can be displayed
  canDisplay(moderationStatus) {
    return moderationStatus === 'approved';
  },

  // Get moderation badge component props
  getModerationBadge(status) {
    const { label, color } = this.formatStatus(status);
    
    return {
      label,
      color,
      icon: status === 'approved' ? 'CheckIcon' : 
            status === 'rejected' ? 'XMarkIcon' : 
            'ClockIcon'
    };
  }
};