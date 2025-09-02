import React, { useState, useEffect, useRef } from 'react';
import { messageService, profileService } from '../services/supabase';
import { 
  XMarkIcon,
  PaperAirplaneIcon,
  ChatBubbleLeftRightIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

function MessagingModal({ user, listing, sellerId, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [sellerProfile, setSellerProfile] = useState(null);
  const messagesEndRef = useRef(null);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(null);

  useEffect(() => {
    initializeConversation();

    // Set up auto-refresh for new messages
    const interval = setInterval(() => {
      if (conversationId) {
        refreshMessages();
      }
    }, 5000); // Check for new messages every 5 seconds

    setAutoRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeConversation = async () => {
    try {
      // Get seller profile
      const profile = await profileService.getProfile(sellerId);
      setSellerProfile(profile);

      // Get or create conversation
      const convId = await messageService.getOrCreateConversation(
        listing.id,
        user.id,
        sellerId
      );
      setConversationId(convId);

      // Load messages
      await loadMessages(convId);

      // Mark messages as read
      await messageService.markMessagesRead(convId, user.id);
    } catch (error) {
      console.error('Error initializing conversation:', error);
      toast.error('Failed to load conversation');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (convId) => {
    try {
      const data = await messageService.getConversationMessages(convId);
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const refreshMessages = async () => {
    if (!conversationId) return;
    
    try {
      const data = await messageService.getConversationMessages(conversationId);
      if (data && data.length > messages.length) {
        setMessages(data);
        await messageService.markMessagesRead(conversationId, user.id);
      }
    } catch (error) {
      console.error('Error refreshing messages:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !conversationId) return;

    setSending(true);
    try {
      const message = await messageService.sendMessage(
        conversationId,
        user.id,
        sellerId,
        listing.id,
        newMessage.trim()
      );

      // Add message to local state immediately
      setMessages([...messages, {
        ...message,
        sender: { id: user.id, display_name: 'You' }
      }]);
      
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return formatDistanceToNow(date, { addSuffix: true });
    } else {
      return format(date, 'MMM d, h:mm a');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full">
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full h-[600px] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center">
            <ChatBubbleLeftRightIcon className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <h2 className="text-lg font-semibold">
                Message about: {listing.title}
              </h2>
              <p className="text-sm text-gray-600">
                with {sellerProfile?.display_name || 'Seller'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <ChatBubbleLeftRightIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No messages yet</p>
              <p className="text-sm text-gray-500 mt-2">
                Start the conversation by sending a message below
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => {
                const isOwn = message.sender_id === user.id;
                const showDate = index === 0 || 
                  format(new Date(messages[index - 1].created_at), 'yyyy-MM-dd') !== 
                  format(new Date(message.created_at), 'yyyy-MM-dd');

                return (
                  <React.Fragment key={message.id}>
                    {showDate && (
                      <div className="text-center my-4">
                        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                          {format(new Date(message.created_at), 'MMMM d, yyyy')}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex max-w-[70%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`flex-shrink-0 ${isOwn ? 'ml-2' : 'mr-2'}`}>
                          {message.sender?.avatar_url ? (
                            <img
                              src={message.sender.avatar_url}
                              alt={message.sender.display_name}
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <UserCircleIcon className="w-8 h-8 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <div className={`px-4 py-2 rounded-lg ${
                            isOwn 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-gray-100 text-gray-900'
                          }`}>
                            <p className="text-sm">{message.content}</p>
                          </div>
                          <p className={`text-xs text-gray-500 mt-1 ${
                            isOwn ? 'text-right' : 'text-left'
                          }`}>
                            {formatMessageTime(message.created_at)}
                            {isOwn && message.is_read && (
                              <span className="ml-2">✓✓</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="border-t p-4">
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              disabled={sending}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Conversations List Component
export function ConversationsList({ user, onSelectConversation }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState({});

  useEffect(() => {
    loadConversations();
    
    // Refresh conversations periodically
    const interval = setInterval(loadConversations, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const loadConversations = async () => {
    try {
      const data = await messageService.getUserConversations(user.id);
      setConversations(data || []);

      // Calculate unread counts
      const counts = {};
      data?.forEach(conv => {
        const lastRead = conv.participant_1_id === user.id 
          ? conv.participant_1_last_read 
          : conv.participant_2_last_read;
        
        const unreadMessages = conv.messages?.filter(msg => 
          msg.recipient_id === user.id && 
          (!lastRead || new Date(msg.created_at) > new Date(lastRead))
        );
        
        counts[conv.id] = unreadMessages?.length || 0;
      });
      setUnreadCounts(counts);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-8">
        <ChatBubbleLeftRightIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">No conversations yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {conversations.map(conv => {
        const otherParticipant = conv.participant_1_id === user.id 
          ? conv.participant_2 
          : conv.participant_1;
        const unreadCount = unreadCounts[conv.id] || 0;

        return (
          <button
            key={conv.id}
            onClick={() => onSelectConversation(conv)}
            className="w-full p-4 bg-white rounded-lg hover:bg-gray-50 transition-colors text-left border border-gray-200"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                {otherParticipant.avatar_url ? (
                  <img
                    src={otherParticipant.avatar_url}
                    alt={otherParticipant.display_name}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <UserCircleIcon className="w-10 h-10 text-gray-400" />
                )}
                <div>
                  <h4 className="font-medium text-gray-900">
                    {otherParticipant.display_name}
                  </h4>
                  <p className="text-sm text-gray-600">
                    Re: {conv.listing?.title || 'Listing'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
              {unreadCount > 0 && (
                <span className="bg-blue-600 text-white text-xs font-bold rounded-full px-2 py-1">
                  {unreadCount}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default MessagingModal;