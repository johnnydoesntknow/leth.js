import React, { useState, useEffect } from 'react';
import { personalListingService, imageService } from '../services/supabase';
import toast from 'react-hot-toast';
import { aiService } from '../services/openai';
import { 
  HomeIcon, 
  TagIcon, 
  CalendarIcon,
  MapPinIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PhotoIcon,
  XMarkIcon,
  EyeIcon,
  SparklesIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftIcon,
  EnvelopeIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';

// Main listing types that match database constraint
const LISTING_TYPES = [
  { value: 'offer', label: 'Offering', icon: '🏷️' },
  { value: 'request', label: 'Looking For', icon: '🔍' },
  { value: 'event', label: 'Event/Activity', icon: '📅' }
];

// Categories for different types of listings
const LISTING_CATEGORIES = [
  { value: 'garage_sale', label: 'Garage Sale', icon: '🏠' },
  { value: 'estate_sale', label: 'Estate Sale', icon: '🏡' },
  { value: 'moving_sale', label: 'Moving Sale', icon: '📦' },
  { value: 'community_event', label: 'Community Event', icon: '👥' },
  { value: 'meetup', label: 'Meetup', icon: '🤝' },
  { value: 'study_group', label: 'Study Group', icon: '📚' },
  { value: 'book_club', label: 'Book Club', icon: '📖' },
  { value: 'sports_team', label: 'Sports Team', icon: '⚽' },
  { value: 'hobby_group', label: 'Hobby Group', icon: '🎨' },
  { value: 'other', label: 'Other', icon: '📌' }
];

const CONTACT_METHODS = [
  { value: 'in_app', label: 'In-App Message', icon: ChatBubbleLeftIcon },
  { value: 'email', label: 'Email', icon: EnvelopeIcon },
  { value: 'phone', label: 'Phone', icon: PhoneIcon }
];

// Simple date formatter
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  return date.toLocaleDateString('en-US', options);
};

