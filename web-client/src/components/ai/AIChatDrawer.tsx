import React, { useState, useEffect, useRef } from 'react';
import { useRole } from '../../context/RoleContext';
import { useLanguage } from '../../context/LanguageContext';
import { dataService } from '../../services/mockDataService';
import type { AIChatMessage } from '../../types/ai';
import { Send, X, Bot, User, Info, Mic, Square, Volume2, VolumeX, Download } from 'lucide-react';
import kspEmblemImg from '../../assets/ksp.jpg';
import { apiClient } from '../../services/apiClient';
import { StructuredAIResponse } from './StructuredAIResponse';

interface AIChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIChatDrawer: React.FC<AIChatDrawerProps> = ({ isOpen, onClose }) => {
  const { activeRole, activeView, roleConfig } = useRole();
  const { language, translations } = useLanguage();
  const isKn = language === 'kn';

  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const feedEndRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sessionId = `workspace-${activeRole.toLowerCase()}`;

  // Re-initialize greeting message when language or active role changes
  useEffect(() => {
    const prompts = dataService.getSuggestedPromptsForRole(activeRole, language);
    const greetingText = isKn
      ? `${translations.roles[activeRole]?.title || roleConfig.title} ಕಾರ್ಯಕ್ಷೇತ್ರಕ್ಕೆ ಸಹಾಯ ಮಾಡಲು ಸಿದ್ಧವಾಗಿದೆ. ಪರಿಶೀಲಿಸಬೇಕಾದ ದಾಖಲೆ ಅಥವಾ ಮಾದರಿಯನ್ನು ಆಯ್ಕೆಮಾಡಿ.`
      : `${roleConfig.aiPersona} is ready for this workspace. ${roleConfig.primaryQuestion}`;

    setMessages([
      {
        id: 'MSG-INIT',
        sender: 'AI',
        timestamp: isKn ? 'ಈಗಷ್ಟೇ' : 'Just now',
        role: activeRole,
        text: greetingText,
        suggestedFollowups: prompts
      }
    ]);
  }, [language, activeRole]);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isThinking]);

  useEffect(() => () => {
    recorderRef.current?.stream.getTracks().forEach(track => track.stop());
    audioRef.current?.pause();
  }, []);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const userMsg: AIChatMessage = {
      id: `USR-${Date.now()}`,
      sender: 'USER',
      timestamp: new Date().toLocaleTimeString(isKn ? 'kn-IN' : 'en-IN', { hour: '2-digit', minute: '2-digit' }),
      text: text,
      role: activeRole
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsThinking(true);

    try {
      const result = await apiClient.chat(text, isKn ? 'kn' : 'en', sessionId, activeView);
      const sources = Array.isArray(result.sources) ? result.sources : [];
      const aiMsg: AIChatMessage = {
        id: `AI-${Date.now()}`,
        sender: 'AI',
        timestamp: new Date().toLocaleTimeString(isKn ? 'kn-IN' : 'en-IN', { hour: '2-digit', minute: '2-digit' }),
        text: String(result.response || 'No verified response was returned.'),
        role: activeRole,
        evidence: sources.map((source, index) => {
          const item = source as Record<string, unknown>;
          return {
            id: String(item.id || `source-${index + 1}`),
            type: 'FIR_RECORD' as const,
            title: String(item.title || 'NAMMA KSP verified source'),
            referenceCode: String(item.id || `S${index + 1}`),
            snippet: String(item.evidence_excerpt || ''),
          };
        }),
      };
      setMessages(prev => [...prev, aiMsg]);
      void speak(aiMsg.text);
    } catch (chatError) {
      setMessages(prev => [...prev, {
        id: `AI-ERROR-${Date.now()}`,
        sender: 'AI', timestamp: new Date().toLocaleTimeString(), role: activeRole,
        text: chatError instanceof Error ? chatError.message : 'The intelligence service is unavailable.',
      }]);
    } finally {
      setIsThinking(false);
    }
  };

  const speak = async (text: string) => {
    if (!text.trim()) return;
    try {
      audioRef.current?.pause();
      const blob = await apiClient.textToSpeech(text, isKn ? 'kn' : 'en');
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      setIsSpeaking(true);
      const release = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
      };
      audio.addEventListener('ended', release, { once: true });
      audio.addEventListener('error', release, { once: true });
      await audio.play();
    } catch (error) {
      setVoiceError(error instanceof Error ? error.message : 'Voice playback is unavailable.');
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    setIsSpeaking(false);
  };

  const toggleRecording = async () => {
    if (isRecording) {
      recorderRef.current?.stop();
      return;
    }
    setVoiceError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorderRef.current = recorder;
      recorder.ondataavailable = event => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        setIsRecording(false);
        stream.getTracks().forEach(track => track.stop());
        try {
          const result = await apiClient.transcribe(new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' }), isKn ? 'kn' : 'en');
          const transcript = String(result.text || '').trim();
          if (transcript) setInputText(transcript);
          else setVoiceError(isKn ? 'ಧ್ವನಿ ಪತ್ತೆಯಾಗಲಿಲ್ಲ.' : 'No speech was detected.');
        } catch (error) {
          setVoiceError(error instanceof Error ? error.message : 'Transcription failed.');
        }
      };
      recorder.start();
      setIsRecording(true);
    } catch {
      setVoiceError(isKn ? 'ಮೈಕ್ರೊಫೋನ್ ಅನುಮತಿ ಅಗತ್ಯವಿದೆ.' : 'Microphone permission is required.');
    }
  };

  const exportConversation = async () => {
    const exportable = messages
      .filter(message => message.id !== 'MSG-INIT')
      .map(message => ({ role: message.sender === 'AI' ? 'assistant' : 'user', content: message.text }));
    if (!exportable.length) return;
    await apiClient.exportChat(sessionId, exportable);
  };

  return (
    <div className="chat-dialog-backdrop" onMouseDown={onClose}>
    <section className="chat-dialog" role="dialog" aria-modal="true" aria-label="Namma KSP Assistant" onMouseDown={event => event.stopPropagation()}>
      {/* Drawer Header */}
      <div style={{
        padding: '1.25rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--surface-muted)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            padding: '2px',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}>
            <img src={kspEmblemImg} alt="KSP Emblem" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              {isKn ? 'ನಮ್ಮ KSP ಸಹಾಯಕ' : 'Namma KSP Assistant'}
            </h3>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>
              {isKn ? translations.roles[activeRole]?.title : `${roleConfig.title} · ${roleConfig.aiPersona}`}
            </p>
          </div>
        </div>

        <button
          aria-label={isKn ? 'ಸಂಭಾಷಣೆ PDF ಡೌನ್‌ಲೋಡ್' : 'Download conversation PDF'}
          title={isKn ? 'ಸಂಭಾಷಣೆ PDF ಡೌನ್‌ಲೋಡ್' : 'Download conversation PDF'}
          disabled={messages.length <= 1}
          onClick={() => void exportConversation()}
          style={{ padding: '0.35rem', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginLeft: 'auto', marginRight: '0.4rem' }}
        >
          <Download size={16} />
        </button>
        <button
          aria-label={isKn ? 'ಚಾಟ್ ಮುಚ್ಚಿ' : 'Close chat'}
          onClick={onClose}
          style={{ padding: '0.35rem', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages Feed */}
      <div className="chat-dialog-feed">
        {messages.map(msg => (
          <div
            key={msg.id}
            style={{
              alignSelf: msg.sender === 'USER' ? 'flex-end' : 'flex-start',
              maxWidth: '85%'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              marginBottom: '0.25rem',
              justifyContent: msg.sender === 'USER' ? 'flex-end' : 'flex-start',
              fontSize: '0.7rem',
              color: 'var(--text-muted)'
            }}>
              {msg.sender === 'AI' ? <Bot size={12} color="var(--accent)" /> : <User size={12} />}
              <span>{msg.sender === 'AI' ? roleConfig.aiPersona : (isKn ? 'ಅಧಿಕಾರಿ' : 'You')}</span>
              <span>• {msg.timestamp}</span>
            </div>

            <div style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: msg.sender === 'USER' ? 'var(--accent-muted)' : 'var(--surface-card)',
              color: msg.sender === 'USER' ? '#ffffff' : 'var(--text-primary)',
              border: msg.sender === 'USER' ? 'none' : '1px solid var(--border)',
              fontSize: '0.84rem',
              lineHeight: 1.4
            }}>
              {msg.sender === 'AI' ? <StructuredAIResponse text={msg.text} /> : msg.text}
            </div>

            {msg.sender === 'AI' && msg.evidence && msg.evidence.length > 0 && (
              <div className="chat-evidence"><strong>{isKn ? 'ಪರಿಶೀಲಿಸಿದ ಮೂಲಗಳು' : 'Verified sources'}</strong>{msg.evidence.map(item => <span key={item.id}>{item.referenceCode}</span>)}</div>
            )}

            {msg.suggestedFollowups && msg.suggestedFollowups.length > 0 && (
              <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {isKn ? 'ಶಿಫಾರಸು ಮಾಡಿದ ಪ್ರಶ್ನೆಗಳು:' : 'Suggested Questions:'}
                </span>
                {msg.suggestedFollowups.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(p)}
                    style={{
                      textAlign: 'left',
                      fontSize: '0.74rem',
                      color: 'var(--accent)',
                      backgroundColor: 'var(--surface-muted)',
                      border: '1px solid var(--border)',
                      padding: '0.35rem 0.65rem',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {isThinking && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.65rem 0.9rem',
            backgroundColor: 'var(--surface-card)',
            border: '1px solid var(--border-accent)',
            borderRadius: 'var(--radius-md)',
            alignSelf: 'flex-start',
            maxWidth: '85%',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <img
              src={kspEmblemImg}
              alt="KSP Emblem"
              style={{
                width: '28px',
                height: '28px',
                objectFit: 'contain',
                animation: 'kspPulse 1.2s infinite ease-in-out'
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-primary)', fontWeight: 800 }}>
                {isKn ? 'ದಾಖಲೆಗಳನ್ನು ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...' : 'Checking verified records...'}
              </span>
              <span style={{ fontSize: '0.68rem', color: 'var(--accent)', fontWeight: 700 }}>
                {isKn ? 'ಸಾಕ್ಷ್ಯ ಮೂಲಗಳನ್ನು ಜೋಡಿಸಲಾಗುತ್ತಿದೆ' : 'Linking evidence sources'}
              </span>
            </div>
          </div>
        )}
        <div ref={feedEndRef} />
      </div>

      {/* Footer Disclaimer */}
      <div className="chat-dialog-composer" style={{
        padding: '0.6rem 1rem',
        backgroundColor: 'var(--surface-muted)',
        borderTop: '1px solid var(--border)',
        fontSize: '0.68rem',
        color: 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem'
      }}>
        <Info size={12} color="var(--text-muted)" style={{ flexShrink: 0 }} />
        <span>
          {isKn
            ? 'ಅಧಿಕಾರಿ ನಿರ್ಧಾರ ತೆಗೆದುಕೊಳ್ಳಲು ಸಹಾಯ ಮಾಡುತ್ತದೆ. ಎಲ್ಲಾ ಪ್ರತಿಕ್ರಿಯೆಗಳು ತನಿಖಾ ಸುಳಿವುಗಳಾಗಿವೆ.'
            : 'Decision support only. Verify cited records before operational action.'}
        </span>
      </div>

      {/* Input Field */}
      <div style={{
        padding: '1rem',
        borderTop: '1px solid var(--border)',
        backgroundColor: 'var(--surface-elevated)',
        display: 'flex',
        gap: '0.5rem'
      }}>
        <button
          type="button"
          onClick={() => void toggleRecording()}
          aria-label={isRecording ? (isKn ? 'ರೆಕಾರ್ಡಿಂಗ್ ನಿಲ್ಲಿಸಿ' : 'Stop recording') : (isKn ? 'ಧ್ವನಿ ಪ್ರಶ್ನೆ' : 'Record voice question')}
          title={isRecording ? 'Stop recording' : 'Record voice question'}
          style={{ padding: '0.6rem', backgroundColor: isRecording ? 'var(--danger)' : 'var(--surface-muted)', color: isRecording ? '#fff' : 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
        >
          {isRecording ? <Square size={16} fill="currentColor" /> : <Mic size={16} />}
        </button>
        <button
          type="button"
          onClick={isSpeaking ? stopSpeaking : () => {
            const latest = [...messages].reverse().find(message => message.sender === 'AI');
            if (latest) void speak(latest.text);
          }}
          aria-label={isSpeaking ? (isKn ? 'ಧ್ವನಿ ನಿಲ್ಲಿಸಿ' : 'Stop speaking') : (isKn ? 'ಉತ್ತರ ಓದಿ' : 'Read latest answer')}
          title={isSpeaking ? 'Stop speaking' : 'Read latest answer'}
          style={{ padding: '0.6rem', backgroundColor: 'var(--surface-muted)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
        >
          {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <textarea
          rows={2}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSendMessage(); } }}
          placeholder={isKn ? `${translations.roles[activeRole]?.title || roleConfig.title} ಗೆ ಪ್ರಶ್ನೆ ಕೇಳಿ...` : `Ask ${roleConfig.aiPersona}...`}
          style={{
            flex: 1,
            padding: '0.6rem 0.85rem',
            backgroundColor: 'var(--surface-muted)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            fontSize: '0.82rem',
            outline: 'none', resize: 'none', minHeight: 44, maxHeight: 120, lineHeight: 1.4
          }}
        />
        <button
          onClick={() => handleSendMessage()}
          style={{
            padding: '0.6rem 0.85rem',
            backgroundColor: 'var(--accent)',
            color: 'var(--text-inverse)',
            borderRadius: 'var(--radius-md)',
            fontWeight: 700,
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Send size={16} />
        </button>
      </div>
      {voiceError && <div role="status" style={{ padding: '0 1rem 0.75rem', color: 'var(--danger)', fontSize: '0.72rem' }}>{voiceError}</div>}
      <style>{`.chat-dialog-backdrop{position:fixed;inset:0;z-index:999999;background:rgba(4,14,29,.76);display:grid;place-items:center;padding:1rem}.chat-dialog{width:min(900px,100%);height:min(820px,92vh);display:flex;flex-direction:column;overflow:hidden;background:var(--surface-elevated);color:var(--text-primary);border:1px solid var(--border);border-radius:var(--radius-lg);box-shadow:var(--shadow-lg);animation:chatDialogIn 220ms ease-out}.chat-dialog-feed{flex:1;min-height:0;padding:1.25rem;overflow-y:auto;display:flex;flex-direction:column;gap:1rem}.chat-dialog-composer{flex:0 0 auto}.chat-evidence{display:flex;align-items:center;gap:.35rem;flex-wrap:wrap;margin-top:.5rem;color:var(--text-muted);font-size:.68rem}.chat-evidence span{padding:.22rem .4rem;background:var(--surface-muted);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--info);font-weight:750}@keyframes chatDialogIn{from{opacity:0;transform:translateY(12px) scale(.985)}to{opacity:1;transform:none}}@media(max-width:640px){.chat-dialog-backdrop{padding:0}.chat-dialog{width:100%;height:100%;max-height:none;border:0;border-radius:0}.chat-dialog-feed{padding:1rem}.chat-dialog-composer{padding:.75rem!important;gap:.35rem!important}}@media(prefers-reduced-motion:reduce){.chat-dialog{animation:none}}`}</style>
    </section>
    </div>
  );
};
