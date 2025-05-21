# HM Night Event Ticket System

A mobile-friendly web application for managing student registrations and check-ins for HM Night events. The system generates barcodes for tickets, sends email confirmations, and provides a dashboard for event management.

## Features

- Student registration with name and email
- Barcode generation for tickets
- Email ticket delivery
- Barcode scanning for check-in
- Manual check-in option
- Dashboard with attendance statistics
- Mobile-friendly responsive design
- Bold and creative visual elements

## Tech Stack

- Next.js (React framework)
- TypeScript
- Tailwind CSS for styling
- Framer Motion for animations
- Supabase for backend and database
- JsBarcode for barcode generation
- Nodemailer for email functionality

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Supabase account (for database)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/hmnight.git
cd hmnight
```

2. Run the setup script (Linux/Mac) or follow the manual steps (Windows):
```bash
# Linux/Mac
chmod +x setup.sh
./setup.sh

# Windows (manual steps)
npm install
mkdir -p public/sounds
# Create a placeholder beep.mp3 file in public/sounds directory
```

3. Set up environment variables:
The `.env.local` file is already created with the following variables:
```
NEXT_PUBLIC_SUPABASE_URL=https://espcgyteztrqzfarqafq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzcGNneXRlenRycXpmYXJxYWZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1NDE3MjUsImV4cCI6MjA2MTExNzcyNX0.gANfSCZWmJGDXY3alVTW8sBV8UeVvxRa-S2xLcWvOOs

# Gmail SMTP settings
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=miceattendance@gmail.com
EMAIL_PASS=zxno kmcw uymf wjur
```

4. Set up the Supabase database:
   - Log in to your Supabase account and go to your project
   - Navigate to the SQL Editor
   - Copy the contents of `database-setup.sql` and run it in the SQL Editor
   - This will create the necessary tables and indexes

5. Run the development server:
```bash
npm run dev
# or
yarn dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### Troubleshooting

If you encounter any issues with barcode scanning:
- Make sure you're using a secure context (HTTPS or localhost)
- Allow camera permissions when prompted
- Try using Chrome or Edge browsers for best compatibility
- If testing on mobile, use a real device rather than an emulator

## Database Setup

Create the following table in your Supabase database:

```sql
CREATE TABLE students (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  barcode TEXT NOT NULL UNIQUE,
  checked_in BOOLEAN DEFAULT FALSE,
  checked_in_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster barcode lookups
CREATE INDEX idx_students_barcode ON students(barcode);
```

## Usage

1. **Home Page**: Navigate between registration, check-in, and dashboard
2. **Registration**: Add new students and generate tickets with barcodes
3. **Check-in**: Scan barcodes or manually search for students to check them in
4. **Dashboard**: View attendance statistics and student list

## Customization

- Modify the ticket design by editing the `generateTicketWithBarcode` function in `src/utils/barcode.ts`
- Customize email templates in `src/lib/email.ts`
- Adjust colors and styling in `tailwind.config.ts` and `src/styles/globals.css`

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Framer Motion](https://www.framer.com/motion/)
- [Supabase](https://supabase.io/)
- [JsBarcode](https://github.com/lindell/JsBarcode)
