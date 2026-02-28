import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, X, Sparkles, Loader2, User } from 'lucide-react';
import axios from 'axios';

const AIChatbot = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm NeuraRise AI, your personal habit transformation assistant. How can I help you today?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Get user context
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const token = localStorage.getItem('token');

      const response = await axios.post(
        'http://localhost:4000/api/ai/chatbot',
        {
          query: input,
          userContext: {
            userId: user._id,
            name: user.name,
            level: user.level || 1,
            habitCoins: user.habitCoins || 0,
            role: user.role
          }
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const aiMessage = {
        role: 'assistant',
        content: response.data.response || response.data.fallbackResponse,
        suggestedActions: response.data.suggestedActions || [],
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chatbot error:', error);
      const errorMessage = {
        role: 'assistant',
        content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickActions = [
    { icon: '🎯', label: 'Track a habit', action: 'I want to track a new habit' },
    { icon: '😔', label: 'Feeling down', action: 'I\'m feeling a bit overwhelmed today' },
    { icon: '🏆', label: 'My progress', action: 'Show me my progress and insights' },
    { icon: '👥', label: 'Join community', action: 'I want to join a supportive community' },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="fixed bottom-4 right-4 w-[380px] max-w-[calc(100vw-2rem)] h-[650px] max-h-[calc(100vh-2rem)] z-50 flex flex-col bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200"
      >
        {/* Header */}
        <div className="bg-white p-4 flex items-center justify-between shrink-0 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-amber-400 to-yellow-500 p-2 rounded-full">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">NeuraRise AI</h3>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-slate-600">Online</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:bg-slate-100 transition-all rounded-lg p-1.5 hover:scale-110 active:scale-95"
            aria-label="Close chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-br-none'
                    : 'bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200'
                }`}
              >
                <div className="flex items-start space-x-2">
                  {message.role === 'assistant' && (
                    <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0 mt-1" />
                  )}
                  {message.role === 'user' && (
                    <User className="w-4 h-4 text-white flex-shrink-0 mt-1" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    {message.suggestedActions && message.suggestedActions.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {message.suggestedActions.map((action, idx) => (
                          <button
                            key={idx}
                            onClick={() => setInput(action)}
                            className="block w-full text-left text-xs px-2 py-1 bg-emerald-50 hover:bg-emerald-100 rounded text-emerald-700 transition-colors"
                          >
                            → {action}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-xs text-slate-500 mt-1 text-right">
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </motion.div>
          ))}
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-slate-100 rounded-lg rounded-bl-none border border-slate-200 p-3">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        {messages.length === 1 && (
          <div className="p-4 bg-slate-50 grid grid-cols-2 gap-2 border-t border-slate-200">
            {quickActions.map((action, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                onClick={() => setInput(action.action)}
                className="p-2 bg-white hover:bg-emerald-50 rounded-lg text-left transition-all border border-slate-200 hover:border-emerald-300"
              >
                <div className="text-lg mb-1">{action.icon}</div>
                <div className="text-xs text-slate-700 font-medium">{action.label}</div>
              </motion.button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="p-4 bg-white border-t border-slate-200">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything..."
              className="flex-1 bg-slate-50 text-slate-800 placeholder-slate-400 px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all"
              disabled={loading}
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2 rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
            >
              <Send className="w-5 h-5 text-white" />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// Floating Button to open chatbot
export const AIChatbotButton = ({ onClick }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 bg-gradient-to-br from-emerald-500 to-teal-600 p-3 sm:p-5 rounded-full shadow-xl shadow-emerald-500/40 z-40 group hover:shadow-2xl hover:shadow-emerald-500/60"
      animate={{
        boxShadow: [
          '0 10px 30px rgba(16, 185, 129, 0.4)',
          '0 10px 50px rgba(16, 185, 129, 0.6)',
          '0 10px 30px rgba(16, 185, 129, 0.4)',
        ],
      }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <Bot className="w-5 h-5 sm:w-7 sm:h-7 text-white drop-shadow-lg group-hover:animate-bounce" />
      <motion.div
        className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full shadow-lg"
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </motion.button>
  );
};

export default AIChatbot;
