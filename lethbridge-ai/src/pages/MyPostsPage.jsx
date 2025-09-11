// src/pages/MyPostsPage.jsx
import React, { useState, useEffect } from 'react';
import { marketplaceService, eventService, personalListingService } from '../services/supabase';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

function MyPostsPage({ user, profile }) {
  const [activeTab, setActiveTab] = useState('marketplace');
  const [marketplaceItems, setMarketplaceItems] = useState([]);
  const [events, setEvents] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [personalListings, setPersonalListings] = useState([]); 

  useEffect(() => {
    loadAllPosts();
  }, [user]);

  // In MyPostsPage.jsx, make sure the loadAllPosts function is correct:

const loadAllPosts = async () => {
  if (!user) return;
  
  setLoading(true);
  try {
    // Load all three types of posts
    const [marketplace, personal] = await Promise.all([
      marketplaceService.getUserListings(user.id),
      personalListingService.getUserListings(user.id)
    ]);
    
    setMarketplaceItems(marketplace || []);
    setPersonalListings(personal || []);
    
    // For events, you need to filter by organizer_id
    if (profile?.profile_type === 'business') {
      const allEvents = await eventService.getEvents();
      const userEvents = allEvents.filter(event => event.organizer_id === user.id);
      setEvents(userEvents);
    }
  } catch (error) {
    console.error('Error loading posts:', error);
    toast.error('Failed to load your posts');
  } finally {
    setLoading(false);
  }
};

  const handleDelete = async (id, type) => {
    if (!confirm('Are you sure you want to delete this?')) return;
    
    try {
      if (type === 'marketplace') {
        await marketplaceService.deleteListing(id);
      } else if (type === 'event') {
        await eventService.deleteEvent(id);
      } else if (type === 'listing') {
        await personalListingService.deleteListing(id, user.id);
      }
      
      toast.success('Deleted successfully');
      loadAllPosts();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Posts</h1>
      
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('marketplace')}
              className={`px-6 py-4 font-medium ${activeTab === 'marketplace' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
            >
              Marketplace ({marketplaceItems.length})
            </button>
            <button
              onClick={() => setActiveTab('listings')}
              className={`px-6 py-4 font-medium ${activeTab === 'listings' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
            >
              Community ({listings.length})
            </button>
            {profile?.profile_type === 'business' && (
              <button
                onClick={() => setActiveTab('events')}
                className={`px-6 py-4 font-medium ${activeTab === 'events' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
              >
                Events ({events.length})
              </button>
            )}
          </nav>
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : (
            <div className="space-y-4">
              {activeTab === 'marketplace' && marketplaceItems.map(item => (
                <div key={item.id} className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-gray-600">${item.price} • {item.condition}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleDelete(item.id, 'marketplace')} className="text-red-600 hover:bg-red-50 p-2 rounded">
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MyPostsPage;