import React from 'react';
import { Compass, Radio } from 'lucide-react';

export const AuthLoadingScreen: React.FC = () => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        gap: '20px'
      }}
    >
      <div style={{ position: 'relative' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-green))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 35px rgba(0, 240, 255, 0.45)',
            animation: 'pulseGlow 2s infinite ease-in-out'
          }}
        >
          <Compass size={36} color="#0A0E17" />
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px' }}>
          Squad<span className="text-cyan">Maps</span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '8px',
            fontSize: '12px',
            color: 'var(--text-secondary)'
          }}
        >
          <Radio size={14} className="text-cyan" />
          <span>Verifying secure session...</span>
        </div>
      </div>
    </div>
  );
};
