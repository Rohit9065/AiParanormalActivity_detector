'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Terminal, Camera, MapPin, Printer, Volume2, VolumeX, Menu, MoreVertical, X, Mic } from 'lucide-react';
import Tesseract from 'tesseract.js';

type Message = {
  role: 'user' | 'bot' | 'error';
  content: string;
  image?: string;
};

type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
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

  return <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{displayedText}</span>;
};

// Formatted Text Component
const FormattedText = ({ text }: { text: string }) => {
  // Split text into paragraphs
  const paragraphs = text.split('\n\n');
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
      {paragraphs.map((para, idx) => {
        // Check if this paragraph is a list
        const lines = para.split('\n');
        const isList = lines.some(line => line.trim().match(/^[-•*]\s|^\d+\.\s/));
        
        if (isList) {
          return (
            <ul key={idx} style={{ margin: '0.3rem 0', paddingLeft: '1.5rem' }}>
              {lines.map((line, lineIdx) => {
                const match = line.trim().match(/^[-•*]\s(.+)$|^\d+\.\s(.+)$/);
                if (match) {
                  return (
                    <li key={lineIdx} style={{ margin: '0.2rem 0', lineHeight: '1.6' }}>
                      {match[1] || match[2]}
                    </li>
                  );
                }
                return null;
              })}
            </ul>
          );
        }
        
        return (
          <p key={idx} style={{ margin: 0, lineHeight: '1.8' }}>
            {para}
          </p>
        );
      })}
    </div>
  );
};

