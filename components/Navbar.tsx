
import React, { useState } from 'react';
import { ShirtIcon, XIcon, MenuIcon } from './icons';
import { motion, AnimatePresence } from 'framer-motion';
import { Page } from '../App';
import { cn } from '../lib/utils';

interface NavbarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Virtual Try-On', page: 'try-on' as Page },
    { name: 'Personal Wardrobe', page: 'wardrobe' as Page },
    { name: 'Setup', page: 'setup' as Page },
  ];

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <button onClick={() => onNavigate('try-on')} className="flex items-center gap-2 text-gray-800 hover:text-gray-900">
              <ShirtIcon className="w-6 h-6" />
              <span className="text-xl font-serif tracking-wider">My Wardrobe</span>
            </button>
          </div>
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <button
                key={link.name}
                onClick={() => onNavigate(link.page)}
                className={cn(
                  'text-sm font-semibold transition-colors',
                  currentPage === link.page
                    ? 'text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                {link.name}
              </button>
            ))}
          </nav>
          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-500"
              aria-expanded={isMenuOpen}
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <XIcon className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <MenuIcon className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="md:hidden border-t border-gray-200"
          >
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navLinks.map((link) => (
                <button
                  key={link.name}
                  onClick={() => {
                    onNavigate(link.page);
                    setIsMenuOpen(false);
                  }}
                  className={cn(
                    'w-full text-left block px-3 py-2 rounded-md text-base font-medium',
                    currentPage === link.page
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                  )}
                >
                  {link.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
