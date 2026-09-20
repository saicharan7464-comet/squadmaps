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
  { id: 'wait_for_me', label: 'Wait for me', icon: Clock, color: 'var(--accent-amber)' },
  { id: 'stopping', label: 'I am stopping', icon: AlertTriangle, color: 'var(--accent-red)' },
  { id: 'fuel_stop', label: 'Fuel stop', icon: Fuel, color: 'var(--accent-cyan)' },
  { id: 'food_stop', label: 'Food stop', icon: Coffee, color: 'var(--accent-purple)' },
  { id: 'reached', label: 'Reached', icon: CheckCircle, color: 'var(--accent-green)' },
  { id: 'meet_here', label: 'Let\'s meet here', icon: Navigation, color: 'var(--accent-cyan)' }
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
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 'var(--z-bottom-sheet)',
        display: 'flex',
        justifyContent: 'flex-end'
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel animate-slide-up"
        style={{
          width: '100%',
          maxWidth: '420px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-secondary)',
          borderLeft: '1px solid var(--border-medium)',
          borderRadius: 0
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={20} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#FFFFFF' }}>Squad Radio</h3>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Quick Action Chips Bar */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            scrollbarWidth: 'none'
          }}
        >
          {QUICK_ACTIONS.map((qa) => {
            const Icon = qa.icon;
            return (
              <button
                key={qa.id}
                onClick={() => handleQuickAction(qa)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  backgroundColor: 'var(--bg-card)',
                  color: qa.color,
                  border: `1px solid ${qa.color}44`,
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <Icon size={14} />
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
            gap: '12px'
          }}
        >
          {messages.length === 0 ? (
            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No messages yet. Send a quick action or chat to coordinate with your squad!
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
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      marginBottom: '3px',
                      alignSelf: isMe ? 'flex-end' : 'flex-start'
                    }}
                  >
                    {!isMe && <strong>{msg.senderName} • </strong>}
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </div>

                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: isMe
                        ? 'var(--accent-cyan)'
                        : isAlert
                        ? 'var(--bg-card)'
                        : 'var(--bg-tertiary)',
                      color: isMe ? 'var(--text-inverse)' : '#FFFFFF',
                      border: isAlert ? `1px solid ${msg.senderColor || 'var(--accent-amber)'}` : 'none',
                      fontWeight: isAlert ? 700 : 500,
                      fontSize: '14px',
                      boxShadow: 'var(--shadow-sm)'
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
            gap: '8px'
          }}
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-medium)',
              color: '#FFFFFF',
              fontSize: '14px',
              outline: 'none'
            }}
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="btn-primary"
            style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