function PersonalListingsPage({ user, profile }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingListing, setEditingListing] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');

  useEffect(() => {
    if (user) {
      loadListings();
    }
  }, [user]);

  const loadListings = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Use the correct method name from your supabase service
      const data = await personalListingService.getUserListings(user.id);
      setListings(data || []);
    } catch (error) {
      console.error('Error loading listings:', error);
      toast.error('Failed to load listings');
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredListings = listings.filter(listing => {
    if (filter !== 'all' && listing.category !== filter) return false;
    if (searchTerm && !listing.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !listing.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const handleEdit = (listing) => {
    setEditingListing(listing);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return;
    
    try {
      await personalListingService.deleteListing(id, user.id);
      toast.success('Listing deleted successfully');
      loadListings();
    } catch (error) {
      console.error('Error deleting listing:', error);
      toast.error('Failed to delete listing');
    }
  };

  const handleCreateOrUpdate = async (listingData) => {
    try {
      if (editingListing) {
        await personalListingService.updateListing(editingListing.id, listingData);
        toast.success('Listing updated successfully');
      } else {
        // Simple check for personal accounts - max 5 listings
        if (profile?.profile_type === 'personal' && listings.length >= 5) {
          toast.error('Personal accounts are limited to 5 active listings');
          return;
        }
        // Business accounts get 20 listings
        if (profile?.profile_type === 'business' && listings.length >= 20) {
          toast.error('Business accounts are limited to 20 active listings');
          return;
        }
        
        await personalListingService.createListing(listingData, user.id);
        toast.success('Listing created successfully');
      }
      setShowModal(false);
      setEditingListing(null);
      loadListings();
    } catch (error) {
      console.error('Error saving listing:', error);
      toast.error(error.message || 'Failed to save listing');
    }
  };

  // Calculate listing limits based on profile type
  const maxListings = profile?.profile_type === 'business' ? 20 : 5;
  const canCreateMore = listings.length < maxListings;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Community Listings</h1>
            <p className="mt-2 text-gray-600">
              Create and manage your personal listings, garage sales, and community events
            </p>
          </div>
          <button
            onClick={() => {
              setEditingListing(null);
              setShowModal(true);
            }}
            disabled={!canCreateMore}
            className={`flex items-center px-4 py-2 rounded-lg ${
              !canCreateMore
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Create Listing
          </button>
        </div>
        {profile && (
          <p className="mt-2 text-sm text-gray-600">
            {listings.length} of {maxListings} listings used
            {profile.profile_type === 'business' && ' (Business account)'}
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search listings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option value="all">All Categories</option>
          {LISTING_CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>
              {cat.icon} {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Listings Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="text-center py-12">
          <HomeIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No listings found</p>
          {listings.length === 0 && canCreateMore && (
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 text-blue-600 hover:text-blue-700"
            >
              Create your first listing
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredListings.map(listing => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onEdit={() => handleEdit(listing)}
              onDelete={() => handleDelete(listing.id)}
              isOwner={true}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <ListingModal
          listing={editingListing}
          onSave={handleCreateOrUpdate}
          onClose={() => {
            setShowModal(false);
            setEditingListing(null);
          }}
        />
      )}
    </div>
  );
}

// Listing Card Component
function ListingCard({ listing, onEdit, onDelete, isOwner }) {
  const categoryInfo = LISTING_CATEGORIES.find(cat => cat.value === listing.category);
  const typeInfo = LISTING_TYPES.find(type => type.value === listing.listing_type);
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      {listing.images?.length > 0 && (
        <img
          src={listing.images[0]}
          alt={listing.title}
          className="w-full h-48 object-cover rounded-t-lg"
        />
      )}
      
      <div className="p-6">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{categoryInfo?.icon || '📌'}</span>
            <span className="text-sm text-gray-600">{categoryInfo?.label || listing.category}</span>
          </div>
          <span className={`px-2 py-1 text-xs rounded-full ${
            listing.listing_type === 'offer' ? 'bg-green-100 text-green-800' :
            listing.listing_type === 'request' ? 'bg-blue-100 text-blue-800' :
            'bg-purple-100 text-purple-800'
          }`}>
            {typeInfo?.label}
          </span>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2">{listing.title}</h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{listing.description}</p>

        {listing.price !== null && (
          <div className="flex items-center text-gray-700 mb-2">
            <CurrencyDollarIcon className="w-4 h-4 mr-1" />
            <span className="font-medium">
              {listing.price_type === 'free' ? 'Free' :
               listing.price_type === 'negotiable' ? `$${listing.price} (Negotiable)` :
               `$${listing.price}`}
            </span>
          </div>
        )}

        {listing.location && (
          <div className="flex items-center text-gray-600 text-sm mb-2">
            <MapPinIcon className="w-4 h-4 mr-1" />
            <span>{listing.location}</span>
          </div>
        )}

        {listing.start_date && (
          <div className="flex items-center text-gray-600 text-sm mb-4">
            <CalendarIcon className="w-4 h-4 mr-1" />
            <span>{formatDate(listing.start_date)}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center text-gray-500 text-sm">
            <EyeIcon className="w-4 h-4 mr-1" />
            <span>{listing.view_count || 0} views</span>
          </div>
          
          {isOwner && (
            <div className="flex gap-2">
              <button
                onClick={onEdit}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
              <button
                onClick={onDelete}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Listing Modal Component
function ListingModal({ listing, onSave, onClose }) {
  const [enhancing, setEnhancing] = useState(false); // ADD THIS STATE
  const [formData, setFormData] = useState({
    title: listing?.title || '',
    description: listing?.description || '',
    category: listing?.category || 'other',
    listing_type: listing?.listing_type || 'offer',
    price: listing?.price || null,
    price_type: listing?.price_type || 'fixed',
    location: listing?.location || '',
    contact_method: listing?.contact_method || 'in_app',
    contact_details: listing?.contact_details || {},
    start_date: listing?.start_date || '',
    end_date: listing?.end_date || '',
    images: listing?.images || []
  });

  // ADD THIS NEW FUNCTION
  const handleEnhanceDescription = async () => {
    if (!formData.description || formData.description.trim().length < 10) {
      toast.error('Please write at least a brief description first (10+ characters)');
      return;
    }

    setEnhancing(true);
    try {
      // Use 'listing' type for personal listings
      const enhancedText = await aiService.enhanceDescription(formData.description, 'listing');
      setFormData({ ...formData, description: enhancedText });
      toast.success('Description enhanced with AI!');
    } catch (error) {
      console.error('Enhancement error:', error);
      toast.error(error.message || 'Failed to enhance description');
    } finally {
      setEnhancing(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description) {
      toast.error('Please provide a title and description');
      return;
    }

    // Format contact details based on method
    const contactDetails = {};
    if (formData.contact_method === 'email' && formData.contact_email) {
      contactDetails.email = formData.contact_email;
    }
    if (formData.contact_method === 'phone' && formData.contact_phone) {
      contactDetails.phone = formData.contact_phone;
    }

    onSave({
      ...formData,
      contact_details: contactDetails,
      is_active: true
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {listing ? 'Edit Listing' : 'Create New Listing'}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Listing Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Listing Type
              </label>
              <div className="grid grid-cols-3 gap-3">
                {LISTING_TYPES.map(type => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, listing_type: type.value })}
                    className={`p-3 border rounded-lg text-center ${
                      formData.listing_type === type.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-2xl">{type.icon}</span>
                    <p className="text-sm mt-1">{type.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="Give your listing a clear title"
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {LISTING_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description with AI Enhancement - THIS IS THE UPDATED SECTION */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <button
                  type="button"
                  onClick={handleEnhanceDescription}
                  disabled={enhancing || !formData.description || formData.description.trim().length < 10}
                  className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                    enhancing || !formData.description || formData.description.trim().length < 10
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-sm'
                  }`}
                >
                  <SparklesIcon className="w-4 h-4" />
                  {enhancing ? 'Enhancing...' : 'Enhance with AI'}
                </button>
              </div>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="Describe your listing in detail"
                required
              />
              {formData.description && formData.description.length > 0 && formData.description.length < 10 && (
                <p className="mt-1 text-xs text-amber-600">
                  ✨ Add a bit more detail (10+ characters) to enable AI enhancement
                </p>
              )}
              {enhancing && (
                <div className="mt-2 flex items-center gap-2 text-sm text-purple-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-600 border-t-transparent"></div>
                  AI is crafting the perfect description...
                </div>
              )}
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price
              </label>
              <div className="flex gap-3">
                <select
                  value={formData.price_type}
                  onChange={(e) => setFormData({ ...formData, price_type: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="fixed">Fixed Price</option>
                  <option value="negotiable">Negotiable</option>
                  <option value="free">Free</option>
                </select>
                {formData.price_type !== 'free' && (
                  <input
                    type="number"
                    value={formData.price || ''}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || null })}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                )}
              </div>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="Neighborhood or general area"
              />
            </div>

            {/* Contact Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Method
              </label>
              <div className="space-y-3">
                {CONTACT_METHODS.map(method => (
                  <label key={method.value} className="flex items-center">
                    <input
                      type="radio"
                      value={method.value}
                      checked={formData.contact_method === method.value}
                      onChange={(e) => setFormData({ ...formData, contact_method: e.target.value })}
                      className="mr-3"
                    />
                    <method.icon className="w-5 h-5 mr-2 text-gray-600" />
                    <span>{method.label}</span>
                  </label>
                ))}
              </div>

              {formData.contact_method === 'email' && (
                <input
                  type="email"
                  value={formData.contact_email || ''}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  placeholder="your@email.com"
                  className="mt-3 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              )}

              {formData.contact_method === 'phone' && (
                <input
                  type="tel"
                  value={formData.contact_phone || ''}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  placeholder="(403) 555-0123"
                  className="mt-3 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              )}
            </div>

            {/* Dates (for events) */}
            {formData.listing_type === 'event' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {listing ? 'Update Listing' : 'Create Listing'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PersonalListingsPage;