export default function Chat() {
  const defaultMessage: Message = { role: 'bot', content: 'SYSTEM ONLINE. CALIBRATED FOR PARANORMAL ENTITIES ONLY. AWAITING INPUT.' };
  const [messages, setMessages] = useState<Message[]>([defaultMessage]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [emfLevel, setEmfLevel] = useState(1);
  const [audioEnabled, setAudioEnabled] = useState(false);
  
  // Mobile drawer states
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  
  // Voice Recognition
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // @ts-ignore
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        
        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput(prev => prev + (prev ? ' ' : '') + transcript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        console.error(e);
      }
    }
  };
  
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
    
    try {
      const bufferSize = Math.floor(audioCtxRef.current.sampleRate * 0.5);
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
      const now = audioCtxRef.current.currentTime;
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      whiteNoise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioCtxRef.current.destination);
      
      whiteNoise.start(now);
    } catch (error) {
      console.warn('Audio burst failed to play:', error);
    }
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
    const saved = localStorage.getItem('paranormal_sessions');
    if (saved) {
      try {
        setSessions(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse sessions", e);
      }
    } else {
      const oldSaved = localStorage.getItem('paranormal_history');
      if (oldSaved) {
        try {
          const parsedOld = JSON.parse(oldSaved);
          if (parsedOld && parsedOld.length > 0) {
            const firstUserMsg = parsedOld.find((m: any) => m.role === 'user');
            const title = firstUserMsg ? (firstUserMsg.content.length > 30 ? firstUserMsg.content.substring(0, 30) + '...' : firstUserMsg.content) : 'Previous Session';
            const newSession = {
              id: Date.now().toString(),
              title: title || 'Previous Session',
              messages: parsedOld,
              updatedAt: Date.now()
            };
            setSessions([newSession]);
            localStorage.setItem('paranormal_sessions', JSON.stringify([newSession]));
          }
        } catch(e) {}
      }
    }
    setMessages([defaultMessage]);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (messages.length === 1 && messages[0].role === 'bot' && messages[0].content === defaultMessage.content) {
      return;
    }

    try {
      // Strip images before saving to prevent localStorage QuotaExceededError
      const historyToSave = messages.map(msg => {
        if (msg.image) {
          return { role: msg.role, content: msg.content };
        }
        return msg;
      });
      
      setSessions(prevSessions => {
        let updatedSessions = [...prevSessions];
        const firstUserMsg = messages.find(m => m.role === 'user');
        let title = "New Investigation";
        if (firstUserMsg) {
          title = firstUserMsg.content ? (firstUserMsg.content.length > 30 ? firstUserMsg.content.substring(0, 30) + '...' : firstUserMsg.content) : "Image Analysis";
        }

        const sessionId = currentSessionIdRef.current;
        
        if (sessionId) {
          const index = updatedSessions.findIndex(s => s.id === sessionId);
          if (index !== -1) {
            updatedSessions[index] = {
              ...updatedSessions[index],
              title,
              messages: historyToSave,
              updatedAt: Date.now()
            };
          } else {
            updatedSessions.unshift({
              id: sessionId,
              title,
              messages: historyToSave,
              updatedAt: Date.now()
            });
          }
        } else {
          const newId = Date.now().toString();
          currentSessionIdRef.current = newId;
          setCurrentSessionId(newId);
          updatedSessions.unshift({
            id: newId,
            title,
            messages: historyToSave,
            updatedAt: Date.now()
          });
        }
        
        updatedSessions = updatedSessions.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 10);
        localStorage.setItem('paranormal_sessions', JSON.stringify(updatedSessions));
        return updatedSessions;
      });
    } catch (e) {
      console.error("Failed to save history", e);
    }
  }, [messages, mounted]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const clearHistory = () => {
    setMessages([defaultMessage]);
    setCurrentSessionId(null);
    currentSessionIdRef.current = null;
    setSessions([]);
    localStorage.removeItem('paranormal_sessions');
    localStorage.removeItem('paranormal_history');
  };

  const loadSession = (session: ChatSession) => {
    setMessages(session.messages);
    setCurrentSessionId(session.id);
    currentSessionIdRef.current = session.id;
    setIsHistoryOpen(false);
  };

  const startNewSession = () => {
    setMessages([defaultMessage]);
    setCurrentSessionId(null);
    currentSessionIdRef.current = null;
    setIsHistoryOpen(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setSelectedImage(dataUrl);
        setIsExtracting(true);
        setExtractedText('');
        Tesseract.recognize(
          dataUrl,
          'eng'
        ).then(({ data: { text } }) => {
          setExtractedText(text.trim());
          setIsExtracting(false);
        }).catch(err => {
          console.error(err);
          setExtractedText('[Error extracting text from image]');
          setIsExtracting(false);
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setExtractedText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    
    let queryToUse = customQuery || input;
    if (extractedText && !customQuery) {
      queryToUse += `\n[EVIDENCE UPLOADED - EXTRACTED TEXT: "${extractedText}"]`;
    }
    
    if (!queryToUse.trim() && !selectedImage) return;
    if (isLoading || isExtracting) return;

    const userMessage = queryToUse.trim();
    if (!customQuery) setInput('');
    
    const newMsg: Message = { role: 'user', content: userMessage };
    if (selectedImage) {
      newMsg.image = selectedImage;
    }
    
    setMessages(prev => [...prev, newMsg]);
    setIsLoading(true);

    let retryCount = 0;
    const maxRetries = 3;
    
    const attemptFetch = async (): Promise<void> => {
      try {
        const messagesToSend = [...messages, newMsg].map((m, i, arr) => {
          const formatted: any = { role: m.role, content: m.content };
          if (m.image && i === arr.length - 1) {
            formatted.image = m.image;
          }
          return formatted;
        });
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: messagesToSend
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          // If 503 error, retry
          if (response.status === 503 && retryCount < maxRetries) {
            retryCount++;
            const waitTime = 2000 * Math.pow(2, retryCount - 1); // Exponential backoff
            console.log(`Retrying in ${waitTime}ms... (Attempt ${retryCount}/${maxRetries})`);
            
            // Show status message
            setMessages(prev => [...prev, {
              role: 'bot',
              content: `SYSTEM STATUS: Retrying connection... Attempt ${retryCount}/${maxRetries}. Please wait.`
            }]);
            
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return attemptFetch();
          }
          
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

      } catch (error: any) {
        console.error(error);
        const errorMsg = error.message || 'Unable to establish connection to the ethereal plane.';
        
        // Provide helpful retry instructions
        let fullErrorMsg = `SYSTEM FAILURE: ${errorMsg}`;
        
        if (errorMsg.includes('SERVICE TEMPORARILY UNAVAILABLE') || errorMsg.includes('high demand')) {
          fullErrorMsg += '\n\nTIP: The API is temporarily overloaded. Try again in 30-60 seconds.';
        } else if (errorMsg.includes('RATE LIMIT')) {
          fullErrorMsg += '\n\nTIP: Wait 60 seconds before asking another question.';
        }
        
        setMessages(prev => [...prev, { 
          role: 'error', 
          content: fullErrorMsg
        }]);
      } finally {
        setIsLoading(false);
      }
    };
    
    await attemptFetch();
  };

  const scanLocalHauntings = () => {
    if (!navigator.geolocation) {
      const loc = window.prompt("Geolocation not supported. Enter your city or region to scan for local hauntings:");
      if (loc) {
        handleSubmit(undefined, `Scan area: ${loc}. Tell me about local paranormal history, legends, or famous hauntings here.`);
      }
      return;
    }

    setIsLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`);
          const data = await response.json();
          let locationName = "your area";
          if (data && data.address) {
            const addr = data.address;
            locationName = addr.city || addr.town || addr.village || addr.suburb || addr.county || addr.state || "your area";
          }
          setIsLoading(false);
          handleSubmit(undefined, `Scan area: ${locationName} (Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}). Tell me about local paranormal history, legends, or famous hauntings in ${locationName}.`);
        } catch (error) {
          setIsLoading(false);
          handleSubmit(undefined, `Scan area at latitude ${latitude.toFixed(5)}, longitude ${longitude.toFixed(5)}. Tell me about local paranormal history, legends, or famous hauntings here.`);
        }
      },
      (error) => {
        console.warn('Geolocation failed:', error);
        setIsLoading(false);
        const loc = window.prompt("Unable to access your current location. Enter your city or region to scan for local hauntings:");
        if (loc) {
          handleSubmit(undefined, `Scan area: ${loc}. Tell me about local paranormal history, legends, or famous hauntings here.`);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
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

  return (
    <div className="chat-layout">
      {/* Mobile Top Bar */}
      <div className="mobile-top-bar">
        <button onClick={() => setIsHistoryOpen(true)} className="icon-btn" aria-label="Open History">
          <Menu size={24} />
        </button>
        <span className="mobile-title">AI Paranormal Investigation- Bot</span>
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
        
        <div style={{ padding: '1rem', paddingBottom: '0' }}>
          <button
            onClick={startNewSession}
            style={{ width: '100%', fontSize: '0.9rem', padding: '0.6rem', background: 'var(--neon-green)', border: 'none', color: '#000', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px' }}
          >
            + NEW INVESTIGATION
          </button>
        </div>

        <div className="history-list" style={{ marginTop: '1rem' }}>
          {sessions.length === 0 ? (
            <div style={{ color: '#555', fontSize: '0.8rem', textAlign: 'center', marginTop: '2rem' }}>
              No previous queries found.
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={`history-item ${currentSessionId === session.id ? 'active-session' : ''}`}
                onClick={() => loadSession(session)}
                style={{ cursor: 'pointer', padding: '0.8rem', borderBottom: '1px solid #222', backgroundColor: currentSessionId === session.id ? '#1a1a1a' : 'transparent', borderLeft: currentSessionId === session.id ? '3px solid var(--neon-green)' : '3px solid transparent' }}
              >
                <div style={{ fontSize: '0.9rem', color: '#eee', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {session.title}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#666' }}>
                  {new Date(session.updatedAt).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="clear-btn" style={{ marginTop: 'auto' }}>
          <button onClick={clearHistory} disabled={sessions.length === 0}>CLEAR ALL HISTORY</button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="chat-window">
        <div className="chat-history">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.role}`}>
              <div className="message-header">
                {msg.role === 'user' ? 'Investigator' : msg.role === 'error' ? 'System Error' : 'AI Paranormal Investigation- Bot'}
              </div>
              <div className="message-content">
                {msg.image && (
                  <img src={msg.image} alt="Evidence" style={{maxWidth: '100%', borderRadius: '4px', marginBottom: '8px', border: '1px solid #444'}} />
                )}
                {msg.role === 'bot' && index > 0 ? (
                  <GlitchText text={msg.content} />
                ) : msg.role === 'user' ? (
                  <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {msg.content}
                  </div>
                ) : (
                  <FormattedText text={msg.content} />
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="message bot">
              <div className="message-header">AI Paranormal Investigation- Bot</div>
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
          <div style={{ padding: '0 1rem', display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
             <span style={{ fontSize: '0.8rem', color: 'var(--neon-green)' }}>EVIDENCE LOADED</span>
             <img src={selectedImage} alt="preview" style={{ height: '40px', borderRadius: '4px', border: '1px solid #444' }} />
             {isExtracting ? (
               <span style={{ fontSize: '0.7rem', color: '#aaa' }}>Scanning for text...</span>
             ) : extractedText ? (
               <span style={{ fontSize: '0.7rem', color: '#aaa', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                 "{extractedText}"
               </span>
             ) : null}
             <button onClick={removeImage} style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', border: '1px solid #ff3939', color: '#ff3939', background: 'transparent' }}>REMOVE</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="input-area">
          <div className="input-box-wrapper">
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageUpload}
              style={{ display: 'none' }}
              id="evidence-upload"
            />
            <label htmlFor="evidence-upload" className="attach-btn" title="Upload Image for OCR">
              <Camera size={20} />
            </label>
            <button 
              type="button" 
              onClick={toggleListening} 
              title="Voice Recognition"
              style={{ color: isListening ? '#ff3939' : 'var(--neon-green)', border: 'none', background: 'transparent', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Mic size={20} />
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter investigation query or attach evidence..."
              disabled={isLoading}
              autoComplete="off"
            />
            
            <button type="submit" className="send-btn" disabled={isLoading || (!input.trim() && !selectedImage)}>
              {isLoading ? <div className="loading" style={{ width: '16px', height: '16px', borderWidth: '2px' }} /> : <Send size={16} />}
            </button>
          </div>
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
            <button onClick={printCaseFile} style={{ fontSize: '0.75rem', padding: '0.6rem', background: '#111', display: 'flex', justifyContent: 'center', gap: '8px' }}>
              <Printer size={16} /> EXPORT CASE FILE
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}
