import { NextResponse } from 'next/server';
import { updateStudent, deleteStudent } from '@/lib/supabase';

// Update a student
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const { name, email, table_number, seat_number } = await request.json();

    if (!id || (!name && !email && !table_number && !seat_number)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const updates: { name?: string; email?: string; table_number?: string; seat_number?: string } = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (table_number) updates.table_number = table_number;
    if (seat_number) updates.seat_number = seat_number;
    
    const updatedStudent = await updateStudent(id, updates);
    
    if (updatedStudent) {
      return NextResponse.json(updatedStudent);
    } else {
      return NextResponse.json(
        { error: 'Failed to update student' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating student:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete a student
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing student ID' },
        { status: 400 }
      );
    }
    
    const success = await deleteStudent(id);
    
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Failed to delete student' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error deleting student:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
