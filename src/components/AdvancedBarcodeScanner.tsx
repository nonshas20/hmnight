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
      console.log('Starting ZXing scanner...');

      // Start decoding from video device
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

      console.log('ZXing scanner started successfully');
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
      <div className="relative mb-8 rounded-lg overflow-hidden bg-black aspect-video max-w-lg mx-auto shadow-lg border border-white/10">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />

        {/* Scanning Overlay */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Corner markers */}
          <div className="absolute top-4 left-4 w-8 h-8 border-l-4 border-t-4 border-primary"></div>
          <div className="absolute top-4 right-4 w-8 h-8 border-r-4 border-t-4 border-primary"></div>
          <div className="absolute bottom-4 left-4 w-8 h-8 border-l-4 border-b-4 border-primary"></div>
          <div className="absolute bottom-4 right-4 w-8 h-8 border-r-4 border-b-4 border-primary"></div>
          
          {/* Scanning line animation */}
          {isScanning && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-0.5 bg-primary animate-pulse"></div>
            </div>
          )}
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

      {/* Scanner Status */}
      <div className="text-center">
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
          isScanning 
            ? 'bg-green-900/20 text-green-300 border border-green-500/30' 
            : 'bg-gray-900/20 text-gray-300 border border-gray-500/30'
        }`}>
          <div className={`w-2 h-2 rounded-full mr-2 ${
            isScanning ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
          }`}></div>
          {isScanning ? 'Scanning...' : 'Ready'}
        </div>
      </div>
    </div>
  );
}
