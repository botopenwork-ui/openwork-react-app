import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { buildOppyContext, FALLBACK_RESPONSES } from '../Documentation/data/oppyKnowledge';
import './AgentOppy.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

const AgentOppy = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([
    {
      role: 'oppy',
      text: 'Hi! I\'m Agent Oppy, your OpenWork assistant. Ask me anything about the protocol, contracts, deployment addresses, workflows, or how to get started!'
    }
  ]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMsg = message;
    setChat(prev => [...prev, { role: 'user', text: userMsg }]);
    setMessage('');

    // Add thinking indicator
    setChat(prev => [...prev, { role: 'oppy', text: 'Thinking...', isThinking: true }]);

    try {
      const systemContext = buildOppyContext(userMsg);

      // Build history from existing chat (exclude thinking messages and initial greeting)
      const history = chat
        .filter(msg => !msg.isThinking)
        .slice(1) // skip the initial greeting
        .map(msg => ({ role: msg.role, text: msg.text }));

      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          context: systemContext,
          history
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setChat(prev => {
          const withoutThinking = prev.filter(msg => !msg.isThinking);
          return [...withoutThinking, { role: 'oppy', text: data.response }];
        });
      } else {
        throw new Error(data.error || 'Chat API failed');
      }
    } catch (error) {
      console.error('Chat error:', error);

      let fallbackResponse = FALLBACK_RESPONSES.default;
      const lowerMsg = userMsg.toLowerCase();

      for (const [keyword, resp] of Object.entries(FALLBACK_RESPONSES)) {
        if (keyword !== 'default' && lowerMsg.includes(keyword)) {
          fallbackResponse = resp;
          break;
        }
      }

      setChat(prev => {
        const withoutThinking = prev.filter(msg => !msg.isThinking);
        return [...withoutThinking, { role: 'oppy', text: fallbackResponse }];
      });
    }
  };

  const suggestedQuestions = [
    'What is OpenWork?',
    'List all contracts',
    'How do payments work?',
    'What chains are supported?'
  ];

  return (
    <div className="oppy-page">
      {/* Header */}
      <header className="oppy-header">
        <button className="oppy-back-btn" onClick={() => navigate('/')} aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <div className="oppy-header-title">
          <div className="oppy-header-icon">
            <MessageSquare size={18} />
          </div>
          <div>
            <h1 className="oppy-header-name">Agent Oppy</h1>
            <span className="oppy-header-sub">OpenWork AI Assistant</span>
          </div>
        </div>
        <div className="oppy-header-status">
          <span className="oppy-status-dot"></span>
          <span className="oppy-status-text">Online</span>
        </div>
      </header>

      {/* Messages */}
      <div className="oppy-messages">
        {chat.map((msg, idx) => (
          <div key={idx} className={`oppy-msg ${msg.role === 'user' ? 'oppy-msg-user' : 'oppy-msg-bot'}`}>
            {msg.role === 'oppy' && (
              <div className="oppy-msg-avatar">
                <MessageSquare size={14} />
              </div>
            )}
            <div className={`oppy-msg-bubble ${msg.role === 'user' ? 'oppy-bubble-user' : 'oppy-bubble-bot'} ${msg.isThinking ? 'oppy-bubble-thinking' : ''}`}>
              {msg.isThinking ? (
                <div className="oppy-thinking">
                  <span className="oppy-thinking-dot"></span>
                  <span className="oppy-thinking-dot"></span>
                  <span className="oppy-thinking-dot"></span>
                </div>
              ) : (
                <p className="oppy-msg-text">{msg.text}</p>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />

        {/* Suggested questions - only show if just the initial message */}
        {chat.length === 1 && (
          <div className="oppy-suggestions">
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                className="oppy-suggestion-btn"
                onClick={() => {
                  setMessage(q);
                  // Trigger submit
                  setTimeout(() => {
                    const form = document.querySelector('.oppy-input-form');
                    if (form) form.requestSubmit();
                  }, 50);
                }}
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="oppy-input-area">
        <form onSubmit={handleSubmit} className="oppy-input-form">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask about OpenWork..."
            className="oppy-input"
            autoComplete="off"
          />
          <button
            type="submit"
            className="oppy-send-btn"
            disabled={!message.trim()}
          >
            <Send size={18} />
          </button>
        </form>
        <p className="oppy-disclaimer">Powered by Gemini AI. Answers may not always be accurate.</p>
      </div>
    </div>
  );
};

export default AgentOppy;
