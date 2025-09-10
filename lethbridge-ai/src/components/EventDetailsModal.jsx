import React from 'react';
import { 
  XMarkIcon,
  CalendarIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ClockIcon,
  LinkIcon,
  ShareIcon,
  HeartIcon,
  TicketIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { format, parseISO, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';

function EventDetailsModal({ event, onClose, onSave, isSaved = false }) {
  if (!event) return null;

  const handleShare = async () => {
    const shareData = {
      title: event.title,
      text: `Check out ${event.title} in Lethbridge!`,
      url: window.location.href
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback to copying link
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleSave = () => {
    onSave(event.id);
    toast.success(isSaved ? 'Event removed from saved' : 'Event saved!');
  };

  const formatDate = (dateString) => {
    const date = parseISO(dateString);
    const daysUntil = differenceInDays(date, new Date());
    
    if (daysUntil === 0) return 'Today';
    if (daysUntil === 1) return 'Tomorrow';
    if (daysUntil > 0 && daysUntil < 7) return format(date, 'EEEE');
    
    return format(date, 'MMM d, yyyy');
  };

  const formatTime = (dateString) => {
    return format(parseISO(dateString), 'h:mm a');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header Image */}
        {event.image_url && (
          <div className="relative h-64 bg-gray-200">
            <img
              src={event.image_url}
              alt={event.title}
              className="w-full h-full object-cover"
            />
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {/* Header without image */}
          {!event.image_url && (
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-900 flex-1">{event.title}</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg ml-4"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Title (when there's an image) */}
          {event.image_url && (
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{event.title}</h2>
          )}

          {/* Category Badge */}
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              {event.category}
            </span>
            {event.is_featured && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                Featured Event
              </span>
            )}
          </div>

          {/* Key Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Date & Time */}
            <div className="flex items-start space-x-3">
              <CalendarIcon className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">
                  {formatDate(event.start_date)}
                  {event.end_date && ` - ${formatDate(event.end_date)}`}
                </p>
                <p className="text-sm text-gray-600">
                  {formatTime(event.start_date)}
                  {event.end_date && ` - ${formatTime(event.end_date)}`}
                </p>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-start space-x-3">
              <MapPinIcon className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">{event.location}</p>
                {event.address && (
                  <p className="text-sm text-gray-600">{event.address}</p>
                )}
              </div>
            </div>

            {/* Cost */}
            <div className="flex items-start space-x-3">
              <CurrencyDollarIcon className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">
                  {event.is_free ? 'Free Event' : `$${event.cost}`}
                </p>
              </div>
            </div>

            {/* Age Range */}
            {(event.age_min !== 0 || event.age_max !== 99) && (
              <div className="flex items-start space-x-3">
                <UserGroupIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">
                    Ages {event.age_min}-{event.age_max}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">About This Event</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{event.description}</p>
          </div>

          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {event.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Organizer Info */}
          {event.organizer_name && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Organized By</h3>
              <p className="text-gray-700">{event.organizer_name}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            {event.website_url && (
              <a
                href={event.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <LinkIcon className="w-5 h-5" />
                Visit Website
              </a>
            )}
            
            <button
              onClick={handleSave}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                isSaved
                  ? 'bg-pink-100 text-pink-700 hover:bg-pink-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {isSaved ? (
                <HeartIconSolid className="w-5 h-5" />
              ) : (
                <HeartIcon className="w-5 h-5" />
              )}
              {isSaved ? 'Saved' : 'Save Event'}
            </button>

            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ShareIcon className="w-5 h-5" />
              Share
            </button>
          </div>

          {/* View Count */}
          <div className="text-center mt-4 text-sm text-gray-500">
            {event.view_count || 0} people have viewed this event
          </div>
        </div>
      </div>
    </div>
  );
}

export default EventDetailsModal;