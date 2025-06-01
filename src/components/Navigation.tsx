'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { HomeIcon, RegisterIcon, CheckInIcon, DashboardIcon, UserIcon, LogoutIcon, LoginIcon, MenuIcon, CloseIcon } from '@/components/Icons';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { user, isLoggedIn, logout } = useAuth();

  const isActive = useCallback((path: string) => pathname === path, [pathname]);

  const toggleMenu = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <div className="bg-primary p-2 rounded mr-2">
                <span className="text-white font-bold text-sm">HM</span>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">HM Night</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-1">
            <NavLink href="/" isActive={isActive('/')} onClick={closeMenu}>
              Home
            </NavLink>
            {isLoggedIn && (
              <>
                <NavLink href="/register" isActive={isActive('/register')} onClick={closeMenu}>
                  Register
                </NavLink>
                <NavLink href="/check-in" isActive={isActive('/check-in')} onClick={closeMenu}>
                  Check-in
                </NavLink>
                <NavLink href="/dashboard" isActive={isActive('/dashboard')} onClick={closeMenu}>
                  Dashboard
                </NavLink>
                <NavLink href="/profile" isActive={isActive('/profile')} onClick={closeMenu}>
                  Profile
                </NavLink>
                <button
                  onClick={() => {
                    logout();
                    closeMenu();
                  }}
                  className="px-4 py-2 rounded text-sm font-medium mx-1 text-gray-600 dark:text-gray-300 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
                >
                  Sign Out
                </button>
              </>
            )}
            {!isLoggedIn && (
              <>
                <NavLink href="/login" isActive={isActive('/login')} onClick={closeMenu}>
                  Login
                </NavLink>
                <NavLink href="/signup" isActive={isActive('/signup')} onClick={closeMenu}>
                  Sign Up
                </NavLink>
              </>
            )}
          </div>

          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary focus:outline-none"
              aria-label="Toggle menu"
            >
              {isOpen ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <MobileNavLink href="/" isActive={isActive('/')} onClick={closeMenu}>
              <HomeIcon className="h-4 w-4 inline mr-2" />
              Home
            </MobileNavLink>
            {isLoggedIn && (
              <>
                <MobileNavLink href="/register" isActive={isActive('/register')} onClick={closeMenu}>
                  <RegisterIcon className="h-4 w-4 inline mr-2" />
                  Register
                </MobileNavLink>
                <MobileNavLink href="/check-in" isActive={isActive('/check-in')} onClick={closeMenu}>
                  <CheckInIcon className="h-4 w-4 inline mr-2" />
                  Check-in
                </MobileNavLink>
                <MobileNavLink href="/dashboard" isActive={isActive('/dashboard')} onClick={closeMenu}>
                  <DashboardIcon className="h-4 w-4 inline mr-2" />
                  Dashboard
                </MobileNavLink>
                <MobileNavLink href="/profile" isActive={isActive('/profile')} onClick={closeMenu}>
                  <UserIcon className="h-4 w-4 inline mr-2" />
                  Profile
                </MobileNavLink>
                <button
                  onClick={() => {
                    logout();
                    closeMenu();
                  }}
                  className="block w-full text-left px-4 py-3 text-base font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-red-500 transition-colors duration-200 border-t border-gray-200 dark:border-gray-700"
                >
                  <LogoutIcon className="h-4 w-4 inline mr-2" />
                  Sign Out
                </button>
              </>
            )}
            {!isLoggedIn && (
              <>
                <MobileNavLink href="/login" isActive={isActive('/login')} onClick={closeMenu}>
                  <LoginIcon className="h-4 w-4 inline mr-2" />
                  Login
                </MobileNavLink>
                <MobileNavLink href="/signup" isActive={isActive('/signup')} onClick={closeMenu}>
                  <RegisterIcon className="h-4 w-4 inline mr-2" />
                  Sign Up
                </MobileNavLink>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

interface NavLinkProps {
  href: string;
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function NavLink({ href, isActive, onClick, children }: NavLinkProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`px-4 py-2 rounded text-sm font-medium mx-1 ${
        isActive
          ? 'text-primary bg-primary/10'
          : 'text-gray-600 dark:text-gray-300 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
    >
      {children}
    </Link>
  );
}

function MobileNavLink({ href, isActive, onClick, children }: NavLinkProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`block px-4 py-3 text-base font-medium ${
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
    >
      {children}
    </Link>
  );
}
