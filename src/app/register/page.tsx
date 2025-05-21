'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { generateBarcodeValue } from '@/utils/barcode';
import { createStudent, checkEmailExists } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';

type FormData = {
  name: string;
  email: string;
};

export default function RegisterPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredStudent, setRegisteredStudent] = useState<any>(null);
  const [barcodeUrl, setBarcodeUrl] = useState<string>('');
  const [compositeTicketUrl, setCompositeTicketUrl] = useState<string>('');
  const addStudent = useAppStore((state) => state.addStudent);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>();

  // Generate composite ticket when barcode is available
  useEffect(() => {
    const generateCompositeTicket = async () => {
      if (barcodeUrl && registeredStudent) {
        try {
          const { generateTicketWithBarcode } = await import('@/utils/barcode');
          const compositeUrl = await generateTicketWithBarcode(
            registeredStudent,
            barcodeUrl
          );
          setCompositeTicketUrl(compositeUrl);
        } catch (error) {
          console.error('Error generating composite ticket:', error);
        }
      }
    };

    generateCompositeTicket();
  }, [barcodeUrl, registeredStudent]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    try {
      // Check if email already exists
      const emailExists = await checkEmailExists(data.email);

      if (emailExists) {
        toast.error('This email is already registered. Please use a different email address.');
        setIsSubmitting(false);
        return;
      }

      // Generate a unique barcode
      const barcodeValue = generateBarcodeValue();

      console.log('Registering student:', data.name, data.email, barcodeValue);

      // Create student in database
      const student = await createStudent(data.name, data.email, barcodeValue);

      if (student) {
        console.log('Student registered successfully:', student);

        // Add to local state
        addStudent(student);
        setRegisteredStudent(student);

        // Generate barcode image on client side
        try {
          const { generateBarcodeDataUrl } = await import('@/utils/barcode');
          const dataUrl = await generateBarcodeDataUrl(barcodeValue);
          console.log('Barcode generated successfully');
          setBarcodeUrl(dataUrl);
        } catch (error) {
          console.error('Error generating barcode:', error);
          toast.error('Failed to generate barcode');
        }

        toast.success('Student registered successfully!');
        reset();
      } else {
        console.error('Failed to register student - null response');
        toast.error('Failed to register student - please check console for details');
      }
    } catch (error) {
      console.error('Registration error:', error);
      let errorMessage = 'An error occurred during registration';

      if (error instanceof Error) {
        errorMessage += ': ' + error.message;
      }

      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendEmail = async () => {
    if (!registeredStudent || !barcodeUrl) return;

    try {
      toast.loading('Sending email...');

      // Generate ticket with barcode
      const { generateTicketWithBarcode } = await import('@/utils/barcode');
      const ticketUrl = await generateTicketWithBarcode(
        registeredStudent,
        barcodeUrl
      );

      // Send email with ticket
      const response = await fetch('/api/send-ticket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student: registeredStudent,
          ticketUrl,
        }),
      });

      if (response.ok) {
        toast.dismiss();
        toast.success('Ticket sent to student\'s email');
      } else {
        toast.dismiss();
        toast.error('Failed to send email');
      }
    } catch (error) {
      console.error('Email error:', error);
      toast.dismiss();
      toast.error('An error occurred while sending the email');
    }
  };

  const handleRegisterAnother = () => {
    setRegisteredStudent(null);
    setBarcodeUrl('');
    setCompositeTicketUrl('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light via-background to-secondary-light dark:from-primary-dark dark:via-background-dark dark:to-secondary-dark relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20">
        <div className="absolute top-10 left-10 w-40 h-40 rounded-full bg-accent animate-float" style={{ animationDelay: '0s' }}></div>
        <div className="absolute bottom-20 right-10 w-60 h-60 rounded-full bg-primary animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/3 right-1/4 w-20 h-20 rounded-full bg-secondary animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="container mx-auto px-4 py-8 md:py-12 relative z-10">
        <Link href="/" className="inline-flex items-center text-white bg-primary/80 hover:bg-primary px-4 py-2 rounded-full shadow-md transition-all duration-300 mb-8">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Home
        </Link>

        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-6xl font-bold font-display mb-4 text-center gradient-text drop-shadow-lg"
        >
          Student Registration
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center text-lg mb-10 max-w-2xl mx-auto text-gray-700 dark:text-gray-300"
        >
          Register for the HM Night Event and receive your ticket with a unique barcode
        </motion.p>

        <div className="max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            {!registeredStudent ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="card glass border border-white/20 shadow-xl"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-accent rounded-bl-3xl rounded-tr-xl -mt-4 -mr-4 flex items-center justify-center transform rotate-12 shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <label htmlFor="name" className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Full Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      className="input-field bg-white/80 dark:bg-gray-800/80 border-2 border-gray-300 dark:border-gray-700 py-3 text-lg shadow-sm focus:ring-4"
                      placeholder="Enter student's full name"
                      {...register('name', { required: 'Name is required' })}
                    />
                    {errors.name && (
                      <p className="mt-2 text-sm font-medium text-red-600 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        {errors.name.message}
                      </p>
                    )}
                  </motion.div>

                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <label htmlFor="email" className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      className="input-field bg-white/80 dark:bg-gray-800/80 border-2 border-gray-300 dark:border-gray-700 py-3 text-lg shadow-sm focus:ring-4"
                      placeholder="Enter student's email address"
                      {...register('email', {
                        required: 'Email is required',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Invalid email address'
                        }
                      })}
                    />
                    {errors.email && (
                      <p className="mt-2 text-sm font-medium text-red-600 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        {errors.email.message}
                      </p>
                    )}
                  </motion.div>

                  <motion.button
                    type="submit"
                    className="btn-primary w-full py-3 text-lg font-bold shadow-lg"
                    disabled={isSubmitting}
                    whileHover={{ scale: 1.03, boxShadow: "0 10px 25px -5px rgba(255, 51, 102, 0.4)" }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      <>
                        <span>Register Student</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </>
                    )}
                  </motion.button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="card glass border border-white/20 shadow-xl overflow-hidden"
              >
                {/* Success banner */}
                <div className="bg-gradient-to-r from-green-400 to-green-600 -mx-6 -mt-6 py-4 px-6 mb-6 shadow-md">
                  <div className="flex items-center justify-center">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mr-4 shadow-lg">
                      <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path>
                      </svg>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white">Registration Successful!</h2>
                  </div>
                </div>

                <div className="px-2">
                  {/* Two column layout for desktop - left side for info, right side for ticket */}
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Left column - Student info and barcode */}
                    <div className="md:w-1/2">
                      <motion.div
                        className="mb-8 bg-white/50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-inner"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                      >
                        <div className="grid grid-cols-1 gap-4">
                          <div className="flex items-center p-2 rounded-lg bg-white/80 dark:bg-gray-700/80 shadow-sm">
                            <div className="bg-primary/10 p-3 rounded-full mr-3">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                            <div className="text-left">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Student Name</p>
                              <p className="font-medium text-gray-800 dark:text-white">{registeredStudent.name}</p>
                            </div>
                          </div>

                          <div className="flex items-center p-2 rounded-lg bg-white/80 dark:bg-gray-700/80 shadow-sm">
                            <div className="bg-secondary/10 p-3 rounded-full mr-3">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div className="text-left">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Email Address</p>
                              <p className="font-medium text-gray-800 dark:text-white truncate max-w-[180px]">{registeredStudent.email}</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>


                    </div>

                    {/* Right column - Ticket image */}
                    <motion.div
                      className="md:w-1/2 flex items-center justify-center"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <div className="relative max-w-full">
                        <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-lg blur opacity-30"></div>
                        <div className="relative bg-white dark:bg-gray-800 rounded-lg p-3 shadow-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                              </svg>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Your Event Ticket</p>
                            </div>
                            {compositeTicketUrl && (
                              <a
                                href={compositeTicketUrl}
                                download={`ticket-${registeredStudent?.name?.replace(/\s+/g, '-') || 'event'}.png`}
                                className="flex items-center justify-center p-1.5 bg-primary hover:bg-primary-dark text-white rounded-full shadow transition-all duration-300 hover:scale-110 hover:shadow-lg"
                                title="Download Ticket"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                              </a>
                            )}
                          </div>
                          <div className="flex justify-center relative">
                            {compositeTicketUrl ? (
                              <div className="relative">
                                <img
                                  src={compositeTicketUrl}
                                  alt="HM Gala Ticket with Barcode"
                                  className="max-w-full h-auto rounded-md shadow-md transform transition-transform duration-300 hover:scale-105"
                                />
                              </div>
                            ) : (
                              <img
                                src="/assets/img/hmgalaticket.png"
                                alt="HM Gala Ticket"
                                className="max-w-full h-auto rounded-md shadow-md transform transition-transform duration-300 hover:scale-105"
                              />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">Present this ticket at the event entrance</p>
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 mb-4">
                    <motion.button
                      onClick={handleSendEmail}
                      className="btn-secondary py-3 flex items-center justify-center"
                      whileHover={{ scale: 1.03, boxShadow: "0 10px 25px -5px rgba(51, 102, 255, 0.4)" }}
                      whileTap={{ scale: 0.98 }}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Send Ticket Email
                    </motion.button>

                    <motion.button
                      onClick={handleRegisterAnother}
                      className="btn-primary py-3 flex items-center justify-center"
                      whileHover={{ scale: 1.03, boxShadow: "0 10px 25px -5px rgba(255, 51, 102, 0.4)" }}
                      whileTap={{ scale: 0.98 }}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Register Another
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
