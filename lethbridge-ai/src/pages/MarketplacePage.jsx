// src/pages/MarketplacePage.jsx
import React, { useState, useEffect } from 'react';
import { marketplaceService, imageService } from '../services/supabase';
import { aiService } from '../services/openai';
import ChatModal from '../components/ChatModal';
import toast from 'react-hot-toast';
import { 
  ShoppingBagIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CurrencyDollarIcon,
  MapPinIcon,
  ClockIcon,
  PhotoIcon,
  XMarkIcon,
  SparklesIcon,
  TagIcon,
  TruckIcon,
  ChatBubbleLeftIcon
} from '@heroicons/react/24/outline';

const CONDITION_OPTIONS = ['New', 'Like New', 'Good', 'Fair', 'For Parts/Repair'];

const CATEGORIES = [
  { value: 'electronics', label: 'Electronics', icon: '💻' },
  { value: 'furniture', label: 'Furniture', icon: '🪑' },
  { value: 'clothing', label: 'Clothing', icon: '👕' },
  { value: 'vehicles', label: 'Vehicles', icon: '🚗' },
  { value: 'sports', label: 'Sports & Outdoors', icon: '⚽' },
  { value: 'home', label: 'Home & Garden', icon: '🏡' },
  { value: 'toys', label: 'Toys & Games', icon: '🎮' },
  { value: 'books', label: 'Books & Media', icon: '📚' },
  { value: 'tools', label: 'Tools', icon: '🔧' },
  { value: 'baby', label: 'Baby & Kids', icon: '👶' },
  { value: 'free', label: 'Free Stuff', icon: '🎁' },
  { value: 'other', label: 'Other', icon: '📦' }
];

const DELIVERY_OPTIONS = [
  { value: 'pickup', label: 'Pickup Only', icon: '🤝' },
  { value: 'delivery', label: 'Delivery Available', icon: '🚚' },
  { value: 'both', label: 'Pickup or Delivery', icon: '📦' }
];

