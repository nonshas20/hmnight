import { NextResponse } from 'next/server';
import { sendTicketEmail } from '@/lib/email';
import { Student } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { student, ticketUrl } = await request.json();
    
    if (!student || !ticketUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const success = await sendTicketEmail(student as Student, ticketUrl);
    
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error sending ticket email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
