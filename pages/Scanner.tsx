import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, AlertTriangle } from 'lucide-react';

// Layout Components (Panel is now imported)
import Page from '../components/layout/Page';
import Panel from '../components/layout/Panel';

import Button from '../components/ui/Button';

// Declare external library type
declare const Html5Qrcode: any;

const Scanner: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const scannerRef = useRef<any>(null);
  const isMounted = useRef(true);

  // --- useEffect (Camera and Cleanup Logic) ---
  useEffect(() => {
    isMounted.current = true;

    if (typeof Html5Qrcode === 'undefined') {
      setError('Scanner library not loaded. Please refresh.');
      setIsLoading(false);
      return;
    }

    const onScanSuccess = (decodedText: string) => {
      if (!isMounted.current) return;

      const regex = /(?:items?|conditions?|powers?)\/([a-zA-Z0-9#]+)/i;
      const match = decodedText.match(regex);

      if (match) {
        if (scannerRef.current) {
          scannerRef.current.stop().then(() => {
            scannerRef.current.clear();
          }).catch((err: any) => console.warn("Stop failed", err));
        }

        const lowerText = decodedText.toLowerCase();
        const id = match[1];

        let path = '';
        if (lowerText.includes('item')) {
          path = `/items/${id}`;
        } else if (lowerText.includes('condition')) {
          path = `/conditions/${id}`;
        } else if (lowerText.includes('power')) {
          path = `/powers/${id}`;
        }

        if (path) {
          navigate(path);
        } else {
          setError(`Unknown type in QR: ${decodedText}`);
        }
      }
    };

    const startScanner = async () => {
      try {
        // The "reader" div is now inside the Panel body
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          },
          onScanSuccess,
          () => {}
        );

        if (isMounted.current) {
          setIsLoading(false);
        }
      } catch (err: any) {
        console.error("Error starting scanner", err);
        if (isMounted.current) {
          let msg = "Failed to start camera.";
          if (err?.name === 'NotAllowedError' || err?.toString().includes("Permission")) {
            msg = "Camera permission denied. Please allow camera access in your browser settings.";
          } else if (err?.name === 'NotFoundError') {
            msg = "No camera found on this device.";
          } else if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
            msg = "Camera access requires a secure connection (HTTPS).";
          }
          setError(msg);
          setIsLoading(false);
        }
      }
    };

    const timer = setTimeout(startScanner, 100);

    // --- CLEANUP ---
    return () => {
      isMounted.current = false;
      clearTimeout(timer);
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().then(() => {
              scannerRef.current.clear();
            }).catch((e: any) => console.warn("Cleanup stop error", e));
          } else {
            scannerRef.current.clear();
          }
        } catch (e) {
          console.warn("Cleanup error", e);
        }
      }
    };
  }, [navigate]);

  // --- Header Definition for Panel ---
  const headerLeftContent = (
    <div className="w-10 h-10"></div>
  );

  // Empty content to maintain layout symmetry.
  const headerRightContent = (
    <div className="w-10 h-10"></div>
  );

  const title = 'SCAN CODE';

  // --- Render ---
  return (
    <Page maxWidth="md">
      {/* Button row above panel (as seen in CreateNote/MyNotes) */}
      <div className="flex w-full justify-start mb-3">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          <ArrowLeft size={16}/>
        </Button>
      </div>

      {/* Panel Wrapper */}
      <Panel
        title={title}
        headerLeftContent={headerLeftContent}
        headerRightContent={headerRightContent}
        // Use an empty string for Panel's body padding to maximize scanner area
        className={"p-0"}
      >
        {/* Scanner Area: Maximize the square size within the Panel's body */}
        {/* mx-auto centers the scanner area */}
        <div className="w-full max-w-lg bg-black rounded-lg overflow-hidden shadow-xl relative aspect-square border-2 border-gray-800 mx-auto">
          {/* Scan Area - The library attaches video element here */}
          <div id="reader" className="w-full h-full"></div>

          {/* Overlay Loader or Error Message */}
          {(isLoading || error) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center bg-black/80 z-10">
              {error ? (
                <>
                  <AlertTriangle size={48} className="mb-4 text-red-500" />
                  <p className="font-bold mb-2">Scanner Error</p>
                  <p className="text-sm text-gray-300">{error}</p>
                </>
              ) : (
                <>
                  <Loader2 size={48} className="mb-4 animate-spin text-blue-500" />
                  <p>Starting Camera...</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Instructions below the scanner, still inside the Panel, but with custom padding */}
        <div className="mt-4 pb-4 text-center px-4">
          <p className="text-gray-600 dark:text-gray-400 font-serif text-sm">
            Point your camera at a VoidDex QR code.
          </p>
        </div>
      </Panel>
    </Page>
  );
};

export default Scanner;