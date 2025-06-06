'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfilePage() {
  const { user, isLoggedIn, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push('/login');
    }
  }, [isLoggedIn, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold mb-4">Loading...</h2>
        </div>
      </div>
    );
  }

  if (!isLoggedIn || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Please sign in to view your profile</h2>
          <Link href="/login" className="btn-primary">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary-light via-background to-secondary-light dark:from-primary-dark dark:via-background-dark dark:to-secondary-dark">
      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-2xl mx-auto"
        >
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold font-display mb-4 gradient-text">
              Your Profile
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Manage your HM Night Event account
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="card glass border border-primary/20"
          >
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {user.name}
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                {user.email}
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Account Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Member since:</span>
                    <span className="text-gray-900 dark:text-white">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">User ID:</span>
                    <span className="text-gray-900 dark:text-white font-mono text-xs">
                      {user.id}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/dashboard"
                className="btn-primary flex-1 text-center py-3"
              >
                Go to Dashboard
              </Link>
              <button
                onClick={async () => {
                  await logout();
                  router.push('/');
                }}
                className="btn-secondary flex-1 py-3 hover:bg-red-500 hover:border-red-500 transition-colors duration-200"
              >
                Sign Out
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-center mt-6"
          >
            <Link
              href="/"
              className="text-gray-500 hover:text-primary transition-colors duration-300"
            >
              ← Back to Home
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </main>
  );
}
