// src/components/ListingCard.jsx
import React from 'react';
import { 
  CalendarIcon,
  MapPinIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  HomeIcon,
  TagIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const LISTING_TYPE_ICONS = {
  garage_sale: '🏠',
  estate_sale: '🏡',
  moving_sale: '📦',
  community_event: '👥',
  meetup: '🤝',
  study_group: '📚',
  book_club: '📖',
  sports_team: '⚽',
  hobby_group: '🎨',
  other: '📌'
};

const LISTING_TYPE_LABELS = {
  garage_sale: 'Garage Sale',
  estate_sale: 'Estate Sale',
  moving_sale: 'Moving Sale',
  community_event: 'Community Event',
  meetup: 'Meetup',
  study_group: 'Study Group',
  book_club: 'Book Club',
  sports_team: 'Sports Team',
  hobby_group: 'Hobby Group',
  other: 'Other'
};

// Date formatting helper
const formatDate = (dateString) => {
  const date = new Date(dateString);
  const options = {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  };
  return date.toLocaleDateString('en-US', options);
};

function ListingCard({ listing, viewMode = 'grid', onEdit, onDelete, onView, isOwner = false }) {
  const listingIcon = LISTING_TYPE_ICONS[listing.listing_type] || '📌';
  const listingLabel = LISTING_TYPE_LABELS[listing.listing_type] || 'Other';

  // Status badge component
  const StatusBadge = () => {
    if (listing.moderation_status === 'pending') {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
          <ClockIcon className="w-3 h-3 mr-1" />
          Pending Review
        </span>
      );
    }
    if (!listing.is_active) {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
          Inactive
        </span>
      );
    }
    return null;
  };

  // List view
  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="text-3xl flex-shrink-0">{listingIcon}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 
                  className="font-semibold text-gray-900 hover:text-blue-600 cursor-pointer"
                  onClick={() => onView && onView(listing)}
                >
                  {listing.title}
                </h3>
                <StatusBadge />
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <CalendarIcon className="w-4 h-4" />
                  {formatDate(listing.start_date)}
                  {listing.end_date && ` - ${formatDate(listing.end_date)}`}
                </span>
                <span className="flex items-center gap-1">
                  <MapPinIcon className="w-4 h-4" />
                  {listing.location}
                </span>
                <span className="flex items-center gap-1">
                  <TagIcon className="w-4 h-4" />
                  {listingLabel}
                </span>
                <span className="flex items-center gap-1">
                  <EyeIcon className="w-4 h-4" />
                  {listing.view_count || 0} views
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                {listing.description}
              </p>
            </div>
          </div>

          {isOwner && (
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={() => onEdit && onEdit(listing)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Edit listing"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete && onDelete(listing.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete listing"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Grid view (default)
  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden">
      {/* Image or icon header */}
      {listing.images && listing.images.length > 0 ? (
        <div 
          className="w-full h-48 bg-cover bg-center cursor-pointer"
          style={{ backgroundImage: `url(${listing.images[0]})` }}
          onClick={() => onView && onView(listing)}
        />
      ) : (
        <div 
          className="w-full h-48 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center cursor-pointer"
          onClick={() => onView && onView(listing)}
        >
          <div className="text-center">
            <div className="text-5xl mb-2">{listingIcon}</div>
            <span className="text-sm text-gray-500">{listingLabel}</span>
          </div>
        </div>
      )}

      <div className="p-4">
        {/* Title and status */}
        <div className="flex items-start justify-between mb-2">
          <h3 
            className="font-semibold text-gray-900 hover:text-blue-600 cursor-pointer flex-1"
            onClick={() => onView && onView(listing)}
          >
            {listing.title}
          </h3>
          <StatusBadge />
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
          {listing.description}
        </p>

        {/* Details */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <CalendarIcon className="w-4 h-4 flex-shrink-0" />
            <span>
              {formatDate(listing.start_date)}
              {listing.end_date && ` - ${formatDate(listing.end_date)}`}
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <MapPinIcon className="w-4 h-4 flex-shrink-0" />
            <span className="line-clamp-1">{listing.location}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {listing.profiles ? (
                <>
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-white">
                      {listing.profiles.display_name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {listing.profiles.display_name}
                  </span>
                </>
              ) : (
                <span className="text-sm text-gray-500">Community Member</span>
              )}
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <EyeIcon className="w-4 h-4" />
              {listing.view_count || 0}
            </div>
          </div>
        </div>

        {/* Actions for owner */}
        {isOwner && (
          <div className="mt-3 pt-3 border-t flex justify-end gap-2">
            <button
              onClick={() => onEdit && onEdit(listing)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Edit listing"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete && onDelete(listing.id)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete listing"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ListingCard;