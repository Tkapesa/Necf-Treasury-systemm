/**
 * LandingPage.tsx
 * Public landing page that directs users to either the purchaser portal or admin login
 */

import React from 'react';
import { Link } from 'react-router-dom';
import logoImage from '../assets/images/logos/Copy of logo REMAKE.png';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Clean Header with Navigation */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20 md:h-16">
            {/* Logo Section - Logo Only */}
            <div className="flex items-center flex-1 md:flex-none">
              <div className="flex-shrink-0">
                <img
                  className="h-12 w-12 md:h-10 md:w-10 object-contain"
                  src={logoImage}
                  alt="Near East Christian Fellowship Logo"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.parentElement?.querySelector('.logo-fallback') as HTMLElement;
                    if (fallback) {
                      fallback.classList.remove('hidden');
                      fallback.classList.add('flex');
                    }
                  }}
                />
                <div className="logo-fallback hidden h-12 w-12 md:h-10 md:w-10 bg-maroon-600 rounded-lg items-center justify-center">
                  <svg className="h-7 w-7 md:h-6 md:w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button 
                type="button"
                className="text-gray-500 hover:text-maroon-600 focus:outline-none focus:text-maroon-600 transition-colors"
                onClick={() => {
                  const menu = document.getElementById('mobile-menu');
                  if (menu) {
                    menu.classList.toggle('hidden');
                  }
                }}
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8">
              <a href="#" className="text-maroon-600 font-medium border-b-2 border-maroon-600 pb-2">Home</a>
              <Link to="/purchaser" className="text-gray-700 hover:text-maroon-600 font-medium transition-colors">Submit Receipt</Link>
              <Link to="/login" className="text-gray-700 hover:text-maroon-600 font-medium transition-colors">Admin Dashboard</Link>
            </nav>
          </div>

          {/* Mobile Navigation Menu */}
          <div id="mobile-menu" className="hidden md:hidden border-t border-gray-200 pt-4 pb-4">
            <div className="space-y-3">
              <a href="#" className="block text-maroon-600 font-medium py-2 px-4 rounded-lg bg-maroon-50">
                Home
              </a>
              <Link 
                to="/purchaser" 
                className="block text-gray-700 hover:text-maroon-600 hover:bg-gray-50 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Submit Receipt
              </Link>
              <Link 
                to="/login" 
                className="block text-gray-700 hover:text-maroon-600 hover:bg-gray-50 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Admin Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section with Maroon Background Shape - Mobile Optimized */}
      <section className="relative py-12 md:py-20 overflow-hidden">
        {/* Maroon Background Shape */}
        <div className="absolute inset-0 bg-gradient-to-br from-maroon-50 to-maroon-100">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-maroon-600 transform skew-x-12 origin-top-right opacity-5"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-maroon-600 mb-4 md:mb-6 leading-tight">
            Welcome to Our
            <span className="block text-gray-900 dark:text-white mt-1 md:mt-2">Treasury System</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-6 md:mb-8 leading-relaxed px-4">
            Choose the appropriate portal below based on your role in our church community.
          </p>
          <div className="w-16 md:w-24 h-1 bg-maroon-600 mx-auto rounded-full"></div>
        </div>
      </section>

      {/* Portal Cards Section - Mobile Optimized */}
      <section className="py-8 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2 md:gap-12 max-w-5xl mx-auto">
            
            {/* Submit Receipt Card */}
            <div className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
              <div className="p-6 md:p-8">
                {/* Icon Circle */}
                <div className="w-14 h-14 md:w-16 md:h-16 bg-maroon-600 rounded-full flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-7 h-7 md:w-8 md:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                
                <h3 className="text-xl md:text-2xl font-bold text-maroon-600 mb-3 md:mb-4">Submit Receipt</h3>
                <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6 leading-relaxed">
                  For church members who made purchases and need to submit receipts for reimbursement.
                </p>
                
                {/* Features List */}
                <div className="space-y-2 md:space-y-3 mb-6 md:mb-8">
                  <div className="flex items-center">
                    <div className="w-4 h-4 md:w-5 md:h-5 bg-maroon-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                      <svg className="w-2.5 h-2.5 md:w-3 md:h-3 text-maroon-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm md:text-base text-gray-700">Take photos with your camera</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 md:w-5 md:h-5 bg-maroon-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                      <svg className="w-2.5 h-2.5 md:w-3 md:h-3 text-maroon-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm md:text-base text-gray-700">Upload receipt files</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 md:w-5 md:h-5 bg-maroon-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                      <svg className="w-2.5 h-2.5 md:w-3 md:h-3 text-maroon-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm md:text-base text-gray-700">No login required</span>
                  </div>
                </div>
                
                <Link
                  to="/purchaser"
                  className="w-full bg-maroon-600 hover:bg-maroon-700 text-white font-semibold py-3 px-4 md:px-6 rounded-lg transition-colors duration-300 inline-flex items-center justify-center text-sm md:text-base"
                >
                  <svg className="w-4 h-4 md:w-5 md:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Submit Receipt
                </Link>
              </div>
            </div>

            {/* Admin Dashboard Card */}
            <div className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
              <div className="p-6 md:p-8">
                {/* Icon Circle */}
                <div className="w-14 h-14 md:w-16 md:h-16 bg-maroon-600 rounded-full flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-7 h-7 md:w-8 md:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                
                <h3 className="text-xl md:text-2xl font-bold text-maroon-600 mb-3 md:mb-4">Admin Dashboard</h3>
                <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6 leading-relaxed">
                  For treasury administrators to review receipts, manage finances, and generate reports.
                </p>
                
                {/* Features List */}
                <div className="space-y-2 md:space-y-3 mb-6 md:mb-8">
                  <div className="flex items-center">
                    <div className="w-4 h-4 md:w-5 md:h-5 bg-maroon-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                      <svg className="w-2.5 h-2.5 md:w-3 md:h-3 text-maroon-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm md:text-base text-gray-700">Review and approve receipts</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 md:w-5 md:h-5 bg-maroon-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                      <svg className="w-2.5 h-2.5 md:w-3 md:h-3 text-maroon-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm md:text-base text-gray-700">Generate financial reports</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 md:w-5 md:h-5 bg-maroon-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                      <svg className="w-2.5 h-2.5 md:w-3 md:h-3 text-maroon-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm md:text-base text-gray-700">Secure admin access</span>
                  </div>
                </div>
                
                <Link
                  to="/login"
                  className="w-full bg-maroon-600 hover:bg-maroon-700 text-white font-semibold py-3 px-4 md:px-6 rounded-lg transition-colors duration-300 inline-flex items-center justify-center text-sm md:text-base"
                >
                  <svg className="w-4 h-4 md:w-5 md:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Admin Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Mobile Optimized */}
      <footer className="bg-maroon-600 text-white py-6 md:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm md:text-base text-maroon-100">
            © 2025 Near East Christian Fellowship. Built with care for our church community.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