function MarketplacePage({ user, profile }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [selectedListing, setSelectedListing] = useState(null);

  useEffect(() => {
    loadListings();
  }, [selectedCategory, searchQuery, priceRange]);

  const loadListings = async () => {
    setLoading(true);
    try {
      const filters = {
        category: selectedCategory !== 'all' ? selectedCategory : null,
        search: searchQuery,
        minPrice: priceRange.min || null,
        maxPrice: priceRange.max || null
      };
      
      const data = await marketplaceService.getListings(filters);
      setListings(data);
    } catch (error) {
      console.error('Error loading listings:', error);
      toast.error('Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Marketplace</h1>
          <p className="text-gray-600 mt-1">Buy, sell, and trade in Lethbridge</p>
        </div>
        {user && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Post Item
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search marketplace..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Price Range */}
          <div className="flex gap-2 items-center">
            <input
              type="number"
              placeholder="Min $"
              value={priceRange.min}
              onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-500">-</span>
            <input
              type="number"
              placeholder="Max $"
              value={priceRange.max}
              onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Items
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                selectedCategory === cat.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Listings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : listings.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <ShoppingBagIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No items found</p>
          </div>
        ) : (
          listings.map(listing => (
            <ListingCard 
              key={listing.id} 
              listing={listing} 
              onClick={() => setSelectedListing(listing)}
            />
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <CreateListingModal
          onClose={() => setShowCreateModal(false)}
          onSave={() => {
            loadListings();
            setShowCreateModal(false);
          }}
          user={user}
        />
      )}

      {/* Listing Details Modal */}
      {selectedListing && (
        <ListingDetailsModal
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
          user={user}
        />
      )}
    </div>
  );
}

// Listing Card Component
function ListingCard({ listing, onClick }) {
  const formatPrice = (price) => {
    if (!price || price === 0) return 'Free';
    return `$${price.toLocaleString()}`;
  };

  const getTimeAgo = (date) => {
    const hours = Math.floor((new Date() - new Date(date)) / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  };

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm hover:shadow-md transition cursor-pointer overflow-hidden"
    >
      {/* Image */}
      <div className="aspect-square bg-gray-100 relative">
        {listing.images && listing.images[0] ? (
          <img 
            src={listing.images[0]} 
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PhotoIcon className="w-12 h-12 text-gray-400" />
          </div>
        )}
        
        {/* Price Badge */}
        <div className="absolute top-2 left-2 bg-white rounded-lg px-2 py-1 shadow">
          <span className="font-bold text-lg">{formatPrice(listing.price)}</span>
        </div>

        {/* Condition Badge */}
        {listing.condition && (
          <div className="absolute top-2 right-2 bg-gray-900 bg-opacity-75 text-white text-xs rounded px-2 py-1">
            {listing.condition}
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 line-clamp-1">{listing.title}</h3>
        
        <div className="mt-2 flex items-center text-sm text-gray-500">
          <MapPinIcon className="w-4 h-4 mr-1" />
          <span className="line-clamp-1">{listing.location || 'Lethbridge'}</span>
        </div>

        <div className="mt-1 flex items-center text-sm text-gray-500">
          <ClockIcon className="w-4 h-4 mr-1" />
          <span>{getTimeAgo(listing.created_at)}</span>
        </div>

        {listing.delivery_option && (
          <div className="mt-2">
            <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
              {listing.delivery_option === 'delivery' ? '🚚 Delivery' : 
               listing.delivery_option === 'both' ? '📦 Flexible' : '🤝 Pickup'}
            </span>
          </div>
        )}
        {/* Add Listing Type (Buy/Sell/Trade) */}

      </div>
    </div>
  );
}

// Create Listing Modal
function CreateListingModal({ onClose, onSave, user }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: 'other',
    condition: 'Good',
    delivery_option: 'pickup',
    location: '',
    listing_type: 'sell',
    images: []
  });
  const [enhancing, setEnhancing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleEnhanceDescription = async () => {
    if (!formData.description || formData.description.length < 10) {
      toast.error('Please write at least a basic description first');
      return;
    }

    setEnhancing(true);
    try {
      const enhanced = await aiService.enhanceDescription(formData.description, 'marketplace');
      setFormData({ ...formData, description: enhanced });
      toast.success('Description enhanced!');
    } catch (error) {
      toast.error('Failed to enhance description');
    } finally {
      setEnhancing(false);
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = files.map(file => imageService.uploadImage(file, 'marketplace'));
      const urls = await Promise.all(uploadPromises);
      setFormData({ ...formData, images: [...formData.images, ...urls] });
      toast.success('Images uploaded!');
    } catch (error) {
      toast.error('Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.price) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      await marketplaceService.createListing({
        ...formData,
        price: parseFloat(formData.price) || 0,
        user_id: user.id
      });
      toast.success('Listing created!');
      onSave();
    } catch (error) {
      toast.error('Failed to create listing');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Post an Item</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
             {/* Listing Type - MOVED TO TOP */}
             <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Listing Type
  </label>
  <select
    value={formData.listing_type || 'sell'}
    onChange={(e) => setFormData({ ...formData, listing_type: e.target.value })}
    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
  >
    <option value="sell">For Sale</option>
    <option value="buy">Want to Buy</option>
    <option value="trade">Trade/Swap</option>
  </select>
</div>
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder={
  formData.listing_type === 'buy' ? "What are you looking for?" :
  formData.listing_type === 'trade' ? "What do you want to trade?" :
  "What are you selling?"
}
              />
            </div>

            {/* Price and Category */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="0.00"
                  />
                </div>
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
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Condition and Delivery */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Condition
                </label>
                <select
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {CONDITION_OPTIONS.map(condition => (
                    <option key={condition} value={condition}>{condition}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Options
                </label>
                <select
                  value={formData.delivery_option}
                  onChange={(e) => setFormData({ ...formData, delivery_option: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {DELIVERY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
           

            {/* Description with AI Enhancement */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <button
                  type="button"
                  onClick={handleEnhanceDescription}
                  disabled={enhancing || !formData.description || formData.description.length < 10}
                  className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                    enhancing || !formData.description || formData.description.length < 10
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
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
                placeholder="Describe your item..."
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pickup Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="e.g., North Lethbridge, West Side, Downtown"
              />
            </div>

            {/* Images */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Photos
              </label>
              <div className="flex flex-wrap gap-2">
                {formData.images.map((url, index) => (
                  <div key={index} className="relative w-24 h-24">
                    <img src={url} alt="" className="w-full h-full object-cover rounded-lg" />
                    <button
                      onClick={() => {
                        const newImages = [...formData.images];
                        newImages.splice(index, 1);
                        setFormData({ ...formData, images: newImages });
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                
                {formData.images.length < 5 && (
                  <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-500">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                    {uploading ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    ) : (
                      <PhotoIcon className="w-8 h-8 text-gray-400" />
                    )}
                  </label>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">Add up to 5 photos</p>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Post Item
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Listing Details Modal
function ListingDetailsModal({ listing, onClose, user }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showChat, setShowChat] = useState(false);
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="grid md:grid-cols-2 gap-6 p-6">
          {/* Images Section */}
          <div>
            {listing.images && listing.images.length > 0 ? (
              <div>
                <img 
                  src={listing.images[currentImageIndex]} 
                  alt={listing.title}
                  className="w-full h-96 object-cover rounded-lg"
                />
                {listing.images.length > 1 && (
                  <div className="flex gap-2 mt-2 overflow-x-auto">
                    {listing.images.map((img, index) => (
                      <img
                        key={index}
                        src={img}
                        alt=""
                        onClick={() => setCurrentImageIndex(index)}
                        className={`w-20 h-20 object-cover rounded cursor-pointer ${
                          index === currentImageIndex ? 'ring-2 ring-blue-500' : ''
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                <PhotoIcon className="w-16 h-16 text-gray-400" />
              </div>
            )}
          </div>

          {/* Details Section */}
          <div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{listing.title}</h2>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {listing.price === 0 ? 'Free' : `$${listing.price}`}
                </p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Condition and Category */}
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                  {listing.condition}
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                  {CATEGORIES.find(c => c.value === listing.category)?.label || listing.category}
                </span>
              </div>

              {/* Location and Delivery */}
              <div className="space-y-2">
                <div className="flex items-center text-gray-600">
                  <MapPinIcon className="w-5 h-5 mr-2" />
                  <span>{listing.location || 'Lethbridge'}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <TruckIcon className="w-5 h-5 mr-2" />
                  <span>
                    {listing.delivery_option === 'pickup' ? 'Pickup Only' :
                     listing.delivery_option === 'delivery' ? 'Delivery Available' :
                     'Pickup or Delivery'}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-600 whitespace-pre-wrap">{listing.description}</p>
              </div>

              {/* Seller Info */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-2">Seller</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      {listing.seller_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="ml-3">
                      <p className="font-medium">{listing.seller_name || 'User'}</p>
                      <p className="text-sm text-gray-500">Member since 2024</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Button */}
             {user && user.id !== listing.user_id && (
  <>
    <button 
      onClick={() => setShowChat(true)}
      className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
    >
      <ChatBubbleLeftIcon className="w-5 h-5 mr-2" />
      Contact Seller
    </button>
    
    {showChat && (
      <ChatModal
        user={user}
        otherUserId={listing.user_id}
        otherUserName={listing.seller_name || 'Seller'}
        onClose={() => setShowChat(false)}
      />
    )}
  </>
)}
             
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MarketplacePage;