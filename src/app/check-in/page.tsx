'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { getStudents, getStudentByBarcode, checkInStudent, timeInStudent, timeOutStudent } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { Student } from '@/lib/supabase';
import AdvancedBarcodeScanner from '@/components/AdvancedBarcodeScanner';
import { useAuth } from '@/contexts/AuthContext';
import { CameraIcon, SearchIcon, CheckIcon, XIcon } from '@/components/Icons';
import { formatTime12Hour } from '@/utils/time';

export default function CheckInPage() {
  const { students, filteredStudents, addStudent, updateStudent, setSearchQuery: setStoreSearchQuery } = useAppStore();
  const [mode, setMode] = useState<'manual' | 'time-in' | 'time-out'>('time-in');
  const [searchQuery, setLocalSearchQuery] = useState('');
  const [lastScannedStudent, setLastScannedStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
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

      // Handle different modes
      if (mode === 'time-in') {
        await handleTimeIn(student);
      } else if (mode === 'time-out') {
        await handleTimeOut(student);
      }
    } catch (error) {
      console.error('Scan error:', error);
      toast.error('Error processing scan: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleTimeIn = async (student: Student) => {
    if (student.current_status === 'IN') {
      toast.error(`${student.name} is already timed in!`);
      setLastScannedStudent(student);
      return;
    }

    const successToast = toast.loading(`Timing in ${student.name}...`);

    try {
      const updatedStudent = await timeInStudent(student.id);
      toast.dismiss(successToast);

      if (updatedStudent) {
        updateStudent(updatedStudent);
        setLastScannedStudent(updatedStudent);
        toast.success(`${updatedStudent.name} timed in successfully!`);
      } else {
        // Fallback UI update
        const localUpdatedStudent = {
          ...student,
          current_status: 'IN' as const,
          time_in: new Date().toISOString(),
          checked_in: true,
          checked_in_at: new Date().toISOString()
        };
        updateStudent(localUpdatedStudent);
        setLastScannedStudent(localUpdatedStudent);
        toast.success(`${student.name} timed in (UI only)!`);
      }
    } catch (error) {
      toast.dismiss(successToast);
      console.error('Error timing in student:', error);
      toast.error('Failed to time in student');
    }
  };

  const handleTimeOut = async (student: Student) => {
    if (student.current_status !== 'IN') {
      toast.error(`${student.name} is not currently timed in!`);
      setLastScannedStudent(student);
      return;
    }

    const successToast = toast.loading(`Timing out ${student.name}...`);

    try {
      const updatedStudent = await timeOutStudent(student.id);
      toast.dismiss(successToast);

      if (updatedStudent) {
        updateStudent(updatedStudent);
        setLastScannedStudent(updatedStudent);
        toast.success(`${updatedStudent.name} timed out successfully!`);
      } else {
        // Fallback UI update
        const localUpdatedStudent = {
          ...student,
          current_status: 'OUT' as const,
          time_out: new Date().toISOString()
        };
        updateStudent(localUpdatedStudent);
        setLastScannedStudent(localUpdatedStudent);
        toast.success(`${student.name} timed out (UI only)!`);
      }
    } catch (error) {
      toast.dismiss(successToast);
      console.error('Error timing out student:', error);
      toast.error('Failed to time out student');
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center text-white bg-primary hover:bg-primary-dark px-4 py-2 rounded mb-8">
          ← Back to Home
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
            Student Time Tracking
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Scan barcodes to track student time in and time out
          </p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700 flex flex-wrap gap-1">
            <button
              className={`px-6 py-2 rounded text-sm font-medium flex items-center gap-2 ${
                mode === 'time-in'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              onClick={() => setMode('time-in')}
            >
              <CameraIcon className="h-4 w-4" />
              Time In
            </button>
            <button
              className={`px-6 py-2 rounded text-sm font-medium flex items-center gap-2 ${
                mode === 'time-out'
                  ? 'bg-red-600 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              onClick={() => setMode('time-out')}
            >
              <CameraIcon className="h-4 w-4" />
              Time Out
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
              Manual
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          {(mode === 'time-in' || mode === 'time-out') ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                  {mode === 'time-in' ? 'Time In Scanner' : 'Time Out Scanner'}
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  {mode === 'time-in' ? 'Scan to record student time in' : 'Scan to record student time out'}
                </p>
              </div>

              <AdvancedBarcodeScanner
                key={mode} // Force remount when mode changes
                onScan={handleScanSuccess}
                onError={handleScanError}
                isActive={mode === 'time-in' || mode === 'time-out'}
              />

              <div className="text-center mt-6">
                <button
                  onClick={() => setMode('manual')}
                  className="bg-secondary text-white px-6 py-3 rounded font-medium hover:bg-secondary-dark flex items-center gap-2 mx-auto"
                >
                  <SearchIcon className="h-4 w-4" />
                  Switch to Manual Mode
                </button>
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
                      <span className="text-gray-600 dark:text-gray-300">Current Status:</span>
                      {lastScannedStudent.current_status === 'IN' ? (
                        <span className="text-green-600 font-medium flex items-center gap-1">
                          <CheckIcon className="h-4 w-4" />
                          Timed In
                        </span>
                      ) : lastScannedStudent.current_status === 'OUT' ? (
                        <span className="text-orange-600 font-medium flex items-center gap-1">
                          <XIcon className="h-4 w-4" />
                          Timed Out
                        </span>
                      ) : (
                        <span className="text-gray-600 font-medium flex items-center gap-1">
                          <XIcon className="h-4 w-4" />
                          Never Entered
                        </span>
                      )}
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

                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Manual Time Tracking</h2>
                <p className="text-gray-600 dark:text-gray-300">
                  Search for students and manage their time in/out manually
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
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredStudents.length > 0 ? (
                        filteredStudents.map((student) => (
                          <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {student.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                              {student.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {student.current_status === 'IN' ? (
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 flex items-center gap-1">
                                  <CheckIcon className="h-3 w-3" />
                                  Timed In
                                  {student.time_in && (
                                    <span className="ml-1 opacity-70">
                                      {formatTime12Hour(student.time_in)}
                                    </span>
                                  )}
                                </span>
                              ) : student.current_status === 'OUT' ? (
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100 flex items-center gap-1">
                                  <XIcon className="h-3 w-3" />
                                  Timed Out
                                  {student.time_out && (
                                    <span className="ml-1 opacity-70">
                                      {formatTime12Hour(student.time_out)}
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100 flex items-center gap-1">
                                  <XIcon className="h-3 w-3" />
                                  Never Entered
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleTimeIn(student)}
                                  disabled={student.current_status === 'IN'}
                                  className={`px-3 py-1 rounded text-white text-xs ${
                                    student.current_status === 'IN'
                                      ? 'bg-gray-400 cursor-not-allowed'
                                      : 'bg-green-600 hover:bg-green-700'
                                  }`}
                                >
                                  Time In
                                </button>
                                <button
                                  onClick={() => handleTimeOut(student)}
                                  disabled={student.current_status !== 'IN'}
                                  className={`px-3 py-1 rounded text-white text-xs ${
                                    student.current_status !== 'IN'
                                      ? 'bg-gray-400 cursor-not-allowed'
                                      : 'bg-red-600 hover:bg-red-700'
                                  }`}
                                >
                                  Time Out
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : isSearching ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                            Searching...
                          </td>
                        </tr>
                      ) : searchQuery ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                            No students found matching "{searchQuery}"
                          </td>
                        </tr>
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                            Enter a search term to find students
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="text-center mt-6">
                <button
                  onClick={() => setMode('time-in')}
                  className="bg-secondary text-white px-6 py-3 rounded font-medium hover:bg-secondary-dark flex items-center gap-2 mx-auto"
                >
                  <CameraIcon className="h-4 w-4" />
                  Switch to Time In Scanner
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
