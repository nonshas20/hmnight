'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

interface AdvancedBarcodeScannerProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
  isActive: boolean;
}

export default function AdvancedBarcodeScanner({ onScan, onError, isActive }: AdvancedBarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [streamRef, setStreamRef] = useState<MediaStream | null>(null);

  useEffect(() => {
    // Initialize the scanner when component mounts
    initializeScanner();

    return () => {
      // Cleanup when component unmounts
      stopScanning();
    };
  }, []);

  useEffect(() => {
    if (isActive && !isScanning) {
      startScanning();
    } else if (!isActive && isScanning) {
      stopScanning();
    }
  }, [isActive]);

  const initializeScanner = async () => {
    try {
      // Create a new reader instance
      readerRef.current = new BrowserMultiFormatReader();
      
      // Get available video devices
      const videoDevices = await readerRef.current.listVideoInputDevices();
      setDevices(videoDevices);
      
      // Prefer back camera if available
      const backCamera = videoDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear') ||
        device.label.toLowerCase().includes('environment')
      );
      
      setSelectedDeviceId(backCamera?.deviceId || videoDevices[0]?.deviceId || '');
      
      console.log('ZXing scanner initialized with devices:', videoDevices.length);
    } catch (error) {
      console.error('Failed to initialize scanner:', error);
      onError?.('Failed to initialize camera');
    }
  };

  const startScanning = async () => {
    if (!readerRef.current || !videoRef.current || isScanning) {
      return;
    }

    try {
      setIsScanning(true);
      console.log('Starting ZXing scanner optimized for small barcodes...');

      // Enhanced constraints for small barcode scanning
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          focusMode: 'continuous',
          ...(zoomLevel > 1 && { zoom: zoomLevel } as any)
        }
      };

      // Get media stream with enhanced settings
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoRef.current.srcObject = stream;
      setStreamRef(stream);

      // Start decoding with optimized settings for small barcodes
      await readerRef.current.decodeFromVideoDevice(
        selectedDeviceId || null,
        videoRef.current,
        (result, error) => {
          if (result) {
            console.log('Barcode detected:', result.getText());
            onScan(result.getText());
          }

          if (error && !(error instanceof NotFoundException)) {
            console.error('Scan error:', error);
          }
        }
      );

      console.log('ZXing scanner started successfully with enhanced settings');
    } catch (error) {
      console.error('Failed to start scanning:', error);
      setIsScanning(false);
      onError?.('Failed to start camera');
    }
  };

  const stopScanning = () => {
    if (readerRef.current) {
      console.log('Stopping ZXing scanner...');
      readerRef.current.reset();
      setIsScanning(false);
      console.log('ZXing scanner stopped');
    }

    // Clean up stream
    if (streamRef) {
      streamRef.getTracks().forEach(track => track.stop());
      setStreamRef(null);
    }
  };

  const switchCamera = async (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    if (isScanning) {
      stopScanning();
      // Small delay to ensure cleanup
      setTimeout(() => {
        startScanning();
      }, 100);
    }
  };

  // Zoom control functions for small barcode scanning
  const handleZoomIn = async () => {
    if (streamRef && zoomLevel < 3) {
      const newZoom = Math.min(zoomLevel + 0.5, 3);
      setZoomLevel(newZoom);
      try {
        const track = streamRef.getVideoTracks()[0];
        if (track && 'applyConstraints' in track) {
          await track.applyConstraints({
            advanced: [{ zoom: newZoom } as any]
          });
        }
      } catch (error) {
        console.log('Zoom not supported on this device, will apply on next scan start');
      }
    }
  };

  const handleZoomOut = async () => {
    if (streamRef && zoomLevel > 1) {
      const newZoom = Math.max(zoomLevel - 0.5, 1);
      setZoomLevel(newZoom);
      try {
        const track = streamRef.getVideoTracks()[0];
        if (track && 'applyConstraints' in track) {
          await track.applyConstraints({
            advanced: [{ zoom: newZoom } as any]
          });
        }
      } catch (error) {
        console.log('Zoom not supported on this device, will apply on next scan start');
      }
    }
  };

  const handleFocusClick = async (event: React.MouseEvent<HTMLDivElement>) => {
    if (!streamRef) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    try {
      const track = streamRef.getVideoTracks()[0];
      if (track && 'applyConstraints' in track) {
        await track.applyConstraints({
          advanced: [{
            focusMode: 'single-shot',
            pointsOfInterest: [{ x, y }]
          } as any]
        });
      }
    } catch (error) {
      console.log('Manual focus not supported on this device');
    }
  };

  return (
    <div className="relative">
      {/* Camera Selection */}
      {devices.length > 1 && (
        <div className="mb-4">
          <select
            value={selectedDeviceId}
            onChange={(e) => switchCamera(e.target.value)}
            className="w-full p-2 rounded bg-gray-800 text-white border border-gray-600"
          >
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Video Element */}
      <div
        className="relative mb-8 rounded-lg overflow-hidden bg-black aspect-video max-w-lg mx-auto shadow-lg border border-white/10 cursor-crosshair"
        onClick={handleFocusClick}
        title="Tap to focus"
      >
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />

        {/* Enhanced Scanning Overlay for Small Barcodes */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Larger scanning area for small barcodes */}
          <div className="absolute inset-4 border-2 border-primary/50 rounded-lg">
            {/* Corner markers */}
            <div className="absolute -top-1 -left-1 w-6 h-6 border-l-4 border-t-4 border-primary"></div>
            <div className="absolute -top-1 -right-1 w-6 h-6 border-r-4 border-t-4 border-primary"></div>
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-l-4 border-b-4 border-primary"></div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-r-4 border-b-4 border-primary"></div>
          </div>

          {/* Scanning line animation */}
          {isScanning && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3/4 h-0.5 bg-primary animate-pulse shadow-lg"></div>
            </div>
          )}

          {/* Small barcode guidance */}
          <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            📱 For small barcodes: Use zoom controls
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-2 pointer-events-auto">
          <button
            onClick={handleZoomIn}
            disabled={zoomLevel >= 3}
            className="bg-black/70 text-white p-2 rounded-full disabled:opacity-50 hover:bg-black/90 transition-colors shadow-lg"
            title="Zoom In (Better for small barcodes)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
          <button
            onClick={handleZoomOut}
            disabled={zoomLevel <= 1}
            className="bg-black/70 text-white p-2 rounded-full disabled:opacity-50 hover:bg-black/90 transition-colors shadow-lg"
            title="Zoom Out"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
            </svg>
          </button>
          <div className="bg-black/70 text-white text-xs px-2 py-1 rounded text-center shadow-lg">
            {zoomLevel.toFixed(1)}x
          </div>
        </div>

        {/* Status Overlay */}
        {!isScanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 text-white">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
              <p>Camera initializing...</p>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Scanner Status */}
      <div className="text-center space-y-2">
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
          isScanning
            ? 'bg-green-900/20 text-green-300 border border-green-500/30'
            : 'bg-gray-900/20 text-gray-300 border border-gray-500/30'
        }`}>
          <div className={`w-2 h-2 rounded-full mr-2 ${
            isScanning ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
          }`}></div>
          {isScanning ? 'ZXing Scanner Active' : 'Ready to Scan'}
        </div>

        {/* Performance Tips */}
        <div className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          <p>📱 <strong>Small Barcode Tips:</strong></p>
          <p>• Use zoom controls for tiny phone barcodes</p>
          <p>• Tap screen to focus on barcode area</p>
          <p>• Ensure good lighting and steady hands</p>
          <p>• ZXing library optimized for small codes</p>
        </div>
      </div>
    </div>
  );
}
