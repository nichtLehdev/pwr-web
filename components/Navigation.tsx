'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Start' },
    { href: '/termine', label: 'Termine' },
    { href: '/aktuelles', label: 'Aktuelles' },
    { href: '/mitmachen', label: 'Mitmachen' },
    { href: '/materialien', label: 'Materialien' },
    { href: '/ueber-uns', label: 'Über uns' },
  ];

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50 w-full">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          
          {/* Logo - immer sichtbar */}
          <Link href="/" className="flex-shrink-0">
            <div className="h-10 md:h-14 relative">
              {/* Desktop: Komplettes Logo mit Text */}
              <Image
                src="/images/logo-horizontal.svg"
                alt="Posaunenwerk Rheinland"
                width={250}
                height={56}
                className="hidden md:block h-full w-auto"
                priority
              />
              {/* Mobile: Nur Icon (optional, falls vorhanden) */}
              <Image
                src="/images/logo-icon.svg"
                alt="Posaunenwerk Rheinland"
                width={40}
                height={40}
                className="md:hidden h-full w-auto"
                priority
              />
            </div>
          </Link>

          {/* Desktop Navigation - ab md: sichtbar */}
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-dark hover:text-primary transition-colors font-medium"
              >
                {link.label}
              </Link>
            ))}
            
            {/* Suche & Login */}
            <div className="flex items-center space-x-4 ml-4">
              <button 
                className="text-dark hover:text-primary transition-colors"
                aria-label="Suchen"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              
              <Link 
                href="/login"
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
              >
                Login
              </Link>
            </div>
          </div>

          {/* Mobile Menu Button - nur auf Mobile */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-dark hover:bg-gray-100"
            aria-label="Menü öffnen"
          >
            <svg 
              className="w-6 h-6" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu - slide down */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="flex flex-col space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-2 text-dark hover:bg-gray-100 hover:text-primary rounded-md transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              
              {/* Mobile Suche & Login */}
              <div className="px-4 pt-4 border-t border-gray-200 space-y-2">
                <button className="w-full px-4 py-2 text-dark hover:bg-gray-100 rounded-md flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Suchen
                </button>
                
                <Link 
                  href="/login"
                  className="block w-full px-4 py-2 bg-primary text-white rounded-md text-center hover:bg-primary-dark transition-colors"
                >
                  Login
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}