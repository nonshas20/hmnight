'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Student } from '@/lib/supabase';

interface TicketCardProps {
  student: Student;
  barcodeUrl: string;
  onSendEmail: () => void;
  onRegisterAnother: () => void;
}

export default function TicketCard({ 
  student, 
  barcodeUrl, 
  onSendEmail, 
  onRegisterAnother 
}: TicketCardProps) {
  const [ticketUrl, setTicketUrl] = useState<string>('');
  
  useEffect(() => {
    const generateTicket = async () => {
      if (typeof window !== 'undefined' && barcodeUrl) {
        const { generateTicketWithBarcode } = await import('@/utils/barcode');
        const url = await generateTicketWithBarcode(student, barcodeUrl);
        setTicketUrl(url);
      }
    };
    
    generateTicket();
  }, [student, barcodeUrl]);

  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
        </svg>
      </div>
      
      <h2 className="text-2xl font-bold mb-4">Registration Successful!</h2>
      
      <div className="mb-6">
        <p className="text-gray-600 dark:text-gray-300 mb-1">
          <span className="font-medium">Name:</span> {student.name}
        </p>
        <p className="text-gray-600 dark:text-gray-300">
          <span className="font-medium">Email:</span> {student.email}
        </p>
      </div>
      
      {ticketUrl ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6 relative"
        >
          <div className="relative mx-auto max-w-md overflow-hidden rounded-lg shadow-lg">
            <img src={ticketUrl} alt="Event Ticket" className="w-full h-auto" />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-end justify-center p-4">
              <a 
                href={ticketUrl} 
                download={`ticket-${student.name.replace(/\s+/g, '-')}.png`}
                className="bg-white text-primary font-medium py-2 px-4 rounded-full text-sm hover:bg-gray-100 transition-colors"
              >
                Download Ticket
              </a>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="flex justify-center items-center h-40 mb-6">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row gap-4 mt-6">
        <motion.button
          onClick={onSendEmail}
          className="btn-secondary flex-1"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Send Ticket Email
        </motion.button>
        
        <motion.button
          onClick={onRegisterAnother}
          className="btn-primary flex-1"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Register Another
        </motion.button>
      </div>
    </div>
  );
}
