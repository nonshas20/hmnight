import { createClient } from '@supabase/supabase-js';

// Use hardcoded values if environment variables are not available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gojjygkkwyhszodxfiew.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdvamp5Z2trd3loc3pvZHhmaWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1ODIyOTMsImV4cCI6MjA2NDE1ODI5M30.5SlV-wBTPA-odHf1kYb4OifrxVAKJNb2EyCNZkU3JE4';

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseAnonKey ? 'Key is set' : 'Key is missing');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Student = {
  id: string;
  name: string;
  email: string;
  barcode: string;
  table_number?: string;
  seat_number?: string;
  checked_in: boolean;
  checked_in_at?: string;
  // New time tracking fields
  time_in?: string;
  time_out?: string;
  current_status: 'NEVER_ENTERED' | 'IN' | 'OUT';
  total_time_spent?: string; // PostgreSQL interval as string
  created_at: string;
};

export async function getStudents() {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching students:', error);
    return [];
  }

  return data as Student[];
}

export async function getStudentByBarcode(barcode: string) {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('barcode', barcode)
    .single();

  if (error) {
    console.error('Error fetching student by barcode:', error);
    return null;
  }

  return data as Student;
}

export async function checkInStudent(id: string) {
  const { data, error } = await supabase
    .from('students')
    .update({
      checked_in: true,
      checked_in_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error checking in student:', error);
    return null;
  }

  return data as Student;
}

// New time tracking functions
export async function timeInStudent(id: string) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('students')
    .update({
      time_in: now,
      current_status: 'IN',
      checked_in: true,
      checked_in_at: now
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error timing in student:', error);
    return null;
  }

  return data as Student;
}

export async function timeOutStudent(id: string) {
  const now = new Date().toISOString();

  // First get the current student data to calculate time spent
  const { data: currentStudent, error: fetchError } = await supabase
    .from('students')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !currentStudent) {
    console.error('Error fetching student for time out:', fetchError);
    return null;
  }

  // Calculate total time spent if time_in exists
  if (currentStudent.time_in) {
    const timeIn = new Date(currentStudent.time_in);
    const timeOut = new Date(now);
    const sessionDuration = Math.floor((timeOut.getTime() - timeIn.getTime()) / 1000); // in seconds

    // Simple approach: just store the session duration in seconds format
    const { data: updatedData, error: updateError } = await supabase
      .from('students')
      .update({
        time_out: now,
        current_status: 'OUT',
        total_time_spent: `${sessionDuration} seconds`
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error timing out student:', updateError);
      return null;
    }

    return updatedData as Student;
  } else {
    // If no time_in, just set time_out and status
    const { data, error } = await supabase
      .from('students')
      .update({
        time_out: now,
        current_status: 'OUT'
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error timing out student:', error);
      return null;
    }

    return data as Student;
  }
}

export async function toggleStudentTimeStatus(id: string) {
  // Get current student status
  const { data: student, error: fetchError } = await supabase
    .from('students')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !student) {
    console.error('Error fetching student:', fetchError);
    return null;
  }

  // Determine action based on current status
  switch (student.current_status) {
    case 'NEVER_ENTERED':
      return await timeInStudent(id);
    case 'IN':
      return await timeOutStudent(id);
    case 'OUT':
      // Student has already completed their time in/out cycle
      console.log('Student has already completed their entry/exit cycle');
      return { ...student, error: 'ALREADY_COMPLETED' };
    default:
      console.error('Unknown student status:', student.current_status);
      return null;
  }
}

export async function createStudent(name: string, email: string, barcode: string, tableNumber?: string, seatNumber?: string) {
  try {
    console.log('Creating student:', { name, email, barcode });

    // First check if the students table exists
    const { data: tableData, error: tableError } = await supabase
      .from('students')
      .select('count')
      .limit(1);

    if (tableError) {
      console.error('Error checking students table:', tableError);
      // If table doesn't exist, try to create it
      if (tableError.message.includes('does not exist')) {
        console.log('Attempting to create students table...');
        const { error: createError } = await supabase.rpc('create_students_table');
        if (createError) {
          console.error('Failed to create students table:', createError);
          throw new Error('Database table does not exist and could not be created');
        }
      } else {
        throw new Error(tableError.message);
      }
    }

    // Now insert the student
    const { data, error } = await supabase
      .from('students')
      .insert([
        {
          name,
          email,
          barcode,
          table_number: tableNumber,
          seat_number: seatNumber,
          checked_in: false,
          current_status: 'NEVER_ENTERED',
          total_time_spent: '0 seconds'
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating student:', error);
      throw new Error(error.message);
    }

    console.log('Student created successfully:', data);
    return data as Student;
  } catch (error) {
    console.error('Exception creating student:', error);
    return null;
  }
}

export async function searchStudents(query: string) {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .or(`name.ilike.%${query}%,email.ilike.%${query}%`);

  if (error) {
    console.error('Error searching students:', error);
    return [];
  }

  return data as Student[];
}

export async function checkEmailExists(email: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('id')
      .eq('email', email)
      .limit(1);

    if (error) {
      console.error('Error checking if email exists:', error);
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    console.error('Exception checking if email exists:', error);
    return false;
  }
}

export async function updateStudent(id: string, updates: { name?: string; email?: string; table_number?: string; seat_number?: string }) {
  try {
    console.log('Updating student:', { id, ...updates });

    const { data, error } = await supabase
      .from('students')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating student:', error);
      return null;
    }

    console.log('Student updated successfully:', data);
    return data as Student;
  } catch (error) {
    console.error('Exception updating student:', error);
    return null;
  }
}

export async function deleteStudent(id: string) {
  try {
    console.log('Deleting student:', id);

    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting student:', error);
      return false;
    }

    console.log('Student deleted successfully');
    return true;
  } catch (error) {
    console.error('Exception deleting student:', error);
    return false;
  }
}
