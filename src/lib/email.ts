import nodemailer from 'nodemailer';
import { Student } from './supabase';

// Create a transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendTicketEmail(student: Student, ticketImageUrl: string) {
  try {
    const info = await transporter.sendMail({
      from: `"HM Night Event" <${process.env.EMAIL_USER}>`,
      to: student.email,
      subject: "Your HM Night Event Ticket",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #FF3366; margin-bottom: 10px;">HM Night Event</h1>
            <p style="font-size: 18px; margin-bottom: 5px;">Hello ${student.name}!</p>
            <p style="margin-bottom: 20px;">Your ticket for the HM Night Event is attached to this email.</p>
            ${student.table_number ? `<p style="font-weight: bold; color: #3366FF; margin-bottom: 20px;">Table: ${student.table_number} | Seat: ${student.seat_number || 'N/A'}</p>` : ''}
          </div>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #3366FF; margin-top: 0; margin-bottom: 15px; font-size: 18px;">Important Information</h2>
            <ul style="padding-left: 20px; margin: 0;">
              <li style="margin-bottom: 10px;">📱 Download and save the attached ticket to your phone</li>
              <li style="margin-bottom: 10px;">🔍 Your barcode will be scanned at the entrance</li>
              <li style="margin-bottom: 10px;">⏰ Arrive 15 minutes early to avoid queues</li>
              <li style="margin-bottom: 0;">❓ Contact event organizers for any questions</li>
            </ul>
          </div>
          
          <div style="text-align: center; color: #666; font-size: 14px;">
            <p>We look forward to seeing you at the event!</p>
            <p style="margin-bottom: 0;">HM Night Event Team</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: 'ticket.png',
          path: ticketImageUrl,
          cid: 'ticket'
        }
      ]
    });

    console.log("Email sent: %s", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}
