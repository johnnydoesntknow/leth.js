// src/pages/MessagesPage.jsx
import React, { useState, useEffect } from 'react';
import { chatService } from '../services/supabase';
import ChatModal from '../components/ChatModal';
import { ChatBubbleLeftIcon, UserCircleIcon } from '@heroicons/react/24/outline';

function MessagesPage({ user }) {
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
      setConversations(convos);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getOtherParticipant = (conversation) => {
    if (conversation.participant1_id === user.id) {
      return {
        id: conversation.participant2_id,
        name: conversation.participant2?.display_name || 'User'
      };
    }
    return {
      id: conversation.participant1_id,
      name: conversation.participant1?.display_name || 'User'
    };
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
              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversation({ conv, otherUser })}
                  className="p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <UserCircleIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-semibold">{otherUser.name}</p>
                      <p className="text-sm text-gray-600 line-clamp-1">
                        {conv.last_message || 'Start a conversation'}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    {conv.last_message_at && new Date(conv.last_message_at).toLocaleDateString()}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedConversation && (
        <ChatModal
          user={user}
          otherUserId={selectedConversation.otherUser.id}
          otherUserName={selectedConversation.otherUser.name}
          onClose={() => setSelectedConversation(null)}
        />
      )}
    </div>
  );
}

export default MessagesPage;