'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { getStudents, searchStudents } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { Student } from '@/lib/supabase';
import BarcodeModal from '@/components/BarcodeModal';
import EditStudentModal from '@/components/EditStudentModal';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import { printStudentList, exportToExcel } from '@/utils/export';
import { useAuth } from '@/contexts/AuthContext';
import { UsersIcon, CheckIcon, ChartIcon, PrinterIcon, DocumentIcon, RegisterIcon, CheckInIcon, XIcon, EditIcon, TrashIcon, QrCodeIcon, MailIcon, ClockIcon } from '@/components/Icons';
import { formatTime12Hour, getStatusDisplay, formatDuration, calculateTimeSpent } from '@/utils/time';

export default function DashboardPage() {
  const { students, setStudents, updateStudent, removeStudent } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMultiDeleting, setIsMultiDeleting] = useState(false);
  const [isSendingTickets, setIsSendingTickets] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isMultiDeleteModalOpen, setIsMultiDeleteModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    checkedIn: 0,
    notCheckedIn: 0,
    checkInRate: 0,
    currentlyInside: 0,
    totalTimeSpent: '0m',
  });
  const { isLoggedIn, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push('/login');
    }
  }, [isLoggedIn, loading, router]);

  useEffect(() => {
    const loadStudents = async () => {
      setIsLoading(true);
      const data = await getStudents();
      setStudents(data);
      setFilteredStudents(data);
      setIsLoading(false);
    };

    loadStudents();
  }, [setStudents]);

  useEffect(() => {
    if (students.length > 0) {
      const checkedIn = students.filter(student => student.checked_in).length;
      const currentlyInside = students.filter(student => student.current_status === 'IN').length;
      const total = students.length;

      // Calculate total time spent across all students
      let totalSeconds = 0;
      students.forEach(student => {
        if (student.total_time_spent) {
          // Parse PostgreSQL interval format
          const timeMatch = student.total_time_spent.match(/(\d+):(\d+):(\d+)/);
          const dayMatch = student.total_time_spent.match(/(\d+)\s+day/);
          const secondsMatch = student.total_time_spent.match(/(\d+)\s*seconds?/);

          if (timeMatch) {
            const hours = parseInt(timeMatch[1], 10);
            const minutes = parseInt(timeMatch[2], 10);
            const seconds = parseInt(timeMatch[3], 10);
            const days = dayMatch ? parseInt(dayMatch[1], 10) : 0;
            totalSeconds += (days * 24 * 3600) + (hours * 3600) + (minutes * 60) + seconds;
          } else if (secondsMatch) {
            totalSeconds += parseInt(secondsMatch[1], 10);
          }
        }

        // Add current session time for students currently inside
        if (student.current_status === 'IN' && student.time_in) {
          const sessionStart = new Date(student.time_in);
          const now = new Date();
          const sessionSeconds = Math.floor((now.getTime() - sessionStart.getTime()) / 1000);
          totalSeconds += sessionSeconds;
        }
      });

      const totalTimeSpent = formatDuration(`${totalSeconds} seconds`);

      setStats({
        total,
        checkedIn,
        notCheckedIn: total - checkedIn,
        checkInRate: total > 0 ? Math.round((checkedIn / total) * 100) : 0,
        currentlyInside,
        totalTimeSpent,
      });

      // Update filtered students when students change
      if (searchQuery) {
        // If there's a search query, filter the students
        const filtered = students.filter(
          student =>
            student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            student.email.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredStudents(filtered);
      } else {
        // If no search query, show all students
        setFilteredStudents(students);
      }
    }
  }, [students, searchQuery]);

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
          <h2 className="text-2xl font-bold mb-4">Please sign in to access dashboard</h2>
          <Link href="/login" className="btn-primary">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const handleViewBarcode = (student: Student) => {
    setSelectedStudent(student);
    setIsBarcodeModalOpen(true);
  };

  const handleEditStudent = (student: Student) => {
    setSelectedStudent(student);
    setIsEditModalOpen(true);
  };

  const handleDeleteStudent = (student: Student) => {
    setSelectedStudent(student);
    setIsDeleteModalOpen(true);
  };

  // Force update filtered students list
  const forceUpdateFilteredStudents = () => {
    if (searchQuery) {
      // If there's a search query, filter the students
      const filtered = students.filter(
        student =>
          student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredStudents(filtered);
    } else {
      // If no search query, show all students
      setFilteredStudents(students);
    }
  };

  const handleCloseModal = () => {
    setIsBarcodeModalOpen(false);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
  };

  const handleCloseMultiDeleteModal = () => {
    setIsMultiDeleteModalOpen(false);
  };

  const handleToggleSelect = (studentId: string) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === students.length) {
      // If all are selected, deselect all
      setSelectedStudents([]);
    } else {
      // Otherwise, select all
      setSelectedStudents(students.map(student => student.id));
    }
  };

  const handleMultiDelete = () => {
    if (selectedStudents.length > 0) {
      setIsMultiDeleteModalOpen(true);
    } else {
      toast.error('No students selected');
    }
  };

  const handleSaveStudent = async (id: string, updates: { name: string; email: string }) => {
    try {
      const response = await fetch(`/api/students/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update student');
      }

      const updatedStudent = await response.json();
      updateStudent(updatedStudent);
      toast.success('Student updated successfully!');
    } catch (error) {
      console.error('Error updating student:', error);
      toast.error('Failed to update student');
      throw error;
    }
  };

  const handleConfirmDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      // Immediately update UI for better user experience
      // Remove student from local state first
      setFilteredStudents(prev => prev.filter(student => student.id !== id));

      // Update stats immediately
      const updatedStudents = students.filter(student => student.id !== id);
      const checkedIn = updatedStudents.filter(student => student.checked_in).length;
      const total = updatedStudents.length;

      setStats({
        total,
        checkedIn,
        notCheckedIn: total - checkedIn,
        checkInRate: total > 0 ? Math.round((checkedIn / total) * 100) : 0,
        currentlyInside: updatedStudents.filter(student => student.current_status === 'IN').length,
        totalTimeSpent: '0m', // Will be recalculated in useEffect
      });

      // Close modal immediately for better UX
      setIsDeleteModalOpen(false);

      // Then perform the actual delete operation
      const response = await fetch(`/api/students/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete student');
      }

      // Remove student from store after successful API call
      removeStudent(id);

      toast.success('Student deleted successfully!');
    } catch (error) {
      console.error('Error deleting student:', error);
      toast.error('Failed to delete student');

      // If deletion fails, reload the data to restore the UI
      const data = await getStudents();
      setStudents(data);
      setFilteredStudents(searchQuery ?
        data.filter(student =>
          student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.email.toLowerCase().includes(searchQuery.toLowerCase())
        ) : data
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmMultiDelete = async () => {
    if (selectedStudents.length === 0) {
      toast.error('No students selected');
      return;
    }

    setIsMultiDeleting(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      // Create a copy of the array to avoid issues with concurrent modifications
      const studentsToDelete = [...selectedStudents];

      // Keep track of successfully deleted student IDs
      const deletedIds: string[] = [];

      // Immediately update UI for better user experience
      // Remove students from local state first
      setFilteredStudents(prev => prev.filter(student => !studentsToDelete.includes(student.id)));

      // Update stats immediately
      const updatedStudents = students.filter(student => !studentsToDelete.includes(student.id));
      const checkedIn = updatedStudents.filter(student => student.checked_in).length;
      const total = updatedStudents.length;

      setStats({
        total,
        checkedIn,
        notCheckedIn: total - checkedIn,
        checkInRate: total > 0 ? Math.round((checkedIn / total) * 100) : 0,
        currentlyInside: updatedStudents.filter(student => student.current_status === 'IN').length,
        totalTimeSpent: '0m', // Will be recalculated in useEffect
      });

      // Clear selection after deletion
      setSelectedStudents([]);

      // Close modal immediately for better UX
      setIsMultiDeleteModalOpen(false);

      // Then perform the actual delete operations
      for (const id of studentsToDelete) {
        try {
          const response = await fetch(`/api/students/${id}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            errorCount++;
            continue;
          }

          removeStudent(id);
          deletedIds.push(id);
          successCount++;
        } catch (error) {
          console.error(`Error deleting student ${id}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} student${successCount !== 1 ? 's' : ''} deleted successfully!`);
      }

      if (errorCount > 0) {
        toast.error(`Failed to delete ${errorCount} student${errorCount !== 1 ? 's' : ''}`);

        // If any deletions fail, reload the data to restore the UI
        const data = await getStudents();
        setStudents(data);
        setFilteredStudents(searchQuery ?
          data.filter(student =>
            student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            student.email.toLowerCase().includes(searchQuery.toLowerCase())
          ) : data
        );
      }
    } catch (error) {
      console.error('Error in bulk delete operation:', error);
      toast.error('An error occurred during bulk deletion');

      // If the operation fails, reload the data to restore the UI
      const data = await getStudents();
      setStudents(data);
      setFilteredStudents(searchQuery ?
        data.filter(student =>
          student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.email.toLowerCase().includes(searchQuery.toLowerCase())
        ) : data
      );
    } finally {
      setIsMultiDeleting(false);
    }
  };

  const handlePrintStudentList = () => {
    if (students.length === 0) {
      toast.error('No students to print');
      return;
    }

    try {
      printStudentList(students);
      toast.success('Preparing print view...');
    } catch (error) {
      console.error('Error printing student list:', error);
      toast.error('Failed to print student list');
    }
  };

  const handleExportToExcel = async () => {
    if (students.length === 0) {
      toast.error('No students to export');
      return;
    }

    try {
      await exportToExcel(students);
      toast.success('Exporting to Excel...');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Failed to export to Excel');
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setFilteredStudents(students);
      return;
    }

    // First try client-side filtering for better performance
    const clientResults = students.filter(
      student =>
        student.name.toLowerCase().includes(query.toLowerCase()) ||
        student.email.toLowerCase().includes(query.toLowerCase())
    );

    setFilteredStudents(clientResults);

    // Then also fetch from server for more comprehensive search
    try {
      const serverResults = await searchStudents(query);
      if (serverResults.length > 0) {
        // Combine results, removing duplicates
        const combinedResults = [...clientResults];

        serverResults.forEach(serverStudent => {
          if (!combinedResults.some(s => s.id === serverStudent.id)) {
            combinedResults.push(serverStudent);
          }
        });

        // Update the filtered students state
        setFilteredStudents(combinedResults);

        // Also update the store's filtered students for consistency
        // This ensures other components that use filteredStudents from the store get the updated list
        const { setSearchQuery: setStoreSearchQuery } = useAppStore.getState();
        setStoreSearchQuery(query);
      }
    } catch (error) {
      console.error('Error searching students:', error);
      // Keep the client-side results if server search fails
    }
  };

  const handleSendTickets = async () => {
    if (selectedStudents.length === 0) {
      toast.error('No students selected');
      return;
    }

    setIsSendingTickets(true);
    toast.loading(`Sending tickets to ${selectedStudents.length} students...`);

    let successCount = 0;
    let errorCount = 0;

    try {
      // Get the selected student objects
      const selectedStudentObjects = students.filter(student =>
        selectedStudents.includes(student.id)
      );

      for (const student of selectedStudentObjects) {
        try {
          // Generate barcode data URL
          const { generateBarcodeDataUrl, generateTicketWithBarcode } = await import('@/utils/barcode');
          const barcodeDataUrl = await generateBarcodeDataUrl(student.barcode);

          // Generate ticket with barcode
          const ticketUrl = await generateTicketWithBarcode(student, barcodeDataUrl);

          // Send email with ticket
          const response = await fetch('/api/send-ticket', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              student,
              ticketUrl,
            }),
          });

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
            console.error(`Failed to send ticket to ${student.email}`);
          }
        } catch (error) {
          errorCount++;
          console.error(`Error processing ticket for ${student.email}:`, error);
        }
      }

      toast.dismiss();

      if (successCount > 0) {
        toast.success(`Successfully sent ${successCount} ticket${successCount !== 1 ? 's' : ''}`);
      }

      if (errorCount > 0) {
        toast.error(`Failed to send ${errorCount} ticket${errorCount !== 1 ? 's' : ''}`);
      }
    } catch (error) {
      console.error('Error sending tickets:', error);
      toast.dismiss();
      toast.error('An error occurred while sending tickets');
    } finally {
      setIsSendingTickets(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center text-white bg-primary hover:bg-primary-dark px-4 py-2 rounded mb-8">
          ← Back to Home
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
            Event Dashboard
          </h1>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-300">Loading dashboard...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center">
                  <div className="bg-primary text-white p-3 rounded-full mr-4">
                    <UsersIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-medium mb-1 text-gray-900 dark:text-white">Total Registrations</h2>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center">
                  <div className="bg-green-500 text-white p-3 rounded-full mr-4">
                    <CheckIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-medium mb-1 text-gray-900 dark:text-white">Currently Inside</h2>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.currentlyInside}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center">
                  <div className="bg-blue-500 text-white p-3 rounded-full mr-4">
                    <ClockIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-medium mb-1 text-gray-900 dark:text-white">Total Time Spent</h2>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalTimeSpent}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center">
                  <div className="bg-blue-500 text-white p-3 rounded-full mr-4">
                    <CheckIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-medium mb-1 text-gray-900 dark:text-white">Completed Cycles</h2>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{students.filter(s => s.current_status === 'OUT').length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center">
                  <div className="bg-red-500 text-white p-3 rounded-full mr-4">
                    <XIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-medium mb-1 text-gray-900 dark:text-white">Never Entered</h2>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.notCheckedIn}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center">
                  <div className="bg-secondary text-white p-3 rounded-full mr-4">
                    <ChartIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-medium mb-1 text-gray-900 dark:text-white">Participation Rate</h2>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.checkInRate}%</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Student List</h2>

                  <div className="flex flex-wrap gap-2">
                    <div className="flex space-x-2">
                      <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 text-xs rounded-full">
                        {stats.currentlyInside} Inside
                      </span>
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100 text-xs rounded-full">
                        {students.filter(s => s.current_status === 'OUT').length} Completed
                      </span>
                      <span className="px-3 py-1 bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100 text-xs rounded-full">
                        {stats.notCheckedIn} Never Entered
                      </span>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={handlePrintStudentList}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg flex items-center gap-1"
                      >
                        <PrinterIcon className="h-3 w-3" />
                        Print List
                      </button>

                      <button
                        onClick={handleExportToExcel}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg flex items-center gap-1"
                      >
                        <DocumentIcon className="h-3 w-3" />
                        Export to Excel
                      </button>
                    </div>
                  </div>
                </div>

                {/* Search input */}
                <div className="mb-6">
                  <input
                    type="search"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                </div>

                <div className="overflow-x-auto">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center">
                      <span className="text-gray-900 dark:text-white mr-2">
                        {selectedStudents.length > 0 ? `${selectedStudents.length} selected` : ''}
                      </span>
                    </div>
                    {selectedStudents.length > 0 && (
                      <div className="flex space-x-2">
                        <button
                          onClick={handleSendTickets}
                          className="px-3 py-1.5 bg-secondary hover:bg-secondary-dark text-white text-xs rounded-lg flex items-center gap-1"
                          disabled={isSendingTickets}
                        >
                          {isSendingTickets ? <ClockIcon className="h-3 w-3" /> : <MailIcon className="h-3 w-3" />}
                          Send Tickets ({selectedStudents.length})
                        </button>

                        <button
                          onClick={handleMultiDelete}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg flex items-center gap-1"
                        >
                          <TrashIcon className="h-3 w-3" />
                          Delete Selected ({selectedStudents.length})
                        </button>
                      </div>
                    )}
                  </div>

                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-10">
                          <input
                            type="checkbox"
                            className="form-checkbox h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary"
                            checked={students.length > 0 && selectedStudents.length === students.length}
                            onChange={handleSelectAll}
                          />
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Email
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Registration Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Current Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Time In/Out
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Session Time
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredStudents.length > 0 ? (
                        filteredStudents.map((student) => (
                          <tr
                            key={student.id}
                            className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedStudents.includes(student.id) ? 'bg-primary/10' : ''}`}
                          >
                            <td className="px-2 py-4 whitespace-nowrap text-center">
                              <input
                                type="checkbox"
                                className="form-checkbox h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary"
                                checked={selectedStudents.includes(student.id)}
                                onChange={() => handleToggleSelect(student.id)}
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {student.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                              {student.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                              {formatDate(student.created_at)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {(() => {
                                const statusDisplay = getStatusDisplay(student.current_status || 'NEVER_ENTERED');
                                return (
                                  <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusDisplay.color} items-center gap-1`}>
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
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                              {student.current_status === 'IN' && student.time_in ? (
                                <span className="text-blue-600 font-medium">
                                  {calculateTimeSpent(student.time_in)}
                                </span>
                              ) : student.total_time_spent ? (
                                <span className="text-gray-600">
                                  {formatDuration(student.total_time_spent)}
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleViewBarcode(student)}
                                  className="px-3 py-1.5 bg-primary hover:bg-primary-dark text-white text-xs rounded-lg flex items-center gap-1"
                                >
                                  <QrCodeIcon className="h-3 w-3" />
                                  Barcode
                                </button>

                                <button
                                  onClick={() => handleEditStudent(student)}
                                  className="px-3 py-1.5 bg-secondary hover:bg-secondary-dark text-white text-xs rounded-lg flex items-center gap-1"
                                >
                                  <EditIcon className="h-3 w-3" />
                                  Edit
                                </button>

                                <button
                                  onClick={() => handleDeleteStudent(student)}
                                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg flex items-center gap-1"
                                >
                                  <TrashIcon className="h-3 w-3" />
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                            {searchQuery ? 'No students found matching your search' : 'No students registered yet'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-8 flex justify-center space-x-6">
                  <Link href="/register" className="btn-primary flex items-center gap-2 px-6 py-3 rounded shadow-lg hover:shadow-xl">
                    <RegisterIcon className="h-5 w-5" />
                    Register New Student
                  </Link>

                  <Link href="/check-in" className="btn-secondary flex items-center gap-2 px-6 py-3 rounded shadow-lg hover:shadow-xl">
                    <CheckInIcon className="h-5 w-5" />
                    Check-in Students
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Barcode Modal */}
      <BarcodeModal
        student={selectedStudent}
        isOpen={isBarcodeModalOpen}
        onClose={handleCloseModal}
      />

      {/* Edit Student Modal */}
      <EditStudentModal
        student={selectedStudent}
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSave={handleSaveStudent}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        student={selectedStudent}
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
      />

      {/* Multi-Delete Confirmation Modal */}
      {isMultiDeleteModalOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 z-50"
            onClick={handleCloseMultiDeleteModal}
            aria-label="Close modal"
            role="button"
            tabIndex={0}
          />

          {/* Modal */}
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md px-4 sm:px-0">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden border border-white/20">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Confirm Deletion</h2>
                    <button
                      onClick={handleCloseMultiDeleteModal}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white transition-colors"
                      aria-label="Close modal"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </div>
                    <p className="text-center text-gray-700 dark:text-gray-300 mb-2">
                      Are you sure you want to delete <span className="font-semibold">{selectedStudents.length}</span> selected student{selectedStudents.length !== 1 ? 's' : ''}?
                    </p>
                    <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                      This action cannot be undone.
                    </p>
                  </div>

                  <div className="flex justify-center space-x-3">
                    <button
                      onClick={handleCloseMultiDeleteModal}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg transition-colors"
                      disabled={isMultiDeleting}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmMultiDelete}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                      disabled={isMultiDeleting}
                    >
                      {isMultiDeleting ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Deleting...
                        </span>
                      ) : `Delete ${selectedStudents.length} Student${selectedStudents.length !== 1 ? 's' : ''}`}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
    </div>
  );
}
