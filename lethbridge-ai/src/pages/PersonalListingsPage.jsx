// src/pages/PersonalListingsPage.jsx
import React, { useState, useEffect } from 'react';
import { personalListingService, imageService } from '../services/supabase';
import ChatModal from '../components/ChatModal';
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
  PhoneIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

// Main listing types
const LISTING_TYPES = [
  { value: 'offer', label: 'Offering', icon: '🏷️' },
  { value: 'request', label: 'Looking For', icon: '🔍' },
  { value: 'event', label: 'Event/Activity', icon: '📅' }
];

// Categories
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
  { value: 'lost_found', label: 'Lost & Found', icon: '🔍' },
  { value: 'volunteer', label: 'Volunteer', icon: '🤲' },
  { value: 'other', label: 'Other', icon: '📌' }
];

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  return date.toLocaleDateString('en-US', options);
};

// Main Component
function PersonalListingsPage({ user, profile }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingListing, setEditingListing] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedListing, setSelectedListing] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [selectedDetailListing, setSelectedDetailListing] = useState(null);
  
  const isPublicView = window.location.pathname === '/community';

  useEffect(() => {
    loadListings();
  }, [user, isPublicView]);

  const loadListings = async () => {
    setLoading(true);
    try {
      if (isPublicView) {
        const data = await personalListingService.getListings();
        setListings(data || []);
      } else if (user) {
        const data = await personalListingService.getUserListings(user.id);
        setListings(data || []);
      } else {
        setListings([]);
      }
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
    const editData = {
      ...listing,
      contact_email: listing.contact_details?.email || '',
      contact_phone: listing.contact_details?.phone || '',
      contact_method: listing.contact_details?.preferred || listing.contact_method || 'in_app'
    };
    setEditingListing(editData);
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
      if (!editingListing) {
        const userListings = isPublicView 
          ? listings.filter(l => l.user_id === user.id)
          : listings;
          
        if (profile?.profile_type === 'personal' && userListings.length >= 5) {
          toast.error('Personal accounts are limited to 5 active listings');
          return;
        }
        if (profile?.profile_type === 'business' && userListings.length >= 20) {
          toast.error('Business accounts are limited to 20 active listings');
          return;
        }
      }

      const { contact_email, contact_phone, contact_method, ...cleanData } = listingData;
      
      const contact_details = {};
      if (contact_email) {
        contact_details.email = contact_email;
      }
      if (contact_phone) {
        contact_details.phone = contact_phone;
      }
      if (contact_method) {
        contact_details.preferred = contact_method;
      }

      const finalData = {
        ...cleanData,
        contact_method: contact_method || 'in_app',
        contact_details: Object.keys(contact_details).length > 0 ? contact_details : null,
        is_active: true
      };

      if (editingListing) {
        await personalListingService.updateListing(editingListing.id, finalData);
        toast.success('Listing updated successfully');
      } else {
        await personalListingService.createListing(finalData, user.id);
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

  const handleContactSeller = (listing) => {
    if (!user) {
      window.location.href = '/auth';
      return;
    }
    setSelectedListing(listing);
    setShowChat(true);
  };

  const handleListingClick = (listing) => {
    setSelectedDetailListing(listing);
    // Increment view count
    if (personalListingService.incrementViewCount) {
      personalListingService.incrementViewCount(listing.id).catch(console.error);
    }
  };

  const handleContactFromDetail = (listing) => {
    setSelectedDetailListing(null);
    handleContactSeller(listing);
  };

  const maxListings = profile?.profile_type === 'business' ? 20 : 5;
  const userListings = isPublicView 
    ? listings.filter(l => l.user_id === user?.id)
    : listings;
  const canCreateMore = userListings.length < maxListings;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isPublicView ? 'Community Listings' : 'My Listings'}
            </h1>
            <p className="mt-2 text-gray-600">
              {isPublicView 
                ? 'Browse community listings, garage sales, and local events'
                : 'Manage your personal listings and community posts'}
            </p>
          </div>
          
          {user && (
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
              title={!canCreateMore ? `Maximum ${maxListings} listings reached` : ''}
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Create Listing
            </button>
          )}
        </div>
        
        {user && (
          <p className="mt-2 text-sm text-gray-600">
            You have {userListings.length} of {maxListings} listings
            {profile?.profile_type === 'business' && ' (Business account)'}
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search listings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
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
          {user && listings.length === 0 && canCreateMore && (
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
              onClick={() => handleListingClick(listing)}
              onEdit={() => handleEdit(listing)}
              onDelete={() => handleDelete(listing.id)}
              onContact={() => handleContactSeller(listing)}
              isOwner={!isPublicView && user && listing.user_id === user.id}
              currentUserId={user?.id}
              isPublicView={isPublicView}
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

      {/* Detail Modal */}
      {selectedDetailListing && (
        <ListingDetailModal
          listing={selectedDetailListing}
          onClose={() => setSelectedDetailListing(null)}
          onContact={handleContactFromDetail}
          currentUserId={user?.id}
        />
      )}

      {/* Chat Modal */}
      {showChat && selectedListing && (
        <ChatModal
          user={user}
          profile={profile}
          otherUserId={selectedListing.user_id}
          otherUserName={selectedListing.profiles?.display_name || selectedListing.display_name || 'Community Member'}
          onClose={() => {
            setShowChat(false);
            setSelectedListing(null);
          }}
        />
      )}
    </div>
  );
}

// Listing Detail Modal Component - FIXED
// Listing Detail Modal Component - FIXED
function ListingDetailModal({ listing, onClose, onContact, currentUserId }) {
  if (!listing) return null;
  
  const categoryInfo = LISTING_CATEGORIES.find(cat => cat.value === listing.category);
  const typeInfo = LISTING_TYPES.find(type => type.value === listing.listing_type);
  const canContact = currentUserId !== listing.user_id;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="relative">
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{categoryInfo?.icon || '📌'}</span>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{listing.title}</h2>
                <span className={`inline-block mt-1 px-3 py-1 text-sm rounded-full ${
                  listing.listing_type === 'offer' ? 'bg-green-100 text-green-800' :
                  listing.listing_type === 'request' ? 'bg-blue-100 text-blue-800' :
                  'bg-purple-100 text-purple-800'
                }`}>
                  {typeInfo?.label}
                </span>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {listing.images?.length > 0 && (
            <div className="p-6 border-b">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {listing.images.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`${listing.title} ${index + 1}`}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                ))}
              </div>
            </div>
          )}

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{listing.description}</p>
                
                <div className="mt-6 space-y-3">
                  {listing.price !== null && listing.price !== undefined && (
                    <div className="flex items-center text-gray-700">
                      <CurrencyDollarIcon className="w-5 h-5 mr-3 text-gray-400" />
                      <span className="font-medium">
                        {listing.price_type === 'free' ? 'Free' :
                         listing.price_type === 'negotiable' ? `$${listing.price} (Negotiable)` :
                         `$${listing.price}`}
                      </span>
                    </div>
                  )}

                  {listing.location && (
                    <div className="flex items-center text-gray-700">
                      <MapPinIcon className="w-5 h-5 mr-3 text-gray-400" />
                      <span>{listing.location}</span>
                    </div>
                  )}

                  {listing.start_date && (
                    <div className="flex items-center text-gray-700">
                      <CalendarIcon className="w-5 h-5 mr-3 text-gray-400" />
                      <span>
                        {formatDate(listing.start_date)}
                        {listing.end_date && ` - ${formatDate(listing.end_date)}`}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center text-gray-500">
                    <EyeIcon className="w-5 h-5 mr-3 text-gray-400" />
                    <span>{listing.view_count || 0} views</span>
                  </div>
                </div>
              </div>

              <div className="md:border-l md:pl-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact Seller</h3>
                
                {canContact ? (
                  <div className="space-y-3">
                    <button
                      onClick={() => onContact(listing)}
                      className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <ChatBubbleLeftIcon className="w-5 h-5 mr-2" />
                      Send Message
                    </button>

                    {listing.contact_details && (
                      <div className="pt-3 border-t">
                        <p className="text-sm text-gray-600 mb-3">Other contact methods:</p>
                        
                        {listing.contact_details.email && (
                          
                          <a  href={`mailto:${listing.contact_details.email}`}
                            className="flex items-center text-gray-700 hover:text-blue-600 mb-2"
                          >
                            <EnvelopeIcon className="w-5 h-5 mr-2 text-gray-400" />
                            <span className="text-sm">{listing.contact_details.email}</span>
                          </a>
                        )}
                        
                        {listing.contact_details.phone && (
                          
                           <a href={`tel:${listing.contact_details.phone}`}
                            className="flex items-center text-gray-700 hover:text-blue-600"
                          >
                            <PhoneIcon className="w-5 h-5 mr-2 text-gray-400" />
                            <span className="text-sm">{listing.contact_details.phone}</span>
                          </a>
                        )}
                      </div>
                    )}

                    <div className="pt-3 border-t">
                      <p className="text-sm text-gray-600 mb-1">Posted by:</p>
                      <p className="font-medium text-gray-900">
                        {listing.profiles?.display_name || listing.display_name || 'Community Member'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">This is your listing</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Listing Card Component
function ListingCard({ listing, onClick, onEdit, onDelete, onContact, isOwner, currentUserId, isPublicView }) {
  const categoryInfo = LISTING_CATEGORIES.find(cat => cat.value === listing.category);
  const typeInfo = LISTING_TYPES.find(type => type.value === listing.listing_type);
  const canContact = currentUserId !== listing.user_id;
  
  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
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

        {listing.price !== null && listing.price !== undefined && (
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
          
          <div className="flex gap-2">
            {isOwner && !isPublicView && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Listing Modal Component
function ListingModal({ listing, onSave, onClose }) {
  const [enhancing, setEnhancing] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [formData, setFormData] = useState({
    title: listing?.title || '',
    description: listing?.description || '',
    category: listing?.category || 'other',
    listing_type: listing?.listing_type || 'offer',
    price: listing?.price || 0,
    price_type: listing?.price_type || 'fixed',
    location: listing?.location || '',
    contact_method: listing?.contact_method || 'in_app',
    contact_email: listing?.contact_email || '',
    contact_phone: listing?.contact_phone || '',
    start_date: listing?.start_date || '',
    end_date: listing?.end_date || '',
    images: listing?.images || []
  });

  const handleEnhanceDescription = async () => {
    if (!formData.description || formData.description.trim().length < 10) {
      toast.error('Please write at least a brief description first (10+ characters)');
      return;
    }

    setEnhancing(true);
    try {
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

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (formData.images.length + files.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    setUploadingImages(true);
    try {
      const uploadPromises = files.map(file => imageService.uploadImage(file, 'community-images'));
      const urls = await Promise.all(uploadPromises);
      setFormData({ ...formData, images: [...formData.images, ...urls] });
      toast.success('Images uploaded!');
    } catch (error) {
      toast.error('Failed to upload images');
      console.error('Upload error:', error);
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index) => {
    const newImages = [...formData.images];
    newImages.splice(index, 1);
    setFormData({ ...formData, images: newImages });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description) {
      toast.error('Please provide a title and description');
      return;
    }

    onSave({
      ...formData,
      price: formData.price_type === 'free' ? 0 : parseFloat(formData.price) || 0,
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

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What would you like to do?
              </label>
              <div className="grid grid-cols-3 gap-3">
                {LISTING_TYPES.map(type => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, listing_type: type.value })}
                    className={`p-3 border rounded-lg text-center transition ${
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
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

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Description *
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Photos (up to 5)
              </label>
              <div className="flex flex-wrap gap-2">
                {formData.images.map((url, index) => (
                  <div key={index} className="relative w-24 h-24">
                    <img src={url} alt="" className="w-full h-full object-cover rounded-lg" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                
                {formData.images.length < 5 && (
                  <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-500 transition">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploadingImages}
                    />
                    {uploadingImages ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    ) : (
                      <PhotoIcon className="w-8 h-8 text-gray-400" />
                    )}
                  </label>
                )}
              </div>
            </div>

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
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                )}
              </div>
            </div>

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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Information (Optional)
              </label>
              
              <div className="mb-3">
                <label className="block text-xs text-gray-600 mb-1">
                  Preferred Contact Method
                </label>
                <select
                  value={formData.contact_method}
                  onChange={(e) => setFormData({ ...formData, contact_method: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="in_app">In-App Messages</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                </select>
              </div>

              <div className="mb-3">
                <label className="block text-xs text-gray-600 mb-1">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={formData.contact_email || ''}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="mb-3">
                <label className="block text-xs text-gray-600 mb-1">
                  Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={formData.contact_phone || ''}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  placeholder="(403) 555-0123"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              
              <p className="text-xs text-gray-500 mt-2">
                Fill in any contact methods you're comfortable sharing. The preferred method will be highlighted to interested users.
              </p>
            </div>

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

            <div className="flex justify-end gap-3 pt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {listing ? 'Update Listing' : 'Create Listing'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default PersonalListingsPage;