import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Bot, Send, X } from 'lucide-react';
import { apiClient } from '../../services/apiClient';

interface ChatMessage {
  id: string;
  sender: 'USER' | 'AI';
  text: string;
  timestamp: string;
  firReference?: string;
}

export const InvestigationAIChatDrawer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputQuery, setInputQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'AI',
      text: 'Greetings Inspector. Namma KSP Assistant is active for your investigation desk. Ask any query regarding FIR records, accused links, modus operandi, or CDR pings.',
      timestamp: 'Just now'
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const quickPrompts = [
    { label: 'Assigned FIR queue', query: 'Summarize the active FIRs assigned to me and identify the oldest high-risk records.' },
    { label: 'Repeat-offender links', query: 'Which verified repeat offenders appear in my assigned FIR records?' },
    { label: 'Similar crime methods', query: 'Find the strongest modus-operandi patterns across my assigned cases.' },
    { label: 'Investigation priorities', query: 'Recommend the next three evidence-based actions for my current case queue.' }
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputQuery;
    if (!query.trim()) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'USER',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputQuery('');
    setIsTyping(true);

    try {
      const result = await apiClient.chat(query, 'en', 'investigator-desk');
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'AI',
        text: String(result.response || 'No verified response was returned.'),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (chatError) {
      setMessages(prev => [...prev, {
        id: `ai-error-${Date.now()}`, sender: 'AI',
        text: chatError instanceof Error ? chatError.message : 'The intelligence service is unavailable.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* CIRCULAR FLOATING BUTTON AT BOTTOM-RIGHT OF SCREEN (HIDDEN WHEN CHAT IS OPEN) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          title="Open Namma KSP Assistant"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 99990,
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent)',
            color: 'var(--text-inverse)',
            border: '2px solid rgba(255, 255, 255, 0.25)',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 24px rgba(217, 119, 6, 0.45)',
            transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <span style={{ fontSize: '1.3rem' }}>👮‍♂️</span>
        </button>
      )}

      {/* CHAT DRAWER WINDOW */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '86px',
          right: '24px',
          width: '410px',
          maxHeight: '620px',
          height: '80vh',
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border-accent)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.55)',
          zIndex: 999999,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 200ms ease-out'
        }}>
          {/* Header */}
          <div style={{
            padding: '0.9rem 1.1rem',
            backgroundColor: 'var(--surface-elevated)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--accent-light)',
                color: 'var(--accent-muted)',
                display: 'grid',
                placeItems: 'center'
              }}>
                <Bot size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Case Assistant
                </h4>
                <div style={{ fontSize: '0.72rem', color: 'var(--success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.1rem' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'var(--success)' }} />
                  Assistant Online
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0.35rem',
                display: 'grid',
                placeItems: 'center'
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Compact 1-Line Quick Prompts Scrollbar */}
          <div style={{
            padding: '0.45rem 0.85rem',
            backgroundColor: 'var(--surface-muted)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            overflowX: 'auto',
            scrollbarWidth: 'none'
          }}>
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(p.query)}
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '0.25rem 0.6rem',
                  borderRadius: '999px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface-card)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 150ms ease'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Scrollable Chat Messages Stream */}
          <div style={{
            flex: 1,
            padding: '1rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {messages.map(msg => (
              <div
                key={msg.id}
                style={{
                  alignSelf: msg.sender === 'USER' ? 'flex-end' : 'flex-start',
                  maxWidth: '86%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem'
                }}
              >
                <div style={{
                  padding: '0.75rem 0.95rem',
                  borderRadius: msg.sender === 'USER' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  backgroundColor: msg.sender === 'USER' ? 'var(--accent)' : 'var(--surface-elevated)',
                  color: msg.sender === 'USER' ? 'var(--text-inverse)' : 'var(--text-primary)',
                  border: msg.sender === 'USER' ? 'none' : '1px solid var(--border)',
                  fontSize: '0.82rem',
                  lineHeight: 1.45,
                  boxShadow: 'var(--shadow-xs)'
                }}>
                  {msg.text}
                  {msg.firReference && (
                    <div style={{
                      marginTop: '0.5rem',
                      paddingTop: '0.4rem',
                      borderTop: '1px solid var(--border-subtle)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      color: 'var(--accent)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}>
                      <span>FIR Ref: {msg.firReference}</span>
                    </div>
                  )}
                </div>
                <span style={{
                  fontSize: '0.65rem',
                  color: 'var(--text-muted)',
                  alignSelf: msg.sender === 'USER' ? 'flex-end' : 'flex-start',
                  padding: '0 0.2rem'
                }}>
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {isTyping && (
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.4rem', paddingLeft: '0.2rem' }}>
                <Sparkles size={14} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
                <span>CrimeLens AI is cross-referencing FIR database...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input Field */}
          <div style={{
            padding: '0.75rem 0.95rem',
            backgroundColor: 'var(--surface-elevated)',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask a question about cases, suspects, or reports..."
              style={{
                flex: 1,
                padding: '0.55rem 0.85rem',
                backgroundColor: 'var(--surface-muted)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
                outline: 'none'
              }}
            />
            <button
              onClick={() => handleSendMessage()}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--accent)',
                color: 'var(--text-inverse)',
                border: 'none',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                transition: 'all 150ms ease'
              }}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
