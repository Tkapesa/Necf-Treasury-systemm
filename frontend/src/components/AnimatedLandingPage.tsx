/**
 * AnimatedLandingPage.tsx
 * Enhanced landing page with smooth animations and professional interactions
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import logoImage from '../assets/images/logos/Copy of logo REMAKE.png';

const AnimatedLandingPage: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  useEffect(() => {
    // Trigger entrance animations
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Animated Header */}
      <header className={`
        bg-white shadow-sm border-b border-gray-200 transition-all duration-1000 ease-out
        ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}
      `}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20 md:h-16">
            {/* Logo Section */}
            <div className={`
              flex items-center flex-1 md:flex-none transition-all duration-1000 ease-out delay-300
              ${isVisible ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'}
            `}>
              <div className="flex-shrink-0 relative group">
                <img
                  className="h-12 w-12 md:h-10 md:w-10 object-contain transition-transform duration-300 group-hover:scale-110"
                  src={logoImage}
                  alt="Near East Christian Fellowship Logo"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 rounded-lg bg-maroon-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button 
                type="button"
                className="text-gray-500 hover:text-maroon-600 focus:outline-none focus:text-maroon-600 transition-colors duration-300 transform hover:scale-110"
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
            <nav className={`
              hidden md:flex space-x-8 transition-all duration-1000 ease-out delay-500
              ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'}
            `}>
              <a 
                href="#" 
                className="text-maroon-600 font-medium border-b-2 border-maroon-600 pb-2 transition-all duration-300 hover:border-maroon-700"
              >
                Home
              </a>
              <Link 
                to="/purchaser" 
                className="text-gray-700 hover:text-maroon-600 font-medium transition-all duration-300 hover:transform hover:scale-105 hover:-translate-y-0.5"
              >
                Submit Receipt
              </Link>
              <Link 
                to="/login" 
                className="text-gray-700 hover:text-maroon-600 font-medium transition-all duration-300 hover:transform hover:scale-105 hover:-translate-y-0.5"
              >
                Admin Dashboard
              </Link>
            </nav>
          </div>

          {/* Mobile Navigation Menu */}
          <div id="mobile-menu" className="hidden md:hidden border-t border-gray-200 pt-4 pb-4">
            <div className="space-y-3">
              <a href="#" className="block text-maroon-600 font-medium py-2 px-4 rounded-lg bg-maroon-50 transition-all duration-300 hover:bg-maroon-100">
                Home
              </a>
              <Link 
                to="/purchaser" 
                className="block text-gray-700 hover:text-maroon-600 hover:bg-gray-50 font-medium py-2 px-4 rounded-lg transition-all duration-300 hover:transform hover:scale-105"
              >
                Submit Receipt
              </Link>
              <Link 
                to="/login" 
                className="block text-gray-700 hover:text-maroon-600 hover:bg-gray-50 font-medium py-2 px-4 rounded-lg transition-all duration-300 hover:transform hover:scale-105"
              >
                Admin Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Animated Hero Section */}
      <section className="relative py-12 md:py-20 overflow-hidden">
        {/* Animated Background Shape */}
        <div className="absolute inset-0 bg-gradient-to-br from-maroon-50 to-maroon-100">
          <div className={`
            absolute top-0 right-0 w-1/2 h-full bg-maroon-600 transform skew-x-12 origin-top-right opacity-5
            transition-all duration-2000 ease-out delay-700
            ${isVisible ? 'translate-x-0 scale-100' : 'translate-x-full scale-75'}
          `} />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Animated Title */}
          <h2 className={`
            text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-maroon-600 mb-4 md:mb-6 leading-tight
            transition-all duration-1000 ease-out delay-500
            ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}
          `}>
            <span className="inline-block animate-bounce">Welcome to Our</span>
            <span className={`
              block text-gray-900 dark:text-white mt-1 md:mt-2 transition-all duration-1000 ease-out delay-700
              ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}
            `}>
              Treasury System
            </span>
          </h2>
          
          {/* Animated Subtitle */}
          <p className={`
            text-lg md:text-xl text-gray-600 mb-8 md:mb-12 max-w-3xl mx-auto leading-relaxed
            transition-all duration-1000 ease-out delay-900
            ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}
          `}>
            Simplifying financial management for Near East Christian Fellowship. 
            Submit receipts quickly or access comprehensive financial analytics.
          </p>

          {/* Animated Portal Cards */}
          <div className="grid md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto">
            {/* Purchaser Portal Card */}
            <Link
              to="/purchaser"
              onMouseEnter={() => setHoveredCard('purchaser')}
              onMouseLeave={() => setHoveredCard(null)}
              className={`
                group block transition-all duration-1200 ease-out delay-1100
                ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}
              `}
            >
              <div className={`
                bg-white rounded-2xl shadow-lg border border-gray-200 p-8 md:p-10 text-center h-full
                transition-all duration-500 ease-out
                ${hoveredCard === 'purchaser' 
                  ? 'transform scale-105 shadow-2xl border-maroon-300 bg-gradient-to-br from-white to-maroon-50' 
                  : 'hover:shadow-xl hover:scale-102'
                }
              `}>
                {/* Animated Icon */}
                <div className={`
                  w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6
                  transition-all duration-500 ease-out
                  ${hoveredCard === 'purchaser' ? 'transform rotate-12 scale-110' : 'group-hover:scale-110'}
                `}>
                  <svg className="w-8 h-8 md:w-10 md:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  Submit Receipt
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                  Upload your purchase receipts quickly and easily. 
                  Our system will automatically extract key information for processing.
                </p>
                <div className={`
                  inline-flex items-center text-blue-600 font-semibold text-lg
                  transition-all duration-300
                  ${hoveredCard === 'purchaser' ? 'transform translate-x-2' : 'group-hover:translate-x-1'}
                `}>
                  Start Upload
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </Link>

            {/* Admin Portal Card */}
            <Link
              to="/login"
              onMouseEnter={() => setHoveredCard('admin')}
              onMouseLeave={() => setHoveredCard(null)}
              className={`
                group block transition-all duration-1200 ease-out delay-1300
                ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}
              `}
            >
              <div className={`
                bg-white rounded-2xl shadow-lg border border-gray-200 p-8 md:p-10 text-center h-full
                transition-all duration-500 ease-out
                ${hoveredCard === 'admin' 
                  ? 'transform scale-105 shadow-2xl border-maroon-300 bg-gradient-to-br from-white to-maroon-50' 
                  : 'hover:shadow-xl hover:scale-102'
                }
              `}>
                {/* Animated Icon */}
                <div className={`
                  w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-maroon-500 to-maroon-600 rounded-full flex items-center justify-center mx-auto mb-6
                  transition-all duration-500 ease-out
                  ${hoveredCard === 'admin' ? 'transform rotate-12 scale-110' : 'group-hover:scale-110'}
                `}>
                  <svg className="w-8 h-8 md:w-10 md:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  Admin Dashboard
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Access comprehensive financial analytics, manage receipts, 
                  and oversee treasury operations with powerful admin tools.
                </p>
                <div className={`
                  inline-flex items-center text-maroon-600 font-semibold text-lg
                  transition-all duration-300
                  ${hoveredCard === 'admin' ? 'transform translate-x-2' : 'group-hover:translate-x-1'}
                `}>
                  Access Dashboard
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Animated Features Section */}
      <section className={`
        py-16 bg-gray-50 transition-all duration-1000 ease-out delay-1500
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}
      `}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Why Choose Our System?</h3>
            <p className="text-xl text-gray-600">Streamlined, secure, and designed for efficiency</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Easy Upload",
                description: "Simply take a photo or upload your receipt file",
                icon: "📱",
                delay: "delay-1700"
              },
              {
                title: "Auto Processing",
                description: "Our AI automatically extracts vendor, amount, and date information",
                icon: "🤖",
                delay: "delay-1900"
              },
              {
                title: "Financial Insights", 
                description: "Comprehensive analytics and reporting for better financial management",
                icon: "📊",
                delay: "delay-2100"
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className={`
                  text-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-500 hover:scale-105
                  ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'} ${feature.delay}
                `}
              >
                <div className="text-4xl mb-4 animate-bounce" style={{ animationDelay: `${index * 0.2}s` }}>
                  {feature.icon}
                </div>
                <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{feature.title}</h4>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default AnimatedLandingPage;
