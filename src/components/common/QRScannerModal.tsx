import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, Image, X, AlertCircle, RefreshCw } from 'lucide-react';
import { parseSquadId } from '../../utils/inviteUrl';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (squadId: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess
}) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const elementId = 'squadnav-qr-reader';

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setErrorMsg(null);

    const startScanner = async () => {
      try {
        // Wait a tick for the container DOM node to render
        await new Promise((r) => setTimeout(r, 100));
        if (!isMounted) return;

        const html5QrCode = new Html5Qrcode(elementId);
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode },
          {
            fps: 15,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          },
          (decodedText) => {
            const detectedId = parseSquadId(decodedText);
            if (detectedId) {
              // Stop camera and trigger success
              html5QrCode.stop().then(() => {
                html5QrCode.clear();
                onScanSuccess(detectedId);
              }).catch(() => {
                onScanSuccess(detectedId);
              });
            } else {
              setErrorMsg(`Scanned QR code is not a valid squad link: ${decodedText.substring(0, 30)}...`);
            }
          },
          () => {
            // Frame scan failure is normal when QR code is not in frame
          }
        );

        if (isMounted) {
          setIsScanning(true);
        }
      } catch (err: any) {
        console.warn('QR Camera scan error:', err);
        if (isMounted) {
          setHasCamera(false);
          setErrorMsg(
            err?.message?.includes('NotAllowedError') || err?.name === 'NotAllowedError'
              ? 'Camera permission was denied. Please allow camera access in browser settings or upload an image.'
              : 'Could not start camera. You can upload an image of the QR code below.'
          );
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().then(() => scannerRef.current?.clear()).catch(() => {});
          } else {
            scannerRef.current.clear();
          }
        } catch {
          // ignore cleanup errors
        }
        scannerRef.current = null;
      }
    };
  }, [isOpen, facingMode]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let scanner = scannerRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode(elementId);
        scannerRef.current = scanner;
      }

      if (scanner.isScanning) {
        await scanner.stop();
      }

      const decodedText = await scanner.scanFile(file, true);
      const detectedId = parseSquadId(decodedText);
      if (detectedId) {
        onScanSuccess(detectedId);
      } else {
        setErrorMsg('QR code in image does not contain a valid Squad link.');
      }
    } catch (err) {
      setErrorMsg('No QR code could be detected in the uploaded image.');
    }
  };

  const toggleCamera = () => {
    if (scannerRef.current?.isScanning) {
      scannerRef.current.stop().catch(() => {}).finally(() => {
        setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
      });
    } else {
      setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 'var(--z-modal)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel animate-fade-in"
        style={{
          maxWidth: '440px',
          width: '100%',
          padding: '24px',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-medium)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="btn-icon"
          style={{ position: 'absolute', top: '16px', right: '16px', width: '36px', height: '36px' }}
        >
          <X size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <Camera size={20} color="var(--accent-cyan)" />
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF' }}>Scan Squad QR Code</h3>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '18px' }}>
          Point your camera at the Squad QR code on the host's screen
        </p>

        {/* Viewfinder Video Container */}
        <div
          style={{
            position: 'relative',
            width: '280px',
            height: '280px',
            borderRadius: '16px',
            overflow: 'hidden',
            backgroundColor: '#05070A',
            border: '2px solid var(--accent-cyan)',
            boxShadow: '0 0 20px rgba(0, 240, 255, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div id={elementId} style={{ width: '100%', height: '100%' }} />

          {/* Viewfinder Target Reticle */}
          <div
            style={{
              position: 'absolute',
              inset: '24px',
              border: '2px dashed rgba(0, 240, 255, 0.5)',
              borderRadius: '12px',
              pointerEvents: 'none',
              boxShadow: 'inset 0 0 15px rgba(0, 240, 255, 0.15)'
            }}
          />

          {/* Animated Scanning Laser Line */}
          {isScanning && (
            <div
              style={{
                position: 'absolute',
                left: '20px',
                right: '20px',
                height: '2px',
                background: 'linear-gradient(90deg, transparent, var(--accent-cyan), transparent)',
                boxShadow: '0 0 8px var(--accent-cyan)',
                animation: 'pulseGreen 2s infinite ease-in-out',
                pointerEvents: 'none'
              }}
            />
          )}
        </div>

        {/* Error / Alert notice */}
        {errorMsg && (
          <div
            style={{
              marginTop: '14px',
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 61, 113, 0.15)',
              border: '1px solid var(--accent-red)',
              color: '#FF6B8B',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%'
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Controls: Switch Camera & Upload Photo */}
        <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '18px' }}>
          {hasCamera && (
            <button
              onClick={toggleCamera}
              className="btn-secondary"
              style={{ flex: 1, padding: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              title="Flip camera"
            >
              <RefreshCw size={15} />
              <span>Flip Camera</span>
            </button>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary"
            style={{ flex: 1, padding: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Image size={15} color="var(--accent-cyan)" />
            <span>Upload Image</span>
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
      </div>
    </div>
  );
};
