// src/components/ChatModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { chatService, notificationService } from '../services/supabase';
import { XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

function ChatModal({ user, profile, otherUserId, otherUserName, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const subscriptionRef = useRef(null);

  useEffect(() => {
    initializeChat();
    
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeChat = async () => {
    try {
      const conv = await chatService.getOrCreateConversation(user.id, otherUserId);
      setConversation(conv);
      const msgs = await chatService.getMessages(conv.id);
      setMessages(msgs);

      // Mark all messages in this conversation as read
      await chatService.markMessagesAsRead(conv.id, user.id);
      
      // ADDED: Dispatch event to update notification count immediately
      window.dispatchEvent(new Event('messagesRead'));

      // Subscribe to new messages
      subscriptionRef.current = chatService.subscribeToMessages(
        conv.id,
        (payload) => {
          // Only add if it's from the other user (not from ourselves)
          if (payload.new.sender_id !== user.id) {
            setMessages(prev => [...prev, payload.new]);
            
            // ADDED: Automatically mark as read if chat is open
            chatService.markMessagesAsRead(conv.id, user.id).then(() => {
              window.dispatchEvent(new Event('messagesRead'));
            });
            
            // Create notification
            notificationService.createNotification(
              user.id,
              'message',
              'New Message',
              `${otherUserName} sent you a message`,
              conv.id
            );
          }
        }
      );

      setLoading(false);
    } catch (error) {
      console.error('Chat initialization error:', error);
      toast.error('Failed to load chat');
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversation) return;

    const messageText = newMessage;
    setNewMessage('');

    try {
      const sentMessage = await chatService.sendMessage(conversation.id, user.id, messageText);
      
      // Immediately add the message to the local state
      setMessages(prev => [...prev, {
        ...sentMessage,
        sender: {
          user_id: user.id,
          display_name: profile?.display_name || user.email?.split('@')[0] || 'You',
          avatar_url: profile?.avatar_url
        }
      }]);
      
    } catch (error) {
      console.error('Send message error:', error);
      toast.error('Failed to send message');
      setNewMessage(messageText); // Restore message on error
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-semibold text-lg">Chat with {otherUserName}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="text-center text-gray-500">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-500">Start a conversation!</div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-2 ${
                    msg.sender_id === user.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p>{msg.content}</p>
                  <p className={`text-xs mt-1 ${
                    msg.sender_id === user.id ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} className="p-4 border-t">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ChatModal;