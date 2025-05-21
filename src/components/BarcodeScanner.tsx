'use client';

import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onError?: (error: any) => void;
}

export default function BarcodeScanner({ onScan, onError }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    const startScanner = async () => {
      if (!videoRef.current) return;

      try {
        setIsScanning(true);

        // Request camera permission
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });

        videoRef.current.srcObject = stream;
        setHasPermission(true);

        // Wait for video to be ready
        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = resolve;
          }
        });

        // Start playing the video
        if (videoRef.current) {
          videoRef.current.play();
        }

        // Use Quagga2 for barcode scanning
        const Quagga = (await import('@ericblade/quagga2')).default;

        Quagga.init({
          inputStream: {
            name: "Live",
            type: "LiveStream",
            target: videoRef.current,
            constraints: {
              facingMode: "environment",
            },
          },
          locator: {
            patchSize: "medium",
            halfSample: true
          },
          numOfWorkers: 2,
          decoder: {
            readers: ["code_128_reader", "ean_reader", "code_39_reader"]
          },
          locate: true
        }, (err) => {
          if (err) {
            if (onError) onError(err);
            setIsScanning(false);
            return;
          }

          Quagga.start();
          scannerRef.current = Quagga;

          Quagga.onDetected((result) => {
            if (result && result.codeResult && result.codeResult.code) {
              onScan(result.codeResult.code);
            }
          });
        });

      } catch (error) {
        console.error('Failed to start scanner:', error);
        if (onError) onError(error);
        setHasPermission(false);
        setIsScanning(false);
      }
    };

    startScanner();

    return () => {
      // Clean up
      if (scannerRef.current) {
        try {
          scannerRef.current.stop();
        } catch (e) {
          console.error('Error stopping scanner:', e);
        }
      }

      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
      }

      setIsScanning(false);
    };
  }, [onScan, onError]);

  return (
    <div className="relative w-full">
      <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        ></video>

        {hasPermission === false && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 text-white">
            <div className="text-center p-4">
              <svg className="w-12 h-12 mx-auto mb-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
              <p className="text-lg font-medium mb-2">Camera Access Denied</p>
              <p className="text-sm">Please allow camera access to scan barcodes</p>
            </div>
          </div>
        )}

        {hasPermission === null && !isScanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 text-white">
            <div className="text-center">
              <svg className="animate-spin w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p>Initializing camera...</p>
            </div>
          </div>
        )}

        {/* Scanning overlay with animated corners */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Top left corner */}
          <motion.div
            className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-primary"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />

          {/* Top right corner */}
          <motion.div
            className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-primary"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          />

          {/* Bottom left corner */}
          <motion.div
            className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-primary"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, delay: 1 }}
          />

          {/* Bottom right corner */}
          <motion.div
            className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-primary"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, delay: 1.5 }}
          />

          {/* Scanning line */}
          <motion.div
            className="absolute left-0 right-0 h-1 bg-primary bg-opacity-70"
            initial={{ top: '0%' }}
            animate={{ top: ['0%', '100%', '0%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>

      <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
        Position the barcode within the frame to scan
      </p>
    </div>
  );
}
