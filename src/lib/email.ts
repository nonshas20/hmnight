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
            <p style="margin-bottom: 20px;">Here is your ticket for the HM Night Event.</p>
          </div>
          
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="${ticketImageUrl}" alt="Event Ticket" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);" />
          </div>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #3366FF; margin-top: 0; margin-bottom: 15px; font-size: 18px;">Important Information</h2>
            <ul style="padding-left: 20px; margin: 0;">
              <li style="margin-bottom: 10px;">Please bring this ticket (printed or on your phone) to the event.</li>
              <li style="margin-bottom: 10px;">Your barcode will be scanned at the entrance.</li>
              <li style="margin-bottom: 10px;">Arrive 15 minutes before the event starts to avoid queues.</li>
              <li style="margin-bottom: 0;">For any questions, please contact the event organizers.</li>
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
