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
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [permissionError, setPermissionError] = useState<string>('');

  useEffect(() => {
    // Initialize the scanner when component mounts
    initializeScanner();

    // Set a fallback timeout in case initialization hangs
    const fallbackTimeout = setTimeout(() => {
      if (hasPermission === null) {
        console.log('Initialization taking too long, trying fallback...');
        initializeFallback();
      }
    }, 15000); // 15 second fallback

    return () => {
      // Cleanup when component unmounts
      clearTimeout(fallbackTimeout);
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
      console.log('Starting camera initialization...');

      // Set a timeout for the entire initialization process
      const initTimeout = setTimeout(() => {
        setHasPermission(false);
        setPermissionError('Camera initialization timed out. Please refresh the page and try again.');
        onError?.('Camera initialization timed out');
      }, 10000); // 10 second timeout

      try {
        // Skip permission query for now as it can hang in some browsers
        // Just try to create the reader and get devices directly
        console.log('Creating BrowserMultiFormatReader...');
        readerRef.current = new BrowserMultiFormatReader();

        // Configure the reader for better barcode detection
        const hints = new Map();
        // Enable multiple barcode formats for better compatibility
        hints.set(2, true); // ASSUME_GS1
        hints.set(3, true); // TRY_HARDER - more thorough scanning
        hints.set(4, true); // PURE_BARCODE
        readerRef.current.hints = hints;

        console.log('Getting video input devices...');
        // Get available video devices with timeout
        const videoDevices = await Promise.race([
          readerRef.current.listVideoInputDevices(),
          new Promise<MediaDeviceInfo[]>((_, reject) =>
            setTimeout(() => reject(new Error('Device enumeration timeout')), 5000)
          )
        ]);

        console.log('Found video devices:', videoDevices.length);
        setDevices(videoDevices);

        if (videoDevices.length === 0) {
          clearTimeout(initTimeout);
          setHasPermission(false);
          setPermissionError('No camera devices found. Please ensure a camera is connected and refresh the page.');
          return;
        }

        // Prefer back camera if available
        const backCamera = videoDevices.find(device =>
          device.label.toLowerCase().includes('back') ||
          device.label.toLowerCase().includes('rear') ||
          device.label.toLowerCase().includes('environment')
        );

        const selectedDevice = backCamera?.deviceId || videoDevices[0]?.deviceId || '';
        setSelectedDeviceId(selectedDevice);

        clearTimeout(initTimeout);
        setHasPermission(true);

        console.log('ZXing scanner initialized successfully with', videoDevices.length, 'devices');
      } catch (deviceError) {
        clearTimeout(initTimeout);
        throw deviceError;
      }

    } catch (error) {
      console.error('Failed to initialize scanner:', error);
      setHasPermission(false);

      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          setPermissionError('Camera access denied. Please allow camera permissions and refresh the page.');
        } else if (error.name === 'NotFoundError') {
          setPermissionError('No camera found. Please ensure a camera is connected.');
        } else if (error.name === 'NotSupportedError') {
          setPermissionError('Camera not supported by this browser. Try Chrome, Firefox, or Safari.');
        } else if (error.message.includes('timeout')) {
          setPermissionError('Camera initialization timed out. Please refresh the page and try again.');
        } else {
          setPermissionError(`Camera error: ${error.message}`);
        }
      } else {
        setPermissionError('Failed to initialize camera. Please refresh the page and try again.');
      }

      onError?.(permissionError);
    }
  };

  const startScanning = async () => {
    if (!readerRef.current || !videoRef.current || isScanning || hasPermission === false) {
      return;
    }

    try {
      setIsScanning(true);
      console.log('Starting ZXing scanner...');

      // Configure video constraints for better barcode scanning
      const constraints = {
        video: {
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
          facingMode: selectedDeviceId ? undefined : 'environment',
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          focusMode: 'continuous',
          // Enable autofocus for better barcode detection
          advanced: [
            { focusMode: 'continuous' },
            { exposureMode: 'continuous' },
            { whiteBalanceMode: 'continuous' }
          ]
        }
      };

      // Start decoding from video device with enhanced settings
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
      setHasPermission(true);
    } catch (error) {
      console.error('Failed to start scanning:', error);
      setIsScanning(false);
      setHasPermission(false);

      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          setPermissionError('Camera access denied. Please allow camera permissions and try again.');
        } else if (error.name === 'NotFoundError') {
          setPermissionError('Camera not found. Please check your camera connection.');
        } else {
          setPermissionError(`Camera error: ${error.message}`);
        }
      } else {
        setPermissionError('Failed to start camera. Please try again.');
      }

      onError?.(permissionError);
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

  const requestPermission = async () => {
    try {
      setPermissionError('');
      setHasPermission(null);

      console.log('Requesting camera permission...');

      // Request camera access with timeout
      const stream = await Promise.race([
        navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        }),
        new Promise<MediaStream>((_, reject) =>
          setTimeout(() => reject(new Error('Permission request timeout')), 8000)
        )
      ]);

      console.log('Camera permission granted');

      // Stop the stream immediately as we just needed to get permission
      stream.getTracks().forEach(track => track.stop());

      // Reinitialize the scanner
      await initializeScanner();
    } catch (error) {
      console.error('Permission request failed:', error);
      setHasPermission(false);

      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          setPermissionError('Camera access denied. Please enable camera permissions in your browser settings and refresh the page.');
        } else if (error.message.includes('timeout')) {
          setPermissionError('Permission request timed out. Please refresh the page and try again.');
        } else {
          setPermissionError(`Permission error: ${error.message}`);
        }
      }
    }
  };

  // Fallback initialization method
  const initializeFallback = async () => {
    try {
      console.log('Trying fallback initialization...');
      setHasPermission(null);
      setPermissionError('');

      // Simple approach - just try to get user media directly
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      // Stop the stream
      stream.getTracks().forEach(track => track.stop());

      // Create reader without device enumeration
      readerRef.current = new BrowserMultiFormatReader();
      setSelectedDeviceId(''); // Use default device
      setHasPermission(true);

      console.log('Fallback initialization successful');
    } catch (error) {
      console.error('Fallback initialization failed:', error);
      setHasPermission(false);
      setPermissionError('Camera initialization failed. Please check your camera permissions and refresh the page.');
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

        {/* Permission Error Overlay */}
        {hasPermission === false && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-90 text-white">
            <div className="text-center p-6 max-w-sm">
              <svg className="w-16 h-16 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3l18 18"></path>
              </svg>
              <h3 className="text-lg font-semibold mb-2">Camera Access Required</h3>
              <p className="text-sm text-gray-300 mb-4">{permissionError}</p>

              <div className="space-y-3">
                <button
                  onClick={requestPermission}
                  className="w-full px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
                >
                  Request Camera Access
                </button>

                <button
                  onClick={initializeFallback}
                  className="w-full px-4 py-2 bg-secondary hover:bg-secondary-dark text-white rounded-lg transition-colors"
                >
                  Try Simple Mode
                </button>

                <button
                  onClick={() => window.location.reload()}
                  className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Refresh Page
                </button>

                <div className="text-xs text-gray-400">
                  <p className="mb-2">Manual steps:</p>
                  <ol className="text-left space-y-1">
                    <li>1. Click the camera icon in your browser's address bar</li>
                    <li>2. Select "Allow" for camera access</li>
                    <li>3. Click "Refresh Page" above</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {hasPermission === null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 text-white">
            <div className="text-center p-6">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
              <p className="text-lg mb-2">Initializing camera...</p>
              <p className="text-sm text-gray-300 mb-4">This may take a few seconds</p>

              <div className="space-y-2">
                <button
                  onClick={initializeFallback}
                  className="px-4 py-2 bg-secondary hover:bg-secondary-dark text-white rounded-lg transition-colors text-sm"
                >
                  Try Simple Mode
                </button>

                <p className="text-xs text-gray-400">
                  If this takes too long, click "Try Simple Mode"
                </p>
              </div>
            </div>
          </div>
        )}

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
