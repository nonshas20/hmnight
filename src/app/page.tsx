'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const [isHovering, setIsHovering] = useState(false);
  const { user, isLoggedIn } = useAuth();

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary-light via-background to-secondary-light dark:from-primary-dark dark:via-background-dark dark:to-secondary-dark relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20">
        <div className="absolute top-10 left-10 w-40 h-40 rounded-full bg-accent animate-float" style={{ animationDelay: '0s' }}></div>
        <div className="absolute bottom-20 right-10 w-60 h-60 rounded-full bg-primary animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/3 right-1/4 w-20 h-20 rounded-full bg-secondary animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-1/4 left-1/4 w-32 h-32 rounded-full bg-accent/50 animate-float" style={{ animationDelay: '3s' }}></div>
      </div>

      <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-screen relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16 relative"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="absolute -top-20 left-1/2 transform -translate-x-1/2 w-40 h-40 bg-accent/10 rounded-full blur-3xl animate-pulse-glow"
          ></motion.div>

          <h1 className="text-5xl md:text-7xl font-bold font-display mb-6 gradient-text drop-shadow-lg">
            {isLoggedIn ? `Welcome back, ${user?.name}!` : 'HM Night Event'}
          </h1>

          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '100px' }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="h-1 bg-gradient-to-r from-primary to-secondary rounded-full mx-auto mb-6"
          ></motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-xl md:text-2xl text-gray-700 dark:text-gray-200 max-w-2xl mx-auto font-light"
          >
            Registration and check-in system for the most exciting night of the year
          </motion.p>
        </motion.div>

        {isLoggedIn && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mb-16">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              whileHover={{
                scale: 1.03,
                boxShadow: "0 20px 30px -10px rgba(255, 51, 102, 0.3)",
                y: -5
              }}
              whileTap={{ scale: 0.98 }}
              className="card glass border border-primary/20 overflow-hidden relative group"
            >
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all duration-500"></div>
              <div className="absolute -left-5 -bottom-5 w-28 h-28 bg-primary/10 rounded-full blur-xl"></div>

              <Link href="/register" className="block h-full p-8 relative z-10">
                <div className="bg-primary/90 text-white p-3 rounded-full w-16 h-16 flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>

                <h2 className="text-3xl font-bold font-display mb-4 text-primary dark:text-primary-light group-hover:translate-x-2 transition-transform duration-300">Register Students</h2>

                <p className="mb-6 text-gray-600 dark:text-gray-300">Add new students to the event and generate tickets with barcodes</p>

                <div className="flex justify-end">
                  <span className="text-primary text-3xl group-hover:translate-x-2 transition-transform duration-300">→</span>
                </div>

                <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-primary to-primary-light w-0 group-hover:w-full transition-all duration-500"></div>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              whileHover={{
                scale: 1.03,
                boxShadow: "0 20px 30px -10px rgba(51, 102, 255, 0.3)",
                y: -5
              }}
              whileTap={{ scale: 0.98 }}
              className="card glass border border-secondary/20 overflow-hidden relative group"
            >
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-secondary/10 rounded-full blur-2xl group-hover:bg-secondary/20 transition-all duration-500"></div>
              <div className="absolute -left-5 -bottom-5 w-28 h-28 bg-secondary/10 rounded-full blur-xl"></div>

              <Link href="/check-in" className="block h-full p-8 relative z-10">
                <div className="bg-secondary/90 text-white p-3 rounded-full w-16 h-16 flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>

                <h2 className="text-3xl font-bold font-display mb-4 text-secondary dark:text-secondary-light group-hover:translate-x-2 transition-transform duration-300">Check-in Students</h2>

                <p className="mb-6 text-gray-600 dark:text-gray-300">Scan barcodes or search for students to check them in</p>

                <div className="flex justify-end">
                  <span className="text-secondary text-3xl group-hover:translate-x-2 transition-transform duration-300">→</span>
                </div>

                <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-secondary to-secondary-light w-0 group-hover:w-full transition-all duration-500"></div>
              </Link>
            </motion.div>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="relative"
        >
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="btn-accent flex items-center px-8 py-3 rounded-full shadow-lg"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="font-medium">View Dashboard</span>
              <motion.span
                animate={{ x: isHovering ? 5 : 0 }}
                transition={{ duration: 0.2 }}
                className="inline-block ml-2"
              >
                →
              </motion.span>
            </Link>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <Link
                href="/login"
                className="btn-secondary flex items-center px-8 py-3 rounded-full shadow-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                <span className="font-medium">Sign In</span>
              </Link>
              <Link
                href="/signup"
                className="btn-primary flex items-center px-8 py-3 rounded-full shadow-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span className="font-medium">Sign Up</span>
              </Link>
            </div>
          )}

          <motion.div
            animate={{
              scale: isHovering ? 1.1 : 1,
              opacity: isHovering ? 0.7 : 0.3
            }}
            transition={{ duration: 0.3 }}
            className="absolute -inset-3 bg-accent/20 rounded-full blur-md -z-10"
          ></motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 dark:text-gray-400"
        >
          © {new Date().getFullYear()} HM Night Event
        </motion.div>
      </div>
    </main>
  );
}
