'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { getStudents, getStudentByBarcode, checkInStudent } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { Student } from '@/lib/supabase';

export default function CheckInPage() {
  const [mode, setMode] = useState<'scan' | 'manual'>('scan');
  const [isScanning, setIsScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastScannedStudent, setLastScannedStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<any>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    students,
    setStudents,
    updateStudent,
    filteredStudents,
    setSearchQuery: setStoreSearchQuery,
    addStudent
  } = useAppStore();

  useEffect(() => {
    // Load students on mount
    const loadStudents = async () => {
      setIsLoading(true);
      try {
        const data = await getStudents();
        setStudents(data);
      } catch (error) {
        console.error('Error loading students:', error);
        toast.error('Failed to load student data');
      } finally {
        setIsLoading(false);
      }
    };

    loadStudents();

    // Clean up scanner on unmount
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop();
        } catch (e) {
          console.error('Error stopping scanner:', e);
        }
      }

      // Clear any pending search timeouts
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [setStudents]);

  // Debounced search to prevent too many state updates
  useEffect(() => {
    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setIsSearching(true);

    // Set a new timeout
    searchTimeoutRef.current = setTimeout(() => {
      setStoreSearchQuery(searchQuery);
      setIsSearching(false);
    }, 300); // 300ms debounce

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, setStoreSearchQuery]);

  const startScanner = async () => {
    if (!videoRef.current) {
      console.error('Video element not available');
      toast.error('Camera element not ready. Please try again.');
      return;
    }

    try {
      setIsScanning(true);

      // Stop any existing streams first
      if (videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }

      // Request camera access with more specific options
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      // Double check that videoRef is still valid
      if (!videoRef.current) {
        console.error('Video element no longer available after getting stream');
        stream.getTracks().forEach(track => track.stop());
        setIsScanning(false);
        return;
      }

      videoRef.current.srcObject = stream;

      // Wait for video to be fully loaded and ready
      await new Promise<void>((resolve) => {
        if (!videoRef.current) {
          resolve();
          return;
        }

        // Set up event handlers for video loading
        const handleLoadedMetadata = () => {
          console.log('Video metadata loaded');
          videoRef.current?.play()
            .then(() => {
              console.log('Video playback started');
              setTimeout(resolve, 500); // Add a small delay to ensure video is rendering
            })
            .catch(e => {
              console.error('Error playing video:', e);
              resolve();
            });
        };

        // Check if video is already ready
        if (videoRef.current.readyState >= 2) {
          handleLoadedMetadata();
        } else {
          videoRef.current.onloadedmetadata = handleLoadedMetadata;
        }
      });

      // Double check again that videoRef is still valid
      if (!videoRef.current || !videoRef.current.videoWidth) {
        console.error('Video element not properly initialized');
        if (videoRef.current?.srcObject) {
          const currentStream = videoRef.current.srcObject as MediaStream;
          currentStream.getTracks().forEach(track => track.stop());
        }
        setIsScanning(false);
        toast.error('Camera not properly initialized. Please try again.');
        return;
      }

      // Dynamically import Quagga to avoid SSR issues
      const Quagga = (await import('@ericblade/quagga2')).default;

      // Create a wrapper div for Quagga to use instead of directly using the video element
      // This helps prevent the "Cannot read properties of null (reading 'x')" error
      const videoContainer = videoRef.current.parentElement;
      if (!videoContainer) {
        console.error('Video container not found');
        toast.error('Scanner initialization failed. Please try again.');
        setIsScanning(false);
        return;
      }

      // More robust configuration with simpler settings to avoid errors
      Quagga.init({
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: videoContainer, // Use the container instead of the video element
          constraints: {
            facingMode: "environment",
          },
          area: { // Only search for barcodes in the center of the video
            top: "30%",
            right: "15%",
            left: "15%",
            bottom: "30%",
          },
        },
        locator: {
          patchSize: "large", // Use larger patches for more stability
          halfSample: true
        },
        numOfWorkers: 1, // Use fewer workers for stability
        frequency: 5, // Lower frequency for better performance
        decoder: {
          readers: [
            "code_128_reader",
            "ean_reader"
          ]
        },
        locate: true
      }, function(err) {
        if (err) {
          console.error('Scanner error:', err);
          toast.error('Failed to initialize scanner: ' + (err.message || 'Unknown error'));

          // Try with even simpler configuration as fallback
          try {
            // Use a timeout to ensure DOM is ready
            setTimeout(() => {
              if (!videoRef.current || !videoRef.current.parentElement) {
                console.error('Video element or container no longer available');
                setIsScanning(false);
                return;
              }

              Quagga.init({
                inputStream: {
                  name: "Live",
                  type: "LiveStream",
                  target: videoRef.current.parentElement,
                  constraints: {
                    width: 640,
                    height: 480,
                  }
                },
                locator: {
                  patchSize: "large",
                  halfSample: true
                },
                numOfWorkers: 1,
                decoder: {
                  readers: ["code_128_reader"]
                },
                locate: false // Disable locating for maximum compatibility
              }, function(fallbackErr) {
                if (fallbackErr) {
                  console.error('Fallback scanner error:', fallbackErr);
                  toast.error('Could not initialize scanner. Please try manual check-in.');
                  setIsScanning(false);
                  return;
                }

                console.log('Fallback scanner initialized successfully');
                Quagga.start();
                scannerRef.current = Quagga;

                Quagga.onDetected((result) => {
                  if (result && result.codeResult && result.codeResult.code) {
                    handleScan(result.codeResult.code);
                  }
                });
              });
            }, 1000);
          } catch (fallbackInitError) {
            console.error('Error in fallback initialization:', fallbackInitError);
            setIsScanning(false);
          }
          return;
        }

        console.log('Scanner initialized successfully');
        Quagga.start();
        scannerRef.current = Quagga;

        Quagga.onDetected((result) => {
          if (result && result.codeResult && result.codeResult.code) {
            handleScan(result.codeResult.code);
          }
        });
      });

    } catch (error) {
      console.error('Failed to start scanner:', error);
      toast.error('Failed to start barcode scanner: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setIsScanning(false);
    }
  };

  const stopScanner = () => {
    console.log('Stopping scanner...');

    // First set the scanning state to false
    setIsScanning(false);

    // Stop Quagga scanner if it exists
    if (scannerRef.current) {
      try {
        console.log('Stopping Quagga instance');
        scannerRef.current.stop();
        scannerRef.current = null;
      } catch (e) {
        console.error('Error stopping scanner:', e);
      }
    }

    // Stop the video stream
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        console.log('Stopping video stream');
        const stream = videoRef.current.srcObject as MediaStream;
        const tracks = stream.getTracks();
        tracks.forEach(track => {
          try {
            track.stop();
          } catch (trackError) {
            console.error('Error stopping track:', trackError);
          }
        });
        videoRef.current.srcObject = null;
        videoRef.current.removeAttribute('src'); // For older browsers
        videoRef.current.load(); // Reset the video element
      }
    } catch (streamError) {
      console.error('Error stopping video stream:', streamError);
    }

    console.log('Scanner stopped');
  };

  const toggleMode = () => {
    console.log('Toggling mode from', mode);

    if (mode === 'scan') {
      // First stop the scanner completely
      stopScanner();
      // Then change the mode
      setMode('manual');
    } else {
      // First change the mode
      setMode('scan');
      // Then start the scanner with a longer delay to ensure DOM is ready
      setTimeout(() => {
        console.log('Starting scanner after mode toggle');
        startScanner();
      }, 500); // Increased delay for better stability
    }
  };

  const handleScan = async (barcode: string) => {
    try {
      // Temporarily stop scanning to prevent multiple scans
      stopScanner();

      console.log('Barcode scanned:', barcode);

      // Create and preload the audio element
      const audio = new Audio();

      // Set up error handling for audio
      audio.onerror = () => {
        console.log('Audio error, continuing anyway');
      };

      // Try to play success sound, but don't fail if it doesn't work
      try {
        // First check if the file exists by making a HEAD request
        fetch('/sounds/beep.mp3', { method: 'HEAD' })
          .then(response => {
            if (response.ok) {
              audio.src = '/sounds/beep.mp3';
              audio.play().catch(e => console.log('Could not play sound, continuing anyway'));
            } else {
              console.log('Beep sound file not found, continuing anyway');
            }
          })
          .catch(() => {
            console.log('Could not check for sound file, continuing anyway');
          });
      } catch (e) {
        console.log('Sound playback not supported, continuing anyway');
      }

      // For demo purposes, create a mock student if barcode is not found
      let student = await getStudentByBarcode(barcode);

      if (!student) {
        console.log('Student not found for barcode, creating mock student for demo');
        // Create a mock student for demo purposes
        student = {
          id: 'mock-' + Math.random().toString(36).substring(2, 9),
          name: 'Demo Student',
          email: 'demo@example.com',
          barcode: barcode,
          checked_in: false,
          created_at: new Date().toISOString()
        };

        // Add to local state
        addStudent(student);
        toast.success('Created demo student for testing');
      }

      if (student.checked_in) {
        // Use toast.id to prevent duplicate toasts
        toast.error(`${student.name} is already checked in!`, { id: `already-checked-in-${student.id}` });
        setLastScannedStudent(student);
      } else {
        try {
          // Try to check in the student in the database
          const updatedStudent = await checkInStudent(student.id);

          if (updatedStudent) {
            console.log('Student checked in successfully in database');
            updateStudent(updatedStudent);
            setLastScannedStudent(updatedStudent);
            toast.success(`${updatedStudent.name} checked in successfully!`);
          } else {
            // If database update fails, still update the UI for demo
            console.log('Database update failed, updating UI only');
            const localUpdatedStudent = {
              ...student,
              checked_in: true,
              checked_in_at: new Date().toISOString()
            };
            updateStudent(localUpdatedStudent);
            setLastScannedStudent(localUpdatedStudent);
            toast.success(`${student.name} checked in successfully (UI only)!`);
          }
        } catch (checkInError) {
          console.error('Error checking in student:', checkInError);

          // Still update the UI for demo purposes
          const localUpdatedStudent = {
            ...student,
            checked_in: true,
            checked_in_at: new Date().toISOString()
          };
          updateStudent(localUpdatedStudent);
          setLastScannedStudent(localUpdatedStudent);

          // Force re-render of the filtered students list
          if (searchQuery) {
            // Re-apply the search to refresh the filtered list
            setStoreSearchQuery(searchQuery);
          }

          toast.success(`${student.name} marked as checked in (UI only)`);
        }
      }

      // Restart scanner after a short delay
      setTimeout(() => {
        startScanner();
      }, 2000);
    } catch (error) {
      console.error('Scan error:', error);
      toast.error('Error processing scan: ' + (error instanceof Error ? error.message : 'Unknown error'));

      // Restart scanner
      setTimeout(() => {
        startScanner();
      }, 2000);
    }
  };

  const handleManualCheckIn = async (student: Student) => {
    if (student.checked_in) {
      toast.error(`${student.name} is already checked in!`);
      return;
    }

    // Immediately update UI for better user experience
    const localUpdatedStudent = {
      ...student,
      checked_in: true,
      checked_in_at: new Date().toISOString()
    };

    // Update UI immediately for responsive feedback
    updateStudent(localUpdatedStudent);
    setLastScannedStudent(localUpdatedStudent);

    // Force re-render of the filtered students list
    if (searchQuery) {
      // Re-apply the search to refresh the filtered list
      setStoreSearchQuery(searchQuery);
    }

    // Show loading toast
    const loadingToast = toast.loading(`Checking in ${student.name}...`);

    try {
      console.log('Checking in student manually:', student);

      // Try to update in database
      const updatedStudent = await checkInStudent(student.id);

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      if (updatedStudent) {
        console.log('Student checked in successfully:', updatedStudent);
        // Update with the data from the server to ensure consistency
        updateStudent(updatedStudent);
        setLastScannedStudent(updatedStudent);

        // Force re-render of the filtered students list again with server data
        if (searchQuery) {
          // Re-apply the search to refresh the filtered list
          setStoreSearchQuery(searchQuery);
        }

        toast.success(`${updatedStudent.name} checked in successfully!`);

        // Play success sound
        try {
          const audio = new Audio();
          audio.src = '/sounds/beep.mp3';
          audio.play().catch(() => console.log('Could not play sound, continuing anyway'));
        } catch (e) {
          console.log('Sound playback not supported, continuing anyway');
        }
      } else {
        // If database update fails, we already updated the UI
        console.log('Database update failed, UI already updated');
        toast.success(`${student.name} checked in successfully (UI only)!`);
      }
    } catch (error) {
      console.error('Check-in error:', error);
      // Dismiss loading toast
      toast.dismiss(loadingToast);
      toast.error('Error checking in student: ' + (error instanceof Error ? error.message : 'Unknown error'));

      // We already updated the UI, so just inform the user
      toast.success(`${student.name} marked as checked in (UI only)`);
    }
  };

  useEffect(() => {
    console.log('Mode changed to:', mode);

    // Only start scanner if in scan mode and component is mounted
    if (mode === 'scan') {
      // Use a timeout to ensure DOM is fully rendered
      const timerId = setTimeout(() => {
        console.log('Starting scanner from mode effect');
        startScanner();
      }, 1000); // Longer delay for initial load

      // Clean up function
      return () => {
        console.log('Cleaning up scanner effect');
        clearTimeout(timerId);
        stopScanner();
      };
    }

    // Always return a cleanup function
    return () => {
      console.log('Cleaning up effect (no scanner running)');
      stopScanner(); // Just to be safe
    };
  }, [mode]);

  return (
    <div className="min-h-screen relative overflow-hidden" style={{
      backgroundImage: "url('/assets/img/glitterdashboard.jpg')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat"
    }}>
      {/* Overlay to ensure text readability */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-20 left-20 w-40 h-40 rounded-full bg-primary/30 blur-3xl animate-float" style={{ animationDelay: '0s' }}></div>
        <div className="absolute bottom-40 right-20 w-60 h-60 rounded-full bg-secondary/30 blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/3 right-1/3 w-32 h-32 rounded-full bg-accent/30 blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="container mx-auto px-4 py-12 relative z-10">
        <Link href="/" className="inline-flex items-center text-white bg-primary/80 hover:bg-primary px-4 py-2 rounded-full shadow-md transition-all duration-300 mb-8">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Home
        </Link>

        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12 relative"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="absolute -top-20 left-1/2 transform -translate-x-1/2 w-40 h-40 bg-accent/10 rounded-full blur-3xl animate-pulse-glow"
          ></motion.div>

          <h1 className="text-5xl md:text-6xl font-bold font-display mb-4 text-white drop-shadow-lg">
            Student <span className="gradient-text">Check-in</span>
          </h1>

          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '150px' }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="h-1 bg-gradient-to-r from-primary to-secondary rounded-full mx-auto mb-6"
          ></motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="flex justify-center mb-10"
        >
          <div className="glass border border-white/20 rounded-full p-1.5 shadow-lg">
            <motion.button
              className={`px-8 py-3 rounded-full text-base font-medium transition-all duration-300 flex items-center ${
                mode === 'scan'
                  ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-md'
                  : 'text-white hover:bg-white/10'
              }`}
              onClick={() => setMode('scan')}
              whileHover={{ scale: mode === 'scan' ? 1 : 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1v-2a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              Scan Barcode
            </motion.button>
            <motion.button
              className={`px-8 py-3 rounded-full text-base font-medium transition-all duration-300 flex items-center ${
                mode === 'manual'
                  ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-md'
                  : 'text-white hover:bg-white/10'
              }`}
              onClick={() => setMode('manual')}
              whileHover={{ scale: mode === 'manual' ? 1 : 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Manual Check-in
            </motion.button>
          </div>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            {mode === 'scan' ? (
              <motion.div
                key="scanner"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="card glass border border-white/20 shadow-xl overflow-hidden relative"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/20 to-secondary/20 blur-xl opacity-50"></div>
                <div className="relative z-10">
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center bg-primary/20 p-3 rounded-full mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1v-2a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-white">Barcode Scanner</h2>
                    <p className="text-gray-300">
                      Position the barcode in front of the camera to scan
                    </p>
                  </div>

                  <div className="relative mb-8 rounded-lg overflow-hidden bg-black aspect-video max-w-lg mx-auto shadow-lg border border-white/10">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                    ></video>

                    {!isScanning && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 text-white">
                        <div className="text-center">
                          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                          </svg>
                          <p>Camera initializing...</p>
                        </div>
                      </div>
                    )}

                    <div className="absolute inset-0 border-2 border-primary border-dashed pointer-events-none animate-pulse-slow"></div>

                    {/* Scanner target overlay */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-48 h-48 border-2 border-primary/70 rounded-lg"></div>
                      <div className="absolute top-1/2 left-1/2 w-52 h-1 bg-primary/50 -translate-x-1/2 -translate-y-1/2"></div>
                      <div className="absolute top-1/2 left-1/2 w-1 h-52 bg-primary/50 -translate-x-1/2 -translate-y-1/2"></div>
                    </div>
                  </div>

                  <div className="text-center">
                    <motion.button
                      onClick={toggleMode}
                      className="bg-gradient-to-r from-secondary to-secondary-dark text-white px-6 py-3 rounded-full shadow-lg font-medium transition-all duration-300 flex items-center mx-auto"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Switch to Manual Mode
                    </motion.button>
                  </div>

                  {lastScannedStudent && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-8 p-6 border border-white/20 rounded-lg bg-white/10 backdrop-blur-sm"
                    >
                      <div className="flex items-center mb-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${lastScannedStudent.checked_in ? 'bg-green-500' : 'bg-red-500'}`}>
                          {lastScannedStudent.checked_in ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                        </div>
                        <h3 className="text-xl font-bold text-white">Last Scanned</h3>
                      </div>

                      <div className="space-y-2 text-white">
                        <p className="flex justify-between border-b border-white/10 pb-2">
                          <span className="font-medium text-gray-300">Name:</span>
                          <span className="font-bold">{lastScannedStudent.name}</span>
                        </p>
                        <p className="flex justify-between border-b border-white/10 pb-2">
                          <span className="font-medium text-gray-300">Status:</span>{' '}
                          {lastScannedStudent.checked_in ? (
                            <span className="text-green-400 font-bold">Checked In</span>
                          ) : (
                            <span className="text-red-400 font-bold">Not Checked In</span>
                          )}
                        </p>
                        {lastScannedStudent.checked_in_at && (
                          <p className="flex justify-between">
                            <span className="font-medium text-gray-300">Time:</span>{' '}
                            <span className="font-bold">{new Date(lastScannedStudent.checked_in_at).toLocaleTimeString()}</span>
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="manual"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="card glass border border-white/20 shadow-xl overflow-hidden relative"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-secondary/20 via-accent/20 to-primary/20 blur-xl opacity-50"></div>
                <div className="relative z-10">
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center bg-secondary/20 p-3 rounded-full mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-white">Manual Check-in</h2>
                    <p className="text-gray-300">
                      Search for students by name or email
                    </p>
                  </div>

                  <div className="mb-8">
                    <div className="relative max-w-md mx-auto">
                      <input
                        type="text"
                        className="w-full px-5 py-3 pl-12 bg-white/10 border border-white/20 rounded-full text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all duration-300 shadow-lg"
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <div className="absolute left-4 top-3.5 text-gray-300">
                        {isSearching ? (
                          <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="flex justify-center items-center py-12">
                      <div className="text-center">
                        <svg className="animate-spin w-12 h-12 mx-auto mb-3 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-white">Loading student data...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20 backdrop-blur-sm">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-700">
                          <thead className="bg-black/30">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                Name
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                Email
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                Status
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                Action
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-700">
                            {filteredStudents.length > 0 ? (
                              filteredStudents.map((student, index) => (
                                <motion.tr
                                  key={student.id}
                                  className="hover:bg-white/5 transition-colors duration-150"
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.2, delay: index * 0.05 }}
                                >
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                                    {student.name}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                    {student.email}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    {student.checked_in ? (
                                      <motion.span
                                        initial={{ scale: 0.9 }}
                                        animate={{ scale: 1 }}
                                        className="px-3 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full bg-green-500/20 text-green-400 border border-green-500/30"
                                      >
                                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                        </svg>
                                        Checked In
                                        {student.checked_in_at && (
                                          <span className="ml-1 text-xs opacity-70">
                                            {new Date(student.checked_in_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                          </span>
                                        )}
                                      </motion.span>
                                    ) : (
                                      <span className="px-3 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                        </svg>
                                        Not Checked In
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <motion.button
                                      onClick={() => handleManualCheckIn(student)}
                                      disabled={student.checked_in}
                                      whileHover={!student.checked_in ? { scale: 1.05 } : {}}
                                      whileTap={!student.checked_in ? { scale: 0.95 } : {}}
                                      className={`px-4 py-2 rounded-full text-white text-sm transition-all ${
                                        student.checked_in
                                          ? 'bg-gray-600/50 cursor-not-allowed'
                                          : 'bg-gradient-to-r from-primary to-primary-dark hover:shadow-lg shadow-md'
                                      }`}
                                    >
                                      {student.checked_in ? 'Already Checked In' : 'Check In'}
                                    </motion.button>
                                  </td>
                                </motion.tr>
                              ))
                            ) : isSearching ? (
                              <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-300">
                                  <div className="flex justify-center items-center py-4">
                                    <svg className="animate-spin w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Searching...
                                  </div>
                                </td>
                              </tr>
                            ) : searchQuery ? (
                              <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-300">
                                  <div className="flex flex-col items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    No students found matching "<span className="text-primary">{searchQuery}</span>"
                                  </div>
                                </td>
                              </tr>
                            ) : (
                              <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-300">
                                  <div className="flex flex-col items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    Enter a search term to find students
                                  </div>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="text-center mt-8">
                    <motion.button
                      onClick={toggleMode}
                      className="bg-gradient-to-r from-secondary to-secondary-dark text-white px-6 py-3 rounded-full shadow-lg font-medium transition-all duration-300 flex items-center mx-auto"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1v-2a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                      Switch to Scanner Mode
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
