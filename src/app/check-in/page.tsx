'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { getStudents, getStudentByBarcode, checkInStudent, toggleStudentTimeStatus, timeInStudent, timeOutStudent } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { Student } from '@/lib/supabase';
import AdvancedBarcodeScanner from '@/components/AdvancedBarcodeScanner';
import CameraTroubleshootingGuide from '@/components/CameraTroubleshootingGuide';
import { useAuth } from '@/contexts/AuthContext';
import { CameraIcon, SearchIcon, CheckIcon, XIcon } from '@/components/Icons';
import { formatTime12Hour, getStatusDisplay, calculateTimeSpent } from '@/utils/time';

export default function CheckInPage() {
  const { students, filteredStudents, addStudent, updateStudent, setSearchQuery: setStoreSearchQuery } = useAppStore();
  const [mode, setMode] = useState<'scan' | 'manual'>('scan');
  const [activeTab, setActiveTab] = useState<'time-in' | 'time-out'>('time-in');
  const [searchQuery, setLocalSearchQuery] = useState('');
  const [lastScannedStudent, setLastScannedStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { isLoggedIn, loading } = useAuth();
  const router = useRouter();

  // All useEffect hooks must be at the top, before any conditional returns
  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push('/login');
    }
  }, [isLoggedIn, loading, router]);

  useEffect(() => {
    const loadStudents = async () => {
      try {
        console.log('Loading students...');
        const studentsData = await getStudents();
        console.log('Students loaded:', studentsData.length);

        // Add students to store
        studentsData.forEach(student => addStudent(student));
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading students:', error);
        toast.error('Failed to load students');
        setIsLoading(false);
      }
    };

    loadStudents();

    // Clean up search timeouts on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [addStudent]);

  // Handle search with debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(() => {
      setStoreSearchQuery(searchQuery);
      setIsSearching(false);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, setStoreSearchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold mb-4">Loading...</h2>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Please sign in to access check-in</h2>
          <Link href="/login" className="btn-primary">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const handleScanSuccess = (barcode: string) => {
    console.log('Barcode scanned:', barcode);
    handleScan(barcode);
  };

  const handleScanError = (error: string) => {
    console.error('Scan error:', error);
    toast.error(error);

    // Show troubleshooting guide for camera permission errors
    if (error.toLowerCase().includes('camera') || error.toLowerCase().includes('permission')) {
      setShowTroubleshooting(true);
    }
  };

  const handleScan = async (barcode: string) => {
    try {
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
          current_status: 'NEVER_ENTERED',
          created_at: new Date().toISOString()
        };

        // Add to local state
        addStudent(student);
        toast.success('Created demo student for testing');
      }

      // Determine action based on active tab
      const statusDisplay = getStatusDisplay(student.current_status);
      const actionText = activeTab === 'time-out' ? 'Time Out' : 'Time In';

      // Check if student has already completed their cycle
      if (student.current_status === 'OUT') {
        toast.error(`${student.name} has already completed their entry/exit cycle!`);
        setLastScannedStudent(student);
        return;
      }

      // Validate the scan against the active tab
      if (activeTab === 'time-in' && student.current_status === 'IN') {
        toast.error(`${student.name} is already inside! Switch to Time Out mode to check them out.`);
        setLastScannedStudent(student);
        return;
      }

      if (activeTab === 'time-in' && (student.current_status as any) === 'OUT') {
        toast.error(`${student.name} has already completed their cycle! They cannot be checked in again.`);
        setLastScannedStudent(student);
        return;
      }

      if (activeTab === 'time-out' && student.current_status === 'NEVER_ENTERED') {
        toast.error(`${student.name} has never entered! Switch to Time In mode to check them in first.`);
        setLastScannedStudent(student);
        return;
      }

      if (activeTab === 'time-out' && (student.current_status as any) === 'OUT') {
        toast.error(`${student.name} has already been checked out! They have completed their cycle.`);
        setLastScannedStudent(student);
        return;
      }

      try {
        // Use specific functions based on active tab instead of toggle
        let updatedStudent;
        if (activeTab === 'time-in') {
          updatedStudent = await timeInStudent(student.id);
        } else {
          updatedStudent = await timeOutStudent(student.id);
        }

        if (updatedStudent && !(updatedStudent as any).error) {
          console.log('Student time status updated successfully in database');
          updateStudent(updatedStudent);
          setLastScannedStudent(updatedStudent);

          const newStatusDisplay = getStatusDisplay(updatedStudent.current_status);
          toast.success(`${updatedStudent.name} - ${actionText} successful! Status: ${newStatusDisplay.text}`);
        } else if ((updatedStudent as any)?.error === 'ALREADY_COMPLETED') {
          toast.error(`${student.name} has already completed their entry/exit cycle!`);
          setLastScannedStudent(student);
        } else {
          // Database update failed - show error and don't update UI
          console.error('Database update failed for student:', student.id);
          toast.error(`Failed to update ${student.name} in database. Please try again.`);
          setLastScannedStudent(student);
        }
      } catch (error) {
        console.error('Error updating student time status:', error);
        toast.error(`Failed to update ${student.name}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setLastScannedStudent(student);
      }
    } catch (error) {
      console.error('Scan error:', error);
      toast.error('Error processing scan: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleManualCheckIn = async (student: Student, forceAction?: 'time-in' | 'time-out') => {
    const requestedAction = forceAction || activeTab;
    const actionText = requestedAction === 'time-out' ? 'Time Out' : 'Time In';

    // Check if student has already completed their cycle
    if (student.current_status === 'OUT') {
      toast.error(`${student.name} has already completed their entry/exit cycle!`);
      return;
    }

    // Validate the requested action against current status
    if (requestedAction === 'time-in' && student.current_status === 'IN') {
      toast.error(`${student.name} is already inside! Use Time Out tab to check them out.`);
      return;
    }

    if (requestedAction === 'time-out' && student.current_status !== 'IN') {
      toast.error(`${student.name} is not inside! Use Time In tab to check them in first.`);
      return;
    }

    // Show loading toast
    const loadingToast = toast.loading(`${actionText} ${student.name}...`);

    // Immediately update UI for better user experience
    const now = new Date().toISOString();
    const localUpdatedStudent = {
      ...student,
      checked_in: true,
      checked_in_at: now,
      current_status: student.current_status === 'IN' ? 'OUT' : 'IN',
      time_in: student.current_status !== 'IN' ? now : student.time_in,
      time_out: student.current_status === 'IN' ? now : student.time_out
    } as Student;

    // Update UI immediately for responsive feedback
    updateStudent(localUpdatedStudent);
    setLastScannedStudent(localUpdatedStudent);

    // Force re-render of the filtered students list
    if (searchQuery) {
      // Re-apply the search to refresh the filtered list
      setStoreSearchQuery(searchQuery);
    }

    try {
      console.log('Updating student time status manually:', student);

      // Try to update in database using new time tracking function
      const updatedStudent = await toggleStudentTimeStatus(student.id);

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      if (updatedStudent && !(updatedStudent as any).error) {
        console.log('Student time status updated successfully:', updatedStudent);
        // Update with the data from the server to ensure consistency
        updateStudent(updatedStudent);
        setLastScannedStudent(updatedStudent);

        // Force re-render of the filtered students list again with server data
        if (searchQuery) {
          // Re-apply the search to refresh the filtered list
          setStoreSearchQuery(searchQuery);
        }

        const newStatusDisplay = getStatusDisplay(updatedStudent.current_status);
        toast.success(`${updatedStudent.name} - ${actionText} successful! Status: ${newStatusDisplay.text}`);

        // Play success sound
        try {
          const audio = new Audio();
          audio.src = '/sounds/beep.mp3';
          audio.play().catch(() => console.log('Could not play sound, continuing anyway'));
        } catch (e) {
          console.log('Sound playback not supported, continuing anyway');
        }
      } else if ((updatedStudent as any)?.error === 'ALREADY_COMPLETED') {
        toast.error(`${student.name} has already completed their entry/exit cycle!`);
        // Revert UI changes
        updateStudent(student);
        setLastScannedStudent(student);
      } else {
        // Database update failed - revert UI changes and show error
        console.error('Database update failed for student:', student.id);
        updateStudent(student);
        setLastScannedStudent(student);
        toast.error(`Failed to update ${student.name} in database. Please try again.`);
      }
    } catch (error) {
      console.error('Time tracking error:', error);
      // Dismiss loading toast
      toast.dismiss(loadingToast);

      // Revert UI changes
      updateStudent(student);
      setLastScannedStudent(student);

      toast.error(`Failed to update ${student.name}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center text-white bg-primary hover:bg-primary-dark px-4 py-2 rounded mb-8">
          ← Back to Home
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
            Student Check-in
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Scan barcodes or search for students to check them in
          </p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
            <button
              className={`px-6 py-2 rounded text-sm font-medium flex items-center gap-2 ${
                mode === 'scan'
                  ? 'bg-primary text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              onClick={() => setMode('scan')}
            >
              <CameraIcon className="h-4 w-4" />
              Scan Barcode
            </button>
            <button
              className={`px-6 py-2 rounded text-sm font-medium flex items-center gap-2 ${
                mode === 'manual'
                  ? 'bg-primary text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              onClick={() => setMode('manual')}
            >
              <SearchIcon className="h-4 w-4" />
              Manual Check-in
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          {mode === 'scan' ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Barcode Scanner</h2>
                <p className="text-gray-600 dark:text-gray-300">
                  Position the barcode in front of the camera to scan
                </p>
              </div>

              {/* Time In/Time Out Tabs for Scanner */}
              <div className="flex justify-center mb-6">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-1 border border-gray-200 dark:border-gray-600">
                  <button
                    className={`px-6 py-2 rounded text-sm font-medium flex items-center gap-2 ${
                      activeTab === 'time-in'
                        ? 'bg-green-500 text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    onClick={() => setActiveTab('time-in')}
                  >
                    <CheckIcon className="h-4 w-4" />
                    Time In Mode
                  </button>
                  <button
                    className={`px-6 py-2 rounded text-sm font-medium flex items-center gap-2 ${
                      activeTab === 'time-out'
                        ? 'bg-red-500 text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    onClick={() => setActiveTab('time-out')}
                  >
                    <XIcon className="h-4 w-4" />
                    Time Out Mode
                  </button>
                </div>
              </div>

              <div className="text-center mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {activeTab === 'time-in'
                    ? '🟢 Scanner will only TIME IN students (Never Entered → Inside)'
                    : '🔴 Scanner will only TIME OUT students (Inside → Completed)'
                  }
                </p>
              </div>

              <AdvancedBarcodeScanner
                onScan={handleScanSuccess}
                onError={handleScanError}
                isActive={mode === 'scan'}
              />

              <div className="text-center mt-6 space-y-3">
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={() => setMode('manual')}
                    className="bg-secondary text-white px-6 py-3 rounded font-medium hover:bg-secondary-dark flex items-center gap-2"
                  >
                    <SearchIcon className="h-4 w-4" />
                    Switch to Manual Mode
                  </button>

                  <button
                    onClick={() => setShowTroubleshooting(true)}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded font-medium flex items-center gap-2"
                    title="Camera troubleshooting help"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Help
                  </button>
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Having camera issues? Click "Help" for troubleshooting steps
                </p>
              </div>

              {lastScannedStudent && (
                <div className="mt-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Last Scanned</h3>
                  <div className="space-y-2">
                    <p className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Name:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{lastScannedStudent.name}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Status:</span>
                      {(() => {
                        const statusDisplay = getStatusDisplay(lastScannedStudent.current_status || 'NEVER_ENTERED');
                        return (
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusDisplay.color} flex items-center gap-1`}>
                            {lastScannedStudent.current_status === 'IN' ? (
                              <CheckIcon className="h-3 w-3" />
                            ) : (
                              <XIcon className="h-3 w-3" />
                            )}
                            {statusDisplay.text}
                          </span>
                        );
                      })()}
                    </p>
                    {lastScannedStudent.time_in && (
                      <p className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Time In:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatTime12Hour(lastScannedStudent.time_in)}</span>
                      </p>
                    )}
                    {lastScannedStudent.time_out && (
                      <p className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Time Out:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatTime12Hour(lastScannedStudent.time_out)}</span>
                      </p>
                    )}
                    {lastScannedStudent.current_status === 'IN' && lastScannedStudent.time_in && (
                      <p className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Current Session:</span>
                        <span className="font-medium text-blue-600">{calculateTimeSpent(lastScannedStudent.time_in)}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Manual Check-in</h2>
                <p className="text-gray-600 dark:text-gray-300">
                  Search for students by name or email
                </p>
              </div>

              {/* Time In/Time Out Tabs */}
              <div className="flex justify-center mb-6">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-1 border border-gray-200 dark:border-gray-600">
                  <button
                    className={`px-6 py-2 rounded text-sm font-medium flex items-center gap-2 ${
                      activeTab === 'time-in'
                        ? 'bg-green-500 text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    onClick={() => setActiveTab('time-in')}
                  >
                    <CheckIcon className="h-4 w-4" />
                    Time In
                  </button>
                  <button
                    className={`px-6 py-2 rounded text-sm font-medium flex items-center gap-2 ${
                      activeTab === 'time-out'
                        ? 'bg-red-500 text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    onClick={() => setActiveTab('time-out')}
                  >
                    <XIcon className="h-4 w-4" />
                    Time Out
                  </button>
                </div>
              </div>

              <div className="text-center mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {activeTab === 'time-in'
                    ? 'Showing students who can be checked in (Not Entered status)'
                    : 'Showing students who can be checked out (Inside status)'
                  }
                </p>
              </div>

              <div className="mb-6">
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setLocalSearchQuery(e.target.value)}
                />
              </div>

              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-300">Loading student data...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Current Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Time Info
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {(() => {
                        // Filter students based on active tab
                        const tabFilteredStudents = filteredStudents.filter(student => {
                          if (activeTab === 'time-in') {
                            return student.current_status === 'NEVER_ENTERED';
                          } else {
                            return student.current_status === 'IN';
                          }
                        });

                        return tabFilteredStudents.length > 0 ?
                          tabFilteredStudents.map((student) => (
                          <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {student.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                              {student.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {(() => {
                                const statusDisplay = getStatusDisplay(student.current_status || 'NEVER_ENTERED');
                                return (
                                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusDisplay.color} flex items-center gap-1`}>
                                    {student.current_status === 'IN' ? (
                                      <CheckIcon className="h-3 w-3" />
                                    ) : (
                                      <XIcon className="h-3 w-3" />
                                    )}
                                    {statusDisplay.text}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-gray-300">
                              <div className="space-y-1">
                                {student.time_in && (
                                  <div>In: {formatTime12Hour(student.time_in)}</div>
                                )}
                                {student.time_out && (
                                  <div>Out: {formatTime12Hour(student.time_out)}</div>
                                )}
                                {student.current_status === 'IN' && student.time_in && (
                                  <div className="text-blue-600">
                                    Current: {calculateTimeSpent(student.time_in)}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {student.current_status === 'OUT' ? (
                                <span className="px-4 py-2 rounded text-gray-500 text-sm bg-gray-200 dark:bg-gray-700 dark:text-gray-400">
                                  Cycle Complete
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleManualCheckIn(student, activeTab)}
                                  className={`px-4 py-2 rounded text-white text-sm ${
                                    activeTab === 'time-in'
                                      ? 'bg-green-500 hover:bg-green-600'
                                      : 'bg-red-500 hover:bg-red-600'
                                  }`}
                                >
                                  {activeTab === 'time-in' ? 'Time In' : 'Time Out'}
                                </button>
                              )}
                            </td>
                          </tr>
                        )) : isSearching ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                              Searching...
                            </td>
                          </tr>
                        ) : searchQuery ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                              No students found matching "{searchQuery}" for {activeTab === 'time-in' ? 'Time In' : 'Time Out'}
                            </td>
                          </tr>
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                              {activeTab === 'time-in'
                                ? 'No students available for Time In. Search for students who haven\'t entered yet.'
                                : 'No students currently inside. Switch to Time In tab to check students in first.'
                              }
                            </td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="text-center mt-6">
                <button
                  onClick={() => setMode('scan')}
                  className="bg-secondary text-white px-6 py-3 rounded font-medium hover:bg-secondary-dark flex items-center gap-2 mx-auto"
                >
                  <CameraIcon className="h-4 w-4" />
                  Switch to Scanner Mode
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Camera Troubleshooting Guide */}
      <CameraTroubleshootingGuide
        isOpen={showTroubleshooting}
        onClose={() => setShowTroubleshooting(false)}
      />
    </div>
  );
}
