import { create } from 'zustand';
import { Student } from './supabase';

interface AppState {
  students: Student[];
  setStudents: (students: Student[]) => void;
  addStudent: (student: Student) => void;
  updateStudent: (student: Student) => void;
  removeStudent: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredStudents: Student[];
  isScanning: boolean;
  setIsScanning: (isScanning: boolean) => void;
  lastScannedStudent: Student | null;
  setLastScannedStudent: (student: Student | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  students: [],
  setStudents: (students) => set({ students }),
  addStudent: (student) => set((state) => ({
    students: [student, ...state.students]
  })),
  updateStudent: (updatedStudent) => set((state) => {
    // Update the student in the main students array
    const updatedStudents = state.students.map(student =>
      student.id === updatedStudent.id ? updatedStudent : student
    );

    // Also update the student in the filtered students array if present
    const updatedFilteredStudents = state.filteredStudents.map(student =>
      student.id === updatedStudent.id ? updatedStudent : student
    );

    return {
      students: updatedStudents,
      filteredStudents: updatedFilteredStudents,
      lastScannedStudent: state.lastScannedStudent?.id === updatedStudent.id
        ? updatedStudent
        : state.lastScannedStudent
    };
  }),
  removeStudent: (id) => set((state) => {
    // Filter out the deleted student from the main students array
    const updatedStudents = state.students.filter(student => student.id !== id);

    // Also filter out the deleted student from the filtered students array
    const updatedFilteredStudents = state.filteredStudents.filter(student => student.id !== id);

    return {
      students: updatedStudents,
      filteredStudents: updatedFilteredStudents,
      lastScannedStudent: state.lastScannedStudent?.id === id
        ? null
        : state.lastScannedStudent
    };
  }),
  searchQuery: '',
  setSearchQuery: (searchQuery) => set((state) => ({
    searchQuery,
    filteredStudents: searchQuery
      ? state.students.filter(student =>
          student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.email.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : state.students
  })),
  filteredStudents: [],
  isScanning: false,
  setIsScanning: (isScanning) => set({ isScanning }),
  lastScannedStudent: null,
  setLastScannedStudent: (lastScannedStudent) => set({ lastScannedStudent }),
}));
