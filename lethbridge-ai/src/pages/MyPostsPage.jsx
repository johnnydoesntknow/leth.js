// src/pages/MyPostsPage.jsx
import React, { useState, useEffect } from 'react';
import { marketplaceService, eventService, personalListingService, imageService } from '../services/supabase';
import { 
  PencilIcon, 
  TrashIcon, 
  PhotoIcon,
  CalendarIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  TagIcon,
  HomeIcon,
  ShoppingBagIcon,
  XMarkIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { aiService } from '../services/openai';

function MyPostsPage({ user, profile }) {
  const [activeTab, setActiveTab] = useState('all');
  const [marketplaceItems, setMarketplaceItems] = useState([]);
  const [events, setEvents] = useState([]);
  const [personalListings, setPersonalListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editType, setEditType] = useState(null); // 'event', 'listing', 'marketplace'

  useEffect(() => {
    if (user) {
      loadAllPosts();
    }
  }, [user]);

  const loadAllPosts = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Load all three types of posts
      const [marketplace, personal, allEvents] = await Promise.all([
        marketplaceService.getUserListings(user.id),
        personalListingService.getUserListings(user.id),
        eventService.getEvents()
      ]);
      
      // Filter events by user
      const userEvents = allEvents.filter(event => event.organizer_id === user.id);
      
      setMarketplaceItems(marketplace || []);
      setPersonalListings(personal || []);
      setEvents(userEvents || []);
      
    } catch (error) {
      console.error('Error loading posts:', error);
      toast.error('Failed to load your posts');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item, type) => {
    setEditingItem(item);
    setEditType(type);
    setShowEditModal(true);
  };

  const handleDelete = async (id, type) => {
    if (!confirm('Are you sure you want to delete this?')) return;
    
    try {
      if (type === 'marketplace') {
        await marketplaceService.deleteListing(id);
        toast.success('Marketplace item deleted');
      } else if (type === 'event') {
        await eventService.deleteEvent(id);
        toast.success('Event deleted');
      } else if (type === 'listing') {
        await personalListingService.deleteListing(id, user.id);
        toast.success('Community listing deleted');
      }
      
      loadAllPosts();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete');
    }
  };

  // Get filtered posts based on active tab
  const getFilteredPosts = () => {
    switch (activeTab) {
      case 'marketplace':
        return { items: marketplaceItems, type: 'marketplace' };
      case 'events':
        return { items: events, type: 'event' };
      case 'listings':
        return { items: personalListings, type: 'listing' };
      case 'all':
      default:
        return {
          items: [
            ...marketplaceItems.map(item => ({ ...item, postType: 'marketplace' })),
            ...events.map(item => ({ ...item, postType: 'event' })),
            ...personalListings.map(item => ({ ...item, postType: 'listing' }))
          ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
          type: 'mixed'
        };
    }
  };

  const filteredData = getFilteredPosts();
  const totalPosts = marketplaceItems.length + events.length + personalListings.length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Posts</h1>
      
      <div className="bg-white rounded-lg shadow">
        {/* Tabs */}
        <div className="border-b">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-6 py-4 font-medium ${
                activeTab === 'all' 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Posts ({totalPosts})
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`px-6 py-4 font-medium ${
                activeTab === 'events' 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Events ({events.length})
            </button>
            <button
              onClick={() => setActiveTab('listings')}
              className={`px-6 py-4 font-medium ${
                activeTab === 'listings' 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Community ({personalListings.length})
            </button>
            <button
              onClick={() => setActiveTab('marketplace')}
              className={`px-6 py-4 font-medium ${
                activeTab === 'marketplace' 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Marketplace ({marketplaceItems.length})
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : filteredData.items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No posts in this category</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredData.items.map((item) => {
                const type = item.postType || filteredData.type;
                return (
                  <PostCard
                    key={`${type}-${item.id}`}
                    item={item}
                    type={type}
                    onEdit={() => handleEdit(item, type)}
                    onDelete={() => handleDelete(item.id, type)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <EditModal
          item={editingItem}
          type={editType}
          user={user}
          onClose={() => {
            setShowEditModal(false);
            setEditingItem(null);
            setEditType(null);
          }}
          onSave={() => {
            setShowEditModal(false);
            setEditingItem(null);
            setEditType(null);
            loadAllPosts();
          }}
        />
      )}
    </div>
  );
}

// Post Card Component
function PostCard({ item, type, onEdit, onDelete }) {
  const getTypeIcon = () => {
    switch (type) {
      case 'event':
        return <CalendarIcon className="w-5 h-5" />;
      case 'listing':
        return <HomeIcon className="w-5 h-5" />;
      case 'marketplace':
        return <ShoppingBagIcon className="w-5 h-5" />;
      default:
        return <TagIcon className="w-5 h-5" />;
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'event':
        return 'Event';
      case 'listing':
        return item.listing_type === 'event' ? 'Community Event' : 'Community Listing';
      case 'marketplace':
        return 'For Sale';
      default:
        return 'Post';
    }
  };

  const formatDate = (date) => {
    if (!date) return 'No date';
    try {
      return format(parseISO(date), 'MMM d, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const formatPrice = (price) => {
    if (!price || price === 0) return 'Free';
    return `$${price.toLocaleString()}`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="aspect-video bg-gray-100 relative">
        {(item.image_url || item.images?.[0]) ? (
          <img 
            src={item.image_url || item.images[0]} 
            alt={item.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PhotoIcon className="w-12 h-12 text-gray-400" />
          </div>
        )}
        
        {/* Type Badge */}
        <div className="absolute top-2 left-2 bg-white rounded-lg px-2 py-1 shadow flex items-center gap-1">
          {getTypeIcon()}
          <span className="text-xs font-medium">{getTypeLabel()}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 line-clamp-1">{item.title}</h3>
        
        {/* Details based on type */}
        {type === 'event' && (
          <>
            <div className="mt-2 space-y-1 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <CalendarIcon className="w-4 h-4" />
                <span>{formatDate(item.start_date)}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPinIcon className="w-4 h-4" />
                <span className="line-clamp-1">{item.location}</span>
              </div>
              <div className="flex items-center gap-1">
                <CurrencyDollarIcon className="w-4 h-4" />
                <span>{item.is_free ? 'Free' : formatPrice(item.cost)}</span>
              </div>
            </div>
          </>
        )}

        {type === 'listing' && (
          <>
            <div className="mt-2 space-y-1 text-sm text-gray-600">
              {item.listing_type === 'event' && item.start_date && (
                <div className="flex items-center gap-1">
                  <CalendarIcon className="w-4 h-4" />
                  <span>{formatDate(item.start_date)}</span>
                </div>
              )}
              {item.location && (
                <div className="flex items-center gap-1">
                  <MapPinIcon className="w-4 h-4" />
                  <span className="line-clamp-1">{item.location}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <TagIcon className="w-4 h-4" />
                <span className="capitalize">{item.category || 'General'}</span>
              </div>
            </div>
          </>
        )}

        {type === 'marketplace' && (
          <>
            <div className="mt-2 space-y-1 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <CurrencyDollarIcon className="w-4 h-4" />
                <span className="font-bold">{formatPrice(item.price)}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPinIcon className="w-4 h-4" />
                <span className="line-clamp-1">{item.location || 'Lethbridge'}</span>
              </div>
              {item.condition && (
                <div className="flex items-center gap-1">
                  <TagIcon className="w-4 h-4" />
                  <span>{item.condition}</span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Actions */}
        <div className="mt-4 pt-4 border-t flex gap-2">
          <button
            onClick={onEdit}
            className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm flex items-center justify-center gap-1"
          >
            <PencilIcon className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={onDelete}
            className="flex-1 px-3 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-sm flex items-center justify-center gap-1"
          >
            <TrashIcon className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// Edit Modal Component
function EditModal({ item, type, user, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: item?.title || '',
    description: item?.description || '',
    category: item?.category || '',
    location: item?.location || '',
    price: item?.price || item?.cost || 0,
    is_free: item?.is_free || false,
    condition: item?.condition || 'Good',
    delivery_option: item?.delivery_option || 'pickup',
    listing_type: item?.listing_type || 'general',
    start_date: item?.start_date || '',
    end_date: item?.end_date || '',
    start_time: item?.start_time || '',
    contact_info: item?.contact_info || '',
    images: item?.images || [],
    image_url: item?.image_url || ''
  });

  const [uploading, setUploading] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [newImages, setNewImages] = useState([]);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = files.map(file => imageService.uploadImage(file));
      const uploadedUrls = await Promise.all(uploadPromises);
      
      if (type === 'event') {
        setFormData({ ...formData, image_url: uploadedUrls[0] });
      } else {
        setFormData({ ...formData, images: [...formData.images, ...uploadedUrls] });
      }
      
      setNewImages([...newImages, ...uploadedUrls]);
      toast.success('Images uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index) => {
    if (type === 'event') {
      setFormData({ ...formData, image_url: '' });
    } else {
      const updatedImages = formData.images.filter((_, i) => i !== index);
      setFormData({ ...formData, images: updatedImages });
    }
  };

  const handleEnhanceDescription = async () => {
    if (!formData.description || formData.description.length < 10) {
      toast.error('Please write at least a basic description first');
      return;
    }

    setEnhancing(true);
    try {
      const enhanced = await aiService.enhanceDescription(
        formData.description, 
        type === 'event' ? 'event' : type === 'marketplace' ? 'marketplace' : 'listing'
      );
      setFormData({ ...formData, description: enhanced });
      toast.success('Description enhanced!');
    } catch (error) {
      console.error('Enhancement error:', error);
      toast.error('Failed to enhance description');
    } finally {
      setEnhancing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (type === 'event') {
        await eventService.updateEvent(item.id, {
          ...formData,
          cost: formData.price,
          organizer_id: user.id
        });
        toast.success('Event updated successfully!');
      } else if (type === 'listing') {
        await personalListingService.updateListing(item.id, formData);
        toast.success('Listing updated successfully!');
      } else if (type === 'marketplace') {
  // Only send marketplace-relevant fields
  const { is_free, start_date, end_date, start_time, ...marketplaceData } = formData;
  await marketplaceService.updateListing(item.id, marketplaceData);
  toast.success('Marketplace item updated successfully!');
}
      
      onSave();
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update post');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            Edit {type === 'event' ? 'Event' : type === 'listing' ? 'Listing' : 'Marketplace Item'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              required
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleEnhanceDescription}
              disabled={enhancing}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <SparklesIcon className="w-4 h-4" />
              {enhancing ? 'Enhancing...' : 'Enhance with AI'}
            </button>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Lethbridge"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Event-specific fields */}
          {type === 'event' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_free}
                    onChange={(e) => setFormData({ ...formData, is_free: e.target.checked })}
                    className="mr-2"
                  />
                  Free Event
                </label>
                {!formData.is_free && (
                  <div className="flex-1">
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      placeholder="Ticket price"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Marketplace-specific fields */}
          {type === 'marketplace' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Condition
                  </label>
                  <select
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="New">New</option>
                    <option value="Like New">Like New</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Poor">Poor</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Option
                </label>
                <select
                  value={formData.delivery_option}
                  onChange={(e) => setFormData({ ...formData, delivery_option: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pickup">Pickup Only</option>
                  <option value="delivery">Delivery Only</option>
                  <option value="both">Pickup or Delivery</option>
                </select>
              </div>
            </>
          )}

          {/* Community Listing specific fields */}
          {type === 'listing' && (
            <>
              {formData.listing_type === 'event' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Event Date
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Info
                    </label>
                    <input
                      type="text"
                      value={formData.contact_info}
                      onChange={(e) => setFormData({ ...formData, contact_info: e.target.value })}
                      placeholder="Email or phone"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Images */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Images
            </label>
            
            {/* Display existing images */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {type === 'event' && formData.image_url && (
                <div className="relative">
                  <img src={formData.image_url} alt="Event" className="w-full h-24 object-cover rounded" />
                  <button
                    type="button"
                    onClick={() => removeImage(0)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              {type !== 'event' && formData.images.map((img, index) => (
                <div key={index} className="relative">
                  <img src={img} alt={`Item ${index + 1}`} className="w-full h-24 object-cover rounded" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Upload new images */}
            <label className="block cursor-pointer">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400">
                <PhotoIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <span className="text-sm text-gray-600">
                  {uploading ? 'Uploading...' : 'Click to add images'}
                </span>
              </div>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default MyPostsPage;