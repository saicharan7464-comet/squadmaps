import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, QuickActionType } from '../../types/chat';
import { Send, MessageSquare, X, Clock, Coffee, Fuel, AlertTriangle, CheckCircle, Navigation } from 'lucide-react';

interface SquadChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (text: string, quickAction?: QuickActionType) => void;
}

const QUICK_ACTIONS: { id: QuickActionType; label: string; icon: any; color: string }[] = [
  { id: 'wait_for_me', label: 'Wait for me', icon: Clock, color: 'var(--status-warning)' },
  { id: 'stopping', label: 'I am stopping', icon: AlertTriangle, color: 'var(--status-alert)' },
  { id: 'fuel_stop', label: 'Fuel stop', icon: Fuel, color: 'var(--accent-cyan)' },
  { id: 'food_stop', label: 'Food stop', icon: Coffee, color: 'var(--status-arrived)' },
  { id: 'reached', label: 'Reached', icon: CheckCircle, color: 'var(--status-live)' },
  { id: 'meet_here', label: "Let's meet here", icon: Navigation, color: 'var(--accent-primary)' }
];

export const SquadChatDrawer: React.FC<SquadChatDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  currentUserId,
  onSendMessage
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleQuickAction = (qa: { id: QuickActionType; label: string }) => {
    onSendMessage(qa.label, qa.id);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 17, 0.78)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 'var(--z-bottom-sheet)',
        display: 'flex',
        justifyContent: 'flex-end'
      }}
      onClick={onClose}
    >
      <div
        className="animate-slide-up"
        style={{
          width: '100%',
          maxWidth: '420px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-elevated)',
          borderLeft: '1px solid var(--border-medium)',
          boxShadow: 'var(--shadow-elevated)'
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Squad Radio Drawer"
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--bg-primary)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(0, 102, 255, 0.15)',
                border: '1px solid rgba(0, 102, 255, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <MessageSquare size={18} color="var(--accent-cyan)" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                  Convoy Radio
                </h3>
                <span className="status-beacon-live" style={{ width: '6px', height: '6px' }} title="Live GPS Channel" />
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                Real-Time Channel
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-icon"
            aria-label="Close radio drawer"
            style={{ width: '34px', height: '34px', color: 'var(--text-secondary)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Action Chips Bar */}
        <div
          style={{
            padding: '10px 16px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            backgroundColor: 'var(--bg-surface)'
          }}
        >
          {QUICK_ACTIONS.map((qa) => {
            const Icon = qa.icon;
            return (
              <button
                key={qa.id}
                type="button"
                onClick={() => handleQuickAction(qa)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '11px',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  backgroundColor: 'rgba(10, 15, 29, 0.7)',
                  color: qa.color,
                  border: `1px solid ${qa.color}44`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={13} />
                <span>{qa.label}</span>
              </button>
            );
          })}
        </div>

        {/* Messages Feed */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            backgroundColor: 'var(--bg-canvas)'
          }}
        >
          {messages.length === 0 ? (
            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', maxWidth: '240px', lineHeight: 1.5 }}>
              No radio messages yet. Tap a quick status above or type a message to coordinate with the convoy!
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === currentUserId;
              const isAlert = msg.type === 'alert' || msg.type === 'quick_action';

              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                    maxWidth: '85%'
                  }}
                >
                  {!isMe && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        marginBottom: '3px',
                        paddingLeft: '2px',
                        maxWidth: '100%'
                      }}
                    >
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          color: msg.senderColor || 'var(--accent-cyan)',
                          letterSpacing: '0.2px'
                        }}
                      >
                        {msg.senderName && msg.senderName.trim().length > 14
                          ? `${msg.senderName.trim().substring(0, 12)}...`
                          : (msg.senderName || 'Rider')}
                      </span>
                      <span className="font-mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                  )}

                  {isMe && (
                    <div
                      className="font-mono"
                      style={{
                        fontSize: '10px',
                        color: 'var(--text-muted)',
                        marginBottom: '3px',
                        alignSelf: 'flex-end',
                        paddingRight: '2px'
                      }}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </div>
                  )}

                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: isMe
                        ? 'linear-gradient(135deg, #0066FF 0%, #0052CC 100%)'
                        : isAlert
                        ? 'var(--bg-surface)'
                        : 'var(--bg-elevated)',
                      color: '#FFFFFF',
                      border: isAlert
                        ? `1.5px solid ${msg.senderColor || 'var(--status-warning)'}`
                        : isMe
                        ? '1px solid rgba(255, 255, 255, 0.2)'
                        : '1px solid var(--border-subtle)',
                      fontWeight: isAlert ? 700 : 500,
                      fontSize: '14px',
                      boxShadow: 'var(--shadow-sm)',
                      wordBreak: 'break-word'
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <form
          onSubmit={handleSend}
          style={{
            padding: '14px 16px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            gap: '8px',
            backgroundColor: 'var(--bg-surface)'
          }}
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Broadcast a radio message..."
            className="input-base"
            style={{
              flex: 1,
              padding: '10px 14px',
              fontSize: '14px'
            }}
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="btn-primary"
            aria-label="Send radio message"
            style={{ padding: '10px 15px' }}
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
