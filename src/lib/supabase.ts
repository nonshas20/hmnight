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
  time_in?: string;
  time_out?: string;
  current_status: 'NEVER_ENTERED' | 'IN' | 'OUT';
  total_time_spent?: string;
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

export async function timeInStudent(id: string) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('students')
    .update({
      time_in: now,
      time_out: null, // Clear any previous time out
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
    .select('time_in, total_time_spent')
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error('Error fetching student for time out:', fetchError);
    return null;
  }

  let newTotalTimeSpent = currentStudent.total_time_spent || '0 seconds';

  // Calculate additional time if there's a time_in
  if (currentStudent.time_in) {
    const timeIn = new Date(currentStudent.time_in);
    const timeOut = new Date(now);
    const sessionDuration = timeOut.getTime() - timeIn.getTime();

    // Convert to PostgreSQL interval format (in seconds)
    const sessionSeconds = Math.floor(sessionDuration / 1000);

    // Parse existing total time (assuming it's in PostgreSQL interval format)
    const existingSeconds = parsePostgreSQLInterval(currentStudent.total_time_spent);
    const totalSeconds = existingSeconds + sessionSeconds;

    newTotalTimeSpent = `${totalSeconds} seconds`;
  }

  const { data, error } = await supabase
    .from('students')
    .update({
      time_out: now,
      current_status: 'OUT',
      total_time_spent: newTotalTimeSpent
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

// Helper function to parse PostgreSQL interval format
function parsePostgreSQLInterval(interval: string | null): number {
  if (!interval) return 0;

  // Handle simple "X seconds" format
  const secondsMatch = interval.match(/(\d+)\s*seconds?/);
  if (secondsMatch) {
    return parseInt(secondsMatch[1], 10);
  }

  // Handle more complex interval formats if needed
  // For now, default to 0
  return 0;
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
          checked_in: false
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
