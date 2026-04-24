'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Terminal } from 'lucide-react';

type Message = {
  role: 'user' | 'bot' | 'error';
  content: string;
};

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem('paranormal_history');
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history");
      }
    } else {
      setMessages([{ role: 'bot', content: 'SYSTEM ONLINE. CALIBRATED FOR PARANORMAL ENTITIES ONLY. AWAITING INPUT.' }]);
    }
    setMounted(true);
  }, []);

  // Save to local storage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('paranormal_history', JSON.stringify(messages));
    }
  }, [messages, mounted]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const clearHistory = () => {
    setMessages([{ role: 'bot', content: 'SYSTEM ONLINE. CALIBRATED FOR PARANORMAL ENTITIES ONLY. AWAITING INPUT.' }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }]
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch response');
      }

      let botText = data.text;
      
      // Check if it's the strict error message via the [ERROR] prefix
      const isError = botText.includes('[ERROR]');
      
      if (isError) {
        botText = botText.replace('[ERROR]', '').trim();
      }
      
      setMessages(prev => [...prev, { 
        role: isError ? 'error' : 'bot', 
        content: botText 
      }]);

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { 
        role: 'error', 
        content: 'SYSTEM FAILURE: Unable to establish connection to the ethereal plane.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedQueries = [
    "What is an EMF meter?",
    "How to detect a Class-V entity?",
    "Tell me about the Bell Witch."
  ];

  if (!mounted) return <div className="chat-layout"></div>;

  const historyQueries = messages.filter(m => m.role === 'user');

  return (
    <div className="chat-layout">
      {/* Sidebar History */}
      <div className="sidebar">
        <div className="sidebar-header">
          <span>Case Files</span>
        </div>
        <div className="history-list">
          {historyQueries.length === 0 ? (
            <div style={{ color: '#555', fontSize: '0.8rem', textAlign: 'center', marginTop: '2rem' }}>No previous queries found.</div>
          ) : (
            historyQueries.map((msg, i) => (
              <div key={i} className="history-item" title={msg.content}>
                {msg.content}
              </div>
            ))
          )}
        </div>
        <div className="clear-btn">
          <button onClick={clearHistory} disabled={historyQueries.length === 0}>CLEAR HISTORY</button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="chat-window">
        <div className="chat-history">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.role}`}>
              <div className="message-header">
                {msg.role === 'user' ? 'Investigator' : msg.role === 'error' ? 'System Error' : 'AetherScan AI'}
              </div>
              <div className="message-content">
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="message bot">
              <div className="message-header">AetherScan AI</div>
              <div className="message-content loading-indicator">
                 ANALYZING FREQUENCIES...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="suggested-queries" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '0 1rem', marginBottom: '0.5rem' }}>
          {suggestedQueries.map((q, i) => (
            <button 
              key={i} 
              onClick={() => setInput(q)}
              style={{ 
                fontSize: '0.8rem', 
                padding: '0.4rem 0.8rem', 
                background: '#151515', 
                border: '1px solid #333', 
                color: '#aaa',
                borderRadius: '20px',
                cursor: 'pointer'
              }}
            >
              {q}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="input-area">
          <Terminal className="text-[#39ff14] mt-3 ml-2" size={20} color="#39ff14" style={{marginTop: '12px'}} />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter investigation query..."
            disabled={isLoading}
            autoComplete="off"
          />
          <button type="submit" disabled={isLoading || !input.trim()} style={{ display: 'flex', gap: '0.5rem' }}>
            {isLoading ? <div className="loading" /> : (
              <>
                <Send size={18} />
                ASK QUERY
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
