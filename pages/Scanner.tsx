import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, AlertTriangle } from 'lucide-react';
import Button from '../components/ui/Button';

// Declare external library type (Html5Qrcode is loaded via script tag in index.html)
declare const Html5Qrcode: any;

const Scanner: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const scannerRef = useRef<any>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    
    // Safety check: Library must be loaded globally
    if (typeof Html5Qrcode === 'undefined') {
        setError('Scanner library not loaded. Please refresh.');
        setIsLoading(false);
        return;
    }

    const onScanSuccess = (decodedText: string) => {
        if (!isMounted.current) return;

        // --- QR PARSING LOGIC ---
        // Expects QR codes containing URLs or relative paths like:
        // "https://voiddex.app/items/1234" OR "condition/9999"
        // Regex captures the ID after the type keyword.
        const regex = /(?:items?|conditions?|powers?)\/([a-zA-Z0-9#]+)/i;
        const match = decodedText.match(regex);

        if (match) {
            // Stop scanning immediately upon success to prevent multiple redirects
            if (scannerRef.current) {
                scannerRef.current.stop().then(() => {
                     scannerRef.current.clear();
                }).catch((err: any) => console.warn("Stop failed", err));
            }

            const lowerText = decodedText.toLowerCase();
            const id = match[1];
            
            // Route based on keyword found
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
            const html5QrCode = new Html5Qrcode("reader");
            scannerRef.current = html5QrCode;

            // Use facingMode: "environment" to force back camera on mobile
            await html5QrCode.start(
                { facingMode: "environment" }, 
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0
                },
                onScanSuccess,
                () => {
                    // Ignore frame scan errors (they happen constantly when no QR is in view)
                }
            );
            
            if (isMounted.current) {
                setIsLoading(false);
            }
        } catch (err: any) {
            console.error("Error starting scanner", err);
            if (isMounted.current) {
                let msg = "Failed to start camera.";
                // Common permission errors
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

    // Small delay ensures the "reader" DIV is rendered in the DOM before the library tries to attach to it.
    const timer = setTimeout(startScanner, 100);

    // --- CLEANUP ---
    return () => {
        isMounted.current = false;
        clearTimeout(timer);
        if (scannerRef.current) {
             // Attempt to stop camera stream to release hardware resource.
             // stop() returns a promise, but we can't await it in cleanup reliably.
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

  return (
    <div className="flex flex-col items-center justify-start min-h-[80vh] px-4 pt-4">
       <div className="w-full max-w-md mb-4 flex justify-between items-center">
         <Button variant="secondary" onClick={() => navigate('/')}>
            <ArrowLeft size={16} className="mr-2"/> Back
         </Button>
         <h2 className="text-xl font-display font-bold text-gray-800 dark:text-white">Scan Code</h2>
         <div className="w-10"></div>
       </div>

       <div className="w-full max-w-md bg-black rounded-lg overflow-hidden shadow-xl relative aspect-square border-2 border-gray-800">
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

       <div className="mt-6 text-center max-w-xs">
           <p className="text-gray-600 dark:text-gray-400 font-serif text-sm">
             Point your camera at a VoidDex QR code.
           </p>
       </div>
    </div>
  );
};

export default Scanner;