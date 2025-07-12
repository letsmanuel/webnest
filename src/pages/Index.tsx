
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Dashboard } from '../components/Dashboard';
import { Login } from '../components/Login';

const Index: React.FC = () => {
  const { user, loading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  if (loading || user) {
    if (user) return <Dashboard />;
    return (
      <div className="min-h-screen bg-white flex flex-col justify-center items-center relative">
        {/* Optionally, you can add a spinner or logo here */}
        <div className="absolute bottom-8 w-full flex justify-center">
          <a
            href="https://webnest.icu/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-blue-600 text-sm underline transition-colors"
          >
            Privacy Policy
          </a>
        </div>
      </div>
    );
  }
  if (showLogin) return <Login onBack={() => setShowLogin(false)} />;

  return (
    <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-100 min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-500 via-indigo-400 to-purple-500 text-white shadow-lg">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative container mx-auto px-4 py-20 lg:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-4 py-2 mb-8 shadow">
              <span className="text-green-200 font-semibold">FREE TO START</span>
              <span className="mx-2 text-white/80">•</span>
              <span className="text-sm text-white/90">Get started at no cost</span>
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold mb-6 bg-gradient-to-r from-white via-yellow-100 to-blue-200 bg-clip-text text-transparent drop-shadow-lg">
              Webnest
              <br />
              <span className="text-yellow-200 drop-shadow">Build Stunning Websites Without Code</span>
            </h1>
            <p className="text-xl md:text-2xl text-blue-50 mb-10 max-w-2xl mx-auto drop-shadow">
              Create professional websites with our intuitive drag-and-drop builder. 
              Free hosting included. No coding skills required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                className="bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 text-gray-900 font-bold text-lg px-8 py-6 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-2 border-yellow-300 hover:border-yellow-400"
                onClick={() => setShowLogin(true)}
              >
                Login to Dashboard
              </button>
              <button
                className="bg-gradient-to-r from-blue-400 to-purple-400 border border-white/30 text-white text-lg px-8 py-6 rounded-full font-semibold transition-all duration-300 opacity-60 cursor-not-allowed"
                disabled
              >
                <svg className="mr-2 h-5 w-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6-8h8a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2v-8a2 2 0 012-2z" />
                </svg>
                Watch Demo
              </button>
            </div>
            <div className="mt-16 relative">
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-2 border border-white/30 shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&h=600" 
                  alt="Webnest Dashboard Preview"
                  className="w-full rounded-xl shadow-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
              Everything You Need to Build Amazing Websites
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful features that make website building simple, fast, and enjoyable.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="feature-card group p-8 rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 transition-all duration-300 hover:shadow-xl border border-blue-100">
              <div className="icon-gradient p-3 rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Drag & Drop Builder</h3>
              <p className="text-gray-600 leading-relaxed">Simply drag elements where you want them. No technical knowledge needed.</p>
            </div>
            {/* Feature 2 */}
            <div className="feature-card group p-8 rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 transition-all duration-300 hover:shadow-xl border border-blue-100">
              <div className="icon-gradient p-3 rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">No Code Required</h3>
              <p className="text-gray-600 leading-relaxed">Build professional websites without writing a single line of code.</p>
            </div>
            {/* Feature 3 */}
            <div className="feature-card group p-8 rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 transition-all duration-300 hover:shadow-xl border border-blue-100">
              <div className="icon-gradient p-3 rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Free Hosting</h3>
              <p className="text-gray-600 leading-relaxed">Your website goes live instantly with our reliable, fast hosting.</p>
            </div>
            {/* Feature 4 */}
            <div className="feature-card group p-8 rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 transition-all duration-300 hover:shadow-xl border border-blue-100">
              <div className="icon-gradient p-3 rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Lightning Fast</h3>
              <p className="text-gray-600 leading-relaxed">Optimized for speed with automatic performance enhancements.</p>
            </div>
            {/* Feature 5 */}
            <div className="feature-card group p-8 rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 transition-all duration-300 hover:shadow-xl border border-blue-100">
              <div className="icon-gradient p-3 rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Secure & Reliable</h3>
              <p className="text-gray-600 leading-relaxed">Built-in security features and 99.9% uptime guarantee.</p>
            </div>
            {/* Feature 6 */}
            <div className="feature-card group p-8 rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 transition-all duration-300 hover:shadow-xl border border-blue-100">
              <div className="icon-gradient p-3 rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Templates</h3>
              <p className="text-gray-600 leading-relaxed">Start with stunning, professionally designed templates.</p>
            </div>
          </div>
        </div>
      </section>
      {/* How It Works Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
              Build Your Website in 3 Simple Steps
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From idea to live website in minutes, not weeks.
            </p>
          </div>
          <div className="space-y-20">
            {/* Step 1 */}
            <div className="flex flex-col lg:flex-row items-center gap-12">
              <div className="flex-1 space-y-6">
                <div className="flex items-center gap-4">
                  <span className="text-4xl font-bold text-blue-600 bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center">01</span>
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-900">Choose a Template</h3>
                </div>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Pick from our collection of beautiful, responsive templates or start from scratch.
                </p>
              </div>
              <div className="flex-1">
                <div className="relative">
                  <img 
                    src="https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=600&h=400"
                    alt="Choose a Template"
                    className="w-full rounded-2xl shadow-2xl hover:shadow-3xl transition-shadow duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl"></div>
                </div>
              </div>
            </div>
            {/* Step 2 */}
            <div className="flex flex-col lg:flex-row-reverse items-center gap-12">
              <div className="flex-1 space-y-6">
                <div className="flex items-center gap-4">
                  <span className="text-4xl font-bold text-blue-600 bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center">02</span>
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-900">Drag & Drop Elements</h3>
                </div>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Add text, images, buttons, and more with our intuitive visual editor.
                </p>
              </div>
              <div className="flex-1">
                <div className="relative">
                  <img 
                    src="https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=600&h=400"
                    alt="Drag & Drop Elements"
                    className="w-full rounded-2xl shadow-2xl hover:shadow-3xl transition-shadow duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl"></div>
                </div>
              </div>
            </div>
            {/* Step 3 */}
            <div className="flex flex-col lg:flex-row items-center gap-12">
              <div className="flex-1 space-y-6">
                <div className="flex items-center gap-4">
                  <span className="text-4xl font-bold text-blue-600 bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center">03</span>
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-900">Publish Instantly</h3>
                </div>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Your website goes live immediately with free hosting and a custom domain option.
                </p>
                <button className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-8 py-6 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300" onClick={() => setShowLogin(true)}>
                  Start Building Now
                  <svg className="ml-2 h-5 w-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <div className="flex-1">
                <div className="relative">
                  <img 
                    src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&h=400"
                    alt="Publish Instantly"
                    className="w-full rounded-2xl shadow-2xl hover:shadow-3xl transition-shadow duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Footer */}
      <footer className="bg-gradient-to-br from-gray-900 to-blue-900 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <h3 className="text-2xl font-bold">Webnest</h3>
              <p className="text-blue-100">
                The free, no-code website builder that makes creating beautiful websites simple and fun.
              </p>
              <div className="flex space-x-4">
                {/* Social icons as in your HTML, convert to JSX */}
                <a href="https://twitter.com/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  <svg className="h-5 w-5 text-blue-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                  </svg>
                </a>
                <a href="https://github.com/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  <svg className="h-5 w-5 text-blue-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                </a>
                <a href="https://linkedin.com/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  <svg className="h-5 w-5 text-blue-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Also you might want</h4>
              <ul className="space-y-2 text-blue-100">
                <li className="hover:text-white cursor-pointer transition-colors">
                  <a href="https://webnest.icu/privacy-policy">Privacy Policy</a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 mt-12 pt-8 text-center text-blue-200">
            <a
              href="https://webnest.icu/privacy-policy"
              className="text-blue-200 hover:text-white underline text-base"
              style={{ display: 'inline-block', marginBottom: '1rem' }}
            >
              Privacy Policy
            </a>
            <p>&copy; 2025 Webnest. All rights reserved. Built with love for creators everywhere.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
