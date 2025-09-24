// src/pages/MessagesPage.jsx
import React, { useState, useEffect } from 'react';
import { chatService } from '../services/supabase';
import ChatModal from '../components/ChatModal';
import { ChatBubbleLeftIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

function MessagesPage({ user, profile }) {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  const loadConversations = async () => {
    try {
      const convos = await chatService.getConversations(user.id);
      setConversations(convos || []);
      
      // Mark all messages as read when opening messages page
      if (convos && convos.length > 0) {
        for (const conv of convos) {
          await chatService.markMessagesAsRead(conv.id, user.id);
        }
        // Dispatch event to update notification count
        window.dispatchEvent(new Event('messagesRead'));
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const getOtherParticipant = (conversation) => {
    // Check if it's participant1 or participant2 based on field naming in your DB
    if (conversation.participant1_id === user.id) {
      return {
        id: conversation.participant2_id,
        name: conversation.participant2?.display_name || 
               conversation.participant_2?.display_name || 
               conversation.participant2_name || 
               'User',
        avatar_url: conversation.participant2?.avatar_url || 
                   conversation.participant_2?.avatar_url
      };
    } else if (conversation.participant2_id === user.id) {
      return {
        id: conversation.participant1_id,
        name: conversation.participant1?.display_name || 
               conversation.participant_1?.display_name || 
               conversation.participant1_name || 
               'User',
        avatar_url: conversation.participant1?.avatar_url || 
                   conversation.participant_1?.avatar_url
      };
    } else if (conversation.participant_1_id === user.id) {
      // Handle snake_case field names
      return {
        id: conversation.participant_2_id,
        name: conversation.participant_2?.display_name || 
               conversation.participant2?.display_name || 
               conversation.participant_2_name || 
               'User',
        avatar_url: conversation.participant_2?.avatar_url
      };
    } else {
      // participant_2_id === user.id
      return {
        id: conversation.participant_1_id,
        name: conversation.participant_1?.display_name || 
               conversation.participant1?.display_name || 
               conversation.participant_1_name || 
               'User',
        avatar_url: conversation.participant_1?.avatar_url
      };
    }
  };

  const handleConversationSelect = async (conv) => {
    const otherUser = getOtherParticipant(conv);
    
    // Mark messages as read when selecting conversation
    await chatService.markMessagesAsRead(conv.id, user.id);
    
    // Dispatch event to update notification count
    window.dispatchEvent(new Event('messagesRead'));
    
    setSelectedConversation({ conv, otherUser });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Messages</h1>
      
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <ChatBubbleLeftIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p>No conversations yet</p>
            <p className="text-sm mt-2">Start a conversation by contacting a seller!</p>
          </div>
        ) : (
          <div className="divide-y">
            {conversations.map(conv => {
              const otherUser = getOtherParticipant(conv);
              const hasUnread = conv.messages?.some(msg => 
                msg.sender_id !== user.id && !msg.is_read
              );
              
              return (
                <div
                  key={conv.id}
                  onClick={() => handleConversationSelect(conv)}
                  className={`p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between ${
                    hasUnread ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      {otherUser.avatar_url ? (
                        <img
                          src={otherUser.avatar_url}
                          alt={otherUser.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold">
                          {(otherUser.name || 'U')[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className={`font-semibold ${hasUnread ? 'text-blue-600' : ''}`}>
                        {otherUser.name}
                      </p>
                      <p className="text-sm text-gray-600 line-clamp-1">
                        {conv.last_message || 'Start a conversation'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {conv.last_message_at && new Date(conv.last_message_at).toLocaleDateString()}
                    </p>
                    {hasUnread && (
                      <span className="inline-block mt-1 bg-blue-600 text-white text-xs font-bold rounded-full px-2 py-1">
                        New
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedConversation && (
        <ChatModal
          user={user}
          profile={profile}
          otherUserId={selectedConversation.otherUser.id}
          otherUserName={selectedConversation.otherUser.name}
          onClose={() => {
            setSelectedConversation(null);
            loadConversations(); // Reload to update read status
          }}
        />
      )}
    </div>
  );
}

export default MessagesPage;