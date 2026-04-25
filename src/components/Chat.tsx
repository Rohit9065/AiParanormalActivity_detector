'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Terminal, Camera, MapPin, Printer, Volume2, VolumeX, Menu, MoreVertical, X } from 'lucide-react';

type Message = {
  role: 'user' | 'bot' | 'error';
  content: string;
  image?: string;
};

// Custom component for Glitch Text
const GlitchText = ({ text }: { text: string }) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    let i = 0;
    const chars = '!<>-_\\\\/[]{}—=+*^?#_';
    
    const interval = setInterval(() => {
      if (i >= text.length) {
        setDisplayedText(text); // Ensure final text is perfectly clean
        clearInterval(interval);
        return;
      }
      
      const shouldGlitch = Math.random() > 0.85;
      
      if (shouldGlitch) {
        // Just show a glitch character temporarily, don't advance the real text index
        const randomChar = chars[Math.floor(Math.random() * chars.length)];
        setDisplayedText(text.slice(0, i) + randomChar);
      } else {
        // Show real character and advance
        setDisplayedText(text.slice(0, i + 1));
        i++;
      }
    }, 15);

    return () => {
      clearInterval(interval);
      setDisplayedText(text); // Fallback if unmounted
    };
  }, [text]);

  return <span>{displayedText}</span>;
};

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [emfLevel, setEmfLevel] = useState(1);
  const [audioEnabled, setAudioEnabled] = useState(false);
  
  // Mobile drawer states
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Audio Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const droneOscRef = useRef<OscillatorNode | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      // @ts-ignore
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new AudioContext();
    }
  };

  const toggleAudio = () => {
    initAudio();
    if (!audioEnabled) {
      if (audioCtxRef.current?.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      
      const osc = audioCtxRef.current!.createOscillator();
      const gain = audioCtxRef.current!.createGain();
      // Using 'triangle' at 110Hz makes it audible on mobile/laptop speakers
      osc.type = 'triangle';
      osc.frequency.value = 110; 
      gain.gain.value = 0.15;
      osc.connect(gain);
      gain.connect(audioCtxRef.current!.destination);
      osc.start();
      droneOscRef.current = osc;
      setAudioEnabled(true);
    } else {
      if (droneOscRef.current) {
        droneOscRef.current.stop();
        droneOscRef.current.disconnect();
      }
      setAudioEnabled(false);
    }
  };

  const playStaticBurst = () => {
    if (!audioEnabled || !audioCtxRef.current) return;
    
    const bufferSize = audioCtxRef.current.sampleRate * 0.5;
    const buffer = audioCtxRef.current.createBuffer(1, bufferSize, audioCtxRef.current.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = audioCtxRef.current.createBufferSource();
    whiteNoise.buffer = buffer;
    
    const filter = audioCtxRef.current.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000;
    
    const gainNode = audioCtxRef.current.createGain();
    gainNode.gain.setValueAtTime(0.2, audioCtxRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 0.5);

    whiteNoise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtxRef.current.destination);
    
    whiteNoise.start();
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      interval = setInterval(() => {
        setEmfLevel(Math.floor(Math.random() * 4) + 2);
      }, 300);
    } else {
      setEmfLevel(1);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    
    const queryToUse = customQuery || input;
    if (!queryToUse.trim() && !selectedImage) return;
    if (isLoading) return;

    const userMessage = queryToUse.trim();
    if (!customQuery) setInput('');
    
    const newMsg: Message = { role: 'user', content: userMessage };
    if (selectedImage) {
      newMsg.image = selectedImage;
    }
    
    setMessages(prev => [...prev, newMsg]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, newMsg],
          image: selectedImage
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch response');
      }

      let botText = data.text;
      const isError = botText.includes('[ERROR]');
      
      if (isError) {
        botText = botText.replace('[ERROR]', '').trim();
      }
      
      playStaticBurst();
      setMessages(prev => [...prev, { 
        role: isError ? 'error' : 'bot', 
        content: botText 
      }]);
      
      removeImage();

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

  const scanLocalHauntings = () => {
    const loc = window.prompt("Enter your city or region to scan for local hauntings:");
    if (loc) {
      handleSubmit(undefined, `Scan area: ${loc}. Tell me about local paranormal history, legends, or famous hauntings here.`);
    }
  };

  const printCaseFile = () => {
    window.print();
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
      {/* Mobile Top Bar */}
      <div className="mobile-top-bar">
        <button onClick={() => setIsHistoryOpen(true)} className="icon-btn" aria-label="Open History">
          <Menu size={24} />
        </button>
        <span className="mobile-title">AetherScan</span>
        <button onClick={() => setIsToolsOpen(true)} className="icon-btn" aria-label="Open Tools">
          <MoreVertical size={24} />
        </button>
      </div>

      {/* Mobile Overlays */}
      <div 
        className={`mobile-overlay ${(isHistoryOpen || isToolsOpen) ? 'active' : ''}`}
        onClick={() => { setIsHistoryOpen(false); setIsToolsOpen(false); }}
      />

      {/* Sidebar History */}
      <div className={`sidebar ${isHistoryOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <span>Case Files</span>
          <button className="mobile-close-btn icon-btn" onClick={() => setIsHistoryOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <div className="history-list">
          {historyQueries.length === 0 ? (
            <div style={{ color: '#555', fontSize: '0.8rem', textAlign: 'center', marginTop: '2rem' }}>No previous queries found.</div>
          ) : (
            historyQueries.map((msg, i) => (
              <div key={i} className="history-item" title={msg.content}>
                {msg.content || "[Image attached]"}
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
                {msg.image && (
                  <img src={msg.image} alt="Evidence" style={{maxWidth: '100%', borderRadius: '4px', marginBottom: '8px', border: '1px solid #444'}} />
                )}
                {msg.role === 'bot' && index > 0 ? (
                  <GlitchText text={msg.content} />
                ) : (
                  msg.content
                )}
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
          <button onClick={scanLocalHauntings} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', background: '#1a2a1a', border: '1px solid var(--neon-green)', color: 'var(--neon-green)', borderRadius: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MapPin size={12} /> Scan Area
          </button>
        </div>

        {selectedImage && (
          <div style={{ padding: '0 1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
             <span style={{ fontSize: '0.8rem', color: 'var(--neon-green)' }}>EVIDENCE LOADED</span>
             <img src={selectedImage} alt="preview" style={{ height: '40px', borderRadius: '4px', border: '1px solid #444' }} />
             <button onClick={removeImage} style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', border: '1px solid #ff3939', color: '#ff3939', background: 'transparent' }}>REMOVE</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="input-area">
          <Terminal className="text-[#39ff14] mt-3 ml-2" size={20} color="#39ff14" style={{marginTop: '12px'}} />
          
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageUpload}
            style={{ display: 'none' }}
            id="evidence-upload"
          />
          <label htmlFor="evidence-upload" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 10px', color: '#888', transition: 'color 0.2s' }}>
            <Camera size={24} />
          </label>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter investigation query or attach evidence..."
            disabled={isLoading}
            autoComplete="off"
          />
          <button type="submit" disabled={isLoading || (!input.trim() && !selectedImage)} style={{ display: 'flex', gap: '0.5rem' }}>
            {isLoading ? <div className="loading" /> : (
              <>
                <Send size={18} />
                ASK
              </>
            )}
          </button>
        </form>
      </div>

      {/* Tools Sidebar */}
      <div className={`tools-sidebar ${isToolsOpen ? 'open' : ''}`}>
        <div className="tools-sidebar-header">
          <span>Investigation Tools</span>
          <button className="mobile-close-btn icon-btn" onClick={() => setIsToolsOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <div className="tools-content">
          
          <div className="emf-meter">
            <div className="emf-title">EMF DETECTOR</div>
            <div style={{ fontSize: '1.2rem', color: emfLevel > 3 ? '#ff0000' : 'var(--neon-green)', fontWeight: 'bold' }}>
              {emfLevel.toFixed(1)} mG
            </div>
            <div className="emf-display">
              <div className={`emf-bar ${emfLevel >= 1 ? 'active-1' : ''}`}></div>
              <div className={`emf-bar ${emfLevel >= 2 ? 'active-2' : ''}`}></div>
              <div className={`emf-bar ${emfLevel >= 3 ? 'active-3' : ''}`}></div>
              <div className={`emf-bar ${emfLevel >= 4 ? 'active-4' : ''}`}></div>
              <div className={`emf-bar ${emfLevel >= 5 ? 'active-5' : ''}`}></div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto' }}>
            <button onClick={toggleAudio} style={{ fontSize: '0.75rem', padding: '0.6rem', background: '#111', display: 'flex', justifyContent: 'center', gap: '8px' }}>
              {audioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              AUDIO: {audioEnabled ? 'ON' : 'OFF'}
            </button>
            <button onClick={printCaseFile} style={{ fontSize: '0.75rem', padding: '0.6rem', background: '#111', display: 'flex', justifyContent: 'center', gap: '8px' }}>
              <Printer size={16} /> EXPORT CASE FILE
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}
