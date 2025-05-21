'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Student } from '@/lib/supabase';
import { generateBarcodeDataUrl } from '@/utils/barcode';
import Image from 'next/image';

interface BarcodeModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function BarcodeModal({ student, isOpen, onClose }: BarcodeModalProps) {
  const [barcodeUrl, setBarcodeUrl] = useState<string>('');
  const [ticketUrl, setTicketUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  useEffect(() => {
    const generateTicket = async () => {
      if (student && isOpen) {
        setIsLoading(true);
        try {
          // First generate the barcode
          const barcodeDataUrl = await generateBarcodeDataUrl(student.barcode);
          setBarcodeUrl(barcodeDataUrl);

          // Then generate the ticket with the barcode
          const { generateTicketWithBarcode } = await import('@/utils/barcode');
          const ticketDataUrl = await generateTicketWithBarcode(
            student,
            barcodeDataUrl
          );
          setTicketUrl(ticketDataUrl);
        } catch (error) {
          console.error('Error generating ticket:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    generateTicket();
  }, [student, isOpen]);

  // Handle swipe down to close on mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 100) {
      // Swipe up, do nothing
    }
    if (touchEnd - touchStart > 100) {
      // Swipe down, close modal
      onClose();
    }
    // Reset values
    setTouchStart(0);
    setTouchEnd(0);
  };

  // Close on escape key and handle touch events for mobile
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    // Add event listeners
    window.addEventListener('keydown', handleEsc);

    // Clean up
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  if (!student) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={onClose}
            onTouchEnd={onClose}
            aria-label="Close modal"
            role="button"
            tabIndex={0}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 inset-x-0 z-50 sm:bottom-auto sm:inset-x-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 w-full max-w-md px-4 sm:px-0 max-h-[90vh] sm:max-h-[85vh]"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden border border-white/20 max-h-[90vh] sm:max-h-[85vh] flex flex-col"
            >
              <div className="p-4 sm:p-6 overflow-y-auto">
                {/* Mobile swipe indicator - only visible on small screens */}
                <div className="h-1 w-16 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-3 sm:hidden"></div>
                <div className="flex justify-between items-center mb-3 sm:mb-4">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">Event Ticket</h2>
                  <button
                    onClick={onClose}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white transition-colors p-2 -mr-2"
                    aria-label="Close modal"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="text-center mb-4">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white mb-1">{student.name}</h3>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">{student.email}</p>
                </div>

                <div className="rounded-lg p-2 sm:p-4 shadow-inner mb-4 bg-gray-100 dark:bg-gray-700">
                  {isLoading ? (
                    <div className="flex justify-center items-center h-48 sm:h-64">
                      <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-4 border-primary border-t-transparent"></div>
                    </div>
                  ) : (
                    <div className="flex justify-center">
                      <div className="relative">
                        <img
                          src={ticketUrl}
                          alt="Event Ticket"
                          className="max-w-full h-auto rounded-lg shadow-md"
                          style={{
                            maxHeight: '50vh'
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Close
                  </button>
                  {!isLoading && ticketUrl && (
                    <a
                      href={ticketUrl}
                      download={`ticket-${student.name.replace(/\s+/g, '-')}.png`}
                      className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg shadow transition-colors flex items-center justify-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Ticket
                    </a>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
