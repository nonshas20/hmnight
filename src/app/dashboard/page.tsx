'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { getStudents, searchStudents } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { Student } from '@/lib/supabase';
import BarcodeModal from '@/components/BarcodeModal';
import EditStudentModal from '@/components/EditStudentModal';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import { printStudentList, exportToExcel } from '@/utils/export';

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
  });

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
      const total = students.length;

      setStats({
        total,
        checkedIn,
        notCheckedIn: total - checkedIn,
        checkInRate: total > 0 ? Math.round((checkedIn / total) * 100) : 0,
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

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
            Event <span className="gradient-text">Dashboard</span>
          </h1>

          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '150px' }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="h-1 bg-gradient-to-r from-primary to-secondary rounded-full mx-auto mb-6"
          ></motion.div>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-primary border-t-transparent"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                whileHover={{ scale: 1.03, y: -5 }}
                className="card glass border border-primary/20 shadow-xl overflow-hidden relative"
              >
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/20 rounded-full blur-2xl"></div>
                <div className="flex items-center">
                  <div className="bg-primary/90 text-white p-3 rounded-full w-14 h-14 flex items-center justify-center mr-4 shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-medium mb-1 text-white">Total Registrations</h2>
                    <p className="text-4xl font-bold text-white">{stats.total}</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.03, y: -5 }}
                className="card glass border border-green-400/20 shadow-xl overflow-hidden relative"
              >
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-green-400/20 rounded-full blur-2xl"></div>
                <div className="flex items-center">
                  <div className="bg-green-500/90 text-white p-3 rounded-full w-14 h-14 flex items-center justify-center mr-4 shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-medium mb-1 text-white">Checked In</h2>
                    <p className="text-4xl font-bold text-white">{stats.checkedIn}</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                whileHover={{ scale: 1.03, y: -5 }}
                className="card glass border border-red-400/20 shadow-xl overflow-hidden relative"
              >
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-red-400/20 rounded-full blur-2xl"></div>
                <div className="flex items-center">
                  <div className="bg-red-500/90 text-white p-3 rounded-full w-14 h-14 flex items-center justify-center mr-4 shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-medium mb-1 text-white">Not Checked In</h2>
                    <p className="text-4xl font-bold text-white">{stats.notCheckedIn}</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                whileHover={{ scale: 1.03, y: -5 }}
                className="card glass border border-secondary/20 shadow-xl overflow-hidden relative"
              >
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-secondary/20 rounded-full blur-2xl"></div>
                <div className="flex items-center">
                  <div className="bg-secondary/90 text-white p-3 rounded-full w-14 h-14 flex items-center justify-center mr-4 shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-medium mb-1 text-white">Check-in Rate</h2>
                    <p className="text-4xl font-bold text-white">{stats.checkInRate}%</p>
                  </div>
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="card glass border border-white/20 shadow-2xl overflow-hidden relative"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/20 to-secondary/20 blur-xl opacity-50"></div>
              <div className="relative z-10">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                  <h2 className="text-2xl font-bold text-white">Student List</h2>

                  <div className="flex flex-wrap gap-2">
                    <div className="flex space-x-2">
                      <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">
                        {stats.checkedIn} Checked In
                      </span>
                      <span className="px-3 py-1 bg-red-500/20 text-red-400 text-xs rounded-full border border-red-500/30">
                        {stats.notCheckedIn} Pending
                      </span>
                    </div>

                    <div className="flex space-x-2">
                      <motion.button
                        onClick={handlePrintStudentList}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-3 py-1 bg-blue-600/80 hover:bg-blue-600 text-white text-xs rounded-lg transition-colors flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Print List
                      </motion.button>

                      <motion.button
                        onClick={handleExportToExcel}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-3 py-1 bg-green-600/80 hover:bg-green-600 text-white text-xs rounded-lg transition-colors flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export to Excel
                      </motion.button>
                    </div>
                  </div>
                </div>

                {/* Search input */}
                <div className="mb-6">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                      </svg>
                    </div>
                    <input
                      type="search"
                      className="block w-full p-3 pl-10 text-sm bg-gray-800/50 border border-gray-600 rounded-lg placeholder-gray-400 text-white focus:ring-primary focus:border-primary"
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-white/10">
                  <div className="overflow-x-auto">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center">
                        <span className="text-white mr-2">
                          {selectedStudents.length > 0 ? `${selectedStudents.length} selected` : ''}
                        </span>
                      </div>
                      {selectedStudents.length > 0 && (
                        <div className="flex space-x-2">
                          <motion.button
                            onClick={handleSendTickets}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-3 py-1.5 bg-secondary/80 hover:bg-secondary text-white text-xs rounded-lg transition-colors flex items-center"
                            disabled={isSendingTickets}
                          >
                            {isSendingTickets ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-1"></div>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            )}
                            Send Tickets ({selectedStudents.length})
                          </motion.button>

                          <motion.button
                            onClick={handleMultiDelete}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white text-xs rounded-lg transition-colors flex items-center"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete Selected ({selectedStudents.length})
                          </motion.button>
                        </div>
                      )}
                    </div>

                    <table className="min-w-full divide-y divide-gray-200/20">
                      <thead className="bg-black/30">
                        <tr>
                          <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-white uppercase tracking-wider w-10">
                            <input
                              type="checkbox"
                              className="form-checkbox h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary"
                              checked={students.length > 0 && selectedStudents.length === students.length}
                              onChange={handleSelectAll}
                            />
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                            Name
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                            Email
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                            Registration Date
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                            Status
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                            Check-in Time
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200/20">
                        {filteredStudents.length > 0 ? (
                          filteredStudents.map((student) => (
                            <tr
                              key={student.id}
                              className={`hover:bg-white/10 transition-colors ${selectedStudents.includes(student.id) ? 'bg-primary/10' : ''}`}
                            >
                              <td className="px-2 py-4 whitespace-nowrap text-center">
                                <input
                                  type="checkbox"
                                  className="form-checkbox h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary"
                                  checked={selectedStudents.includes(student.id)}
                                  onChange={() => handleToggleSelect(student.id)}
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                                {student.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                {student.email}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                {formatDate(student.created_at)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {student.checked_in ? (
                                  <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                                    Checked In
                                  </span>
                                ) : (
                                  <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                                    Not Checked In
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                {student.checked_in_at ? formatDate(student.checked_in_at) : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <div className="flex space-x-2">
                                  <motion.button
                                    onClick={() => handleViewBarcode(student)}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="px-3 py-1.5 bg-primary/80 hover:bg-primary text-white text-xs rounded-lg transition-colors flex items-center"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1v-2a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                    </svg>
                                    Barcode
                                  </motion.button>

                                  <motion.button
                                    onClick={() => handleEditStudent(student)}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="px-3 py-1.5 bg-secondary/80 hover:bg-secondary text-white text-xs rounded-lg transition-colors flex items-center"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                    Edit
                                  </motion.button>

                                  <motion.button
                                    onClick={() => handleDeleteStudent(student)}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white text-xs rounded-lg transition-colors flex items-center"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Delete
                                  </motion.button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-300">
                              {searchQuery ? 'No students found matching your search' : 'No students registered yet'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-8 flex justify-center space-x-6">
                  <motion.div
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Link href="/register" className="btn-primary flex items-center px-6 py-3 rounded-full shadow-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      Register New Student
                    </Link>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Link href="/check-in" className="btn-secondary flex items-center px-6 py-3 rounded-full shadow-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      Check-in Students
                    </Link>
                  </motion.div>
                </div>
              </div>
            </motion.div>
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
      <AnimatePresence>
        {isMultiDeleteModalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
              onClick={handleCloseMultiDeleteModal}
              aria-label="Close modal"
              role="button"
              tabIndex={0}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md px-4 sm:px-0"
            >
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
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
