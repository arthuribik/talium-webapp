import { useState } from 'react';
import { Link } from 'react-router-dom';
import LandingLayout from '@/components/landing/LandingLayout';

export default function Home() {
  const [email, setEmail] = useState('');

  return (
    <LandingLayout>
      {/* Hero Section */}
      <section className="relative min-h-[600px] flex items-center bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Text Content */}
            <div className="space-y-6">
              <h1 className="text-5xl font-bold text-gray-900 leading-tight">
                One Trusted Profile for Global Opportunities:
              </h1>
              <h2 className="text-4xl font-bold text-brand-500">
                Global Banking
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                Taldium helps both professionals and organisations to create and manage verifiable digital footprints for everyday digital interaction
              </p>
              
              {/* Email Input */}
              <div className="flex gap-3 mt-8">
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <Link
                  to="/join"
                  className="px-6 py-3 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 transition-colors whitespace-nowrap"
                >
                  Create a free profile
                </Link>
              </div>
            </div>

            {/* Right Side - Illustrative Graphic */}
            <div className="relative">
              {/* World Map Background */}
              <div className="absolute inset-0 opacity-10">
                <svg viewBox="0 0 400 300" className="w-full h-full">
                  <path
                    d="M50,150 Q100,100 150,150 T250,150 T350,150"
                    stroke="#2a65ff"
                    strokeWidth="2"
                    fill="none"
                  />
                  <circle cx="100" cy="100" r="3" fill="#2a65ff" />
                  <circle cx="200" cy="150" r="3" fill="#2a65ff" />
                  <circle cx="300" cy="200" r="3" fill="#2a65ff" />
                </svg>
              </div>

              {/* Main Profile */}
              <div className="relative z-10 flex items-center justify-center">
                <div className="relative">
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop"
                    alt="Professional"
                    className="w-64 h-64 rounded-full object-cover border-4 border-white shadow-xl"
                  />
                  {/* Verification Checkmark */}
                  <div className="absolute -left-4 top-1/2 transform -translate-y-1/2 bg-brand-500 rounded-full p-2 shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>

                {/* Small Profile 1 - Top */}
                <div className="absolute -top-8 right-20 bg-white rounded-lg shadow-lg p-3 z-20">
                  <div className="flex items-center gap-3">
                    <img
                      src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop"
                      alt="Felix Andrew"
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Felix Andrew</p>
                      <p className="text-xs text-gray-500">Software Developer at Apple</p>
                    </div>
                  </div>
                </div>

                {/* Small Profile 2 - Left */}
                <div className="absolute left-0 top-1/2 transform -translate-y-1/2">
                  <img
                    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop"
                    alt="Professional"
                    className="w-24 h-24 rounded-full object-cover border-2 border-white shadow-lg"
                  />
                </div>

                {/* Connection Lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
                  <line x1="20%" y1="50%" x2="50%" y2="50%" stroke="#2a65ff" strokeWidth="2" strokeDasharray="5,5" opacity="0.3" />
                  <line x1="50%" y1="50%" x2="80%" y2="20%" stroke="#2a65ff" strokeWidth="2" strokeDasharray="5,5" opacity="0.3" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Digital Footprint Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 text-center mb-12 max-w-3xl mx-auto">
            Create a credible digital footprint with Taldium, and unlock a world of endless possibilities.
          </h2>
          
          {/* Profile Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop"
                  alt="Felix Andrew"
                  className="w-16 h-16 rounded-full object-cover mx-auto mb-3"
                />
                <h3 className="text-sm font-semibold text-gray-900 text-center">Felix Andrew</h3>
                <p className="text-xs text-gray-600 text-center">Software Developer at Apple</p>
                <p className="text-xs text-gray-500 text-center mt-1">United States of America</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How Taldium Helps Section */}
      <section className="py-20 bg-brand-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Benefits */}
            <div>
              <h2 className="text-4xl font-bold mb-8">
                How Does Taldium Help Professionals Like You?
              </h2>
              
              <div className="space-y-4">
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6">
                  <p className="text-lg">
                    Create, authenticate, and manage a trusted professional identity.
                  </p>
                </div>
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6">
                  <p className="text-lg">
                    Offer your services and get hired globally.
                  </p>
                </div>
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6">
                  <p className="text-lg">
                    Access essential services like banking, insurance, healthcare, and investments.
                  </p>
                </div>
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6">
                  <p className="text-lg">
                    Build a network of verified peers and collaborators.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Side - Professional Image */}
            <div className="relative">
              <div className="relative z-10">
                <img
                  src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=600&h=800&fit=crop"
                  alt="Professional"
                  className="w-full rounded-lg shadow-2xl object-cover"
                  style={{ maxHeight: '600px' }}
                />
              </div>
              
              {/* Decorative Icons */}
              <div className="absolute -top-8 -right-8 w-16 h-16 bg-white bg-opacity-20 rounded-lg backdrop-blur-sm"></div>
              <div className="absolute -bottom-8 -left-8 w-16 h-16 bg-white bg-opacity-20 rounded-lg backdrop-blur-sm"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Organisation Resources Section */}
      <section className="py-20 bg-gray-50 relative overflow-hidden">
        {/* Subtle geometric pattern background */}
        <div className="absolute inset-0 opacity-5">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#2a65ff" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-brand-500 text-center mb-12">
            Enjoy Access to Trusted Resources and Tools for Your Organisation
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-8 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-lg text-gray-900">
                Create a digital brand profile your customers and partners can trust
              </p>
            </div>
            <div className="bg-white rounded-lg p-8 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-lg text-gray-900">
                Communicate publicly and internally with verified transparency.
              </p>
            </div>
            <div className="bg-white rounded-lg p-8 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-lg text-gray-900">
                Automate your recruitment lifecycle— job postings, interviews, onboarding/ offboarding.
              </p>
            </div>
            <div className="bg-white rounded-lg p-8 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-lg text-gray-900">
                Promote and offer your services to a targeted global audience.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Who is Taldium for Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 text-center mb-16">
            Who is Taldium for?
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Professionals Card */}
            <div className="border-2 border-brand-100 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-8">
                <h3 className="text-2xl font-bold text-brand-500 mb-4">Professionals</h3>
                <p className="text-lg text-gray-700 mb-6">
                  Skilled professionals who are actively seeking global opportunities to get hired, network, volunteer, or offer a service.
                </p>
                <div className="bg-brand-500 rounded-lg overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&h=400&fit=crop"
                    alt="Professional"
                    className="w-full h-64 object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Businesses Card */}
            <div className="border-2 border-brand-100 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-8">
                <h3 className="text-2xl font-bold text-brand-500 mb-4">Businesses</h3>
                <p className="text-lg text-gray-700 mb-6">
                  Businesses who want to build an authentic digital footprint, hire trusted professionals, and interact with customers in a trusted environment.
                </p>
                <div className="bg-brand-500 rounded-lg overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=400&fit=crop"
                    alt="Business Team"
                    className="w-full h-64 object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Experience Section Header */}
      <section className="py-16 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            Experience Authenticity, Ownership, Privacy and Global Access
          </h2>
        </div>
      </section>

      {/* Data Ownership Feature Block */}
      <section className="py-0">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Left - Blue Background */}
          <div className="bg-brand-500 text-white p-12 lg:p-16 flex flex-col justify-center">
            <h3 className="text-3xl md:text-4xl font-bold mb-6">
              Take ownership of all your data with Taldium
            </h3>
            <p className="text-lg text-white text-opacity-90 mb-8 leading-relaxed">
              Create, authenticate, and manage your information. Know who has access to your data and retrieve it at any time.
            </p>
            <Link
              to="/join"
              className="inline-flex items-center px-6 py-3 bg-white text-brand-500 rounded-lg font-medium hover:bg-gray-100 transition-colors w-fit"
            >
              Create a free profile
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Right - White Background with Image */}
          <div className="bg-white p-8 lg:p-12 flex items-center justify-center">
            <img
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&h=600&fit=crop"
              alt="Professional woman"
              className="w-full h-full object-cover rounded-lg"
              style={{ maxHeight: '500px' }}
            />
          </div>
        </div>
      </section>

      {/* Global Access Feature Block */}
      <section className="py-0 bg-white">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Left - Image with World Map */}
          <div className="bg-gray-50 p-8 lg:p-12 flex items-center justify-center relative">
            <div className="relative w-full h-full" style={{ minHeight: '400px' }}>
              <svg viewBox="0 0 800 400" className="w-full h-full opacity-30">
                {/* Simplified world map outline */}
                <path d="M100,200 Q150,150 200,200 T300,200" stroke="#2a65ff" strokeWidth="2" fill="none" />
                <path d="M400,150 Q450,100 500,150 T600,150" stroke="#2a65ff" strokeWidth="2" fill="none" />
                <path d="M200,300 Q250,250 300,300 T400,300" stroke="#2a65ff" strokeWidth="2" fill="none" />
              </svg>
              {/* Map pins */}
              <div className="absolute top-1/4 left-1/4">
                <div className="w-4 h-4 bg-purple-500 rounded-full border-2 border-white shadow-lg"></div>
              </div>
              <div className="absolute top-1/3 right-1/3">
                <div className="w-4 h-4 bg-orange-500 rounded-full border-2 border-white shadow-lg"></div>
              </div>
              <div className="absolute bottom-1/3 left-1/3">
                <div className="w-4 h-4 bg-brand-300 rounded-full border-2 border-white shadow-lg"></div>
              </div>
              <div className="absolute top-1/2 right-1/4">
                <div className="w-4 h-4 bg-purple-500 rounded-full border-2 border-white shadow-lg"></div>
              </div>
            </div>
          </div>

          {/* Right - Text Content */}
          <div className="bg-white p-12 lg:p-16 flex flex-col justify-center">
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
              Enjoy access to endless opportunities regardless of your location.
            </h3>
            <Link
              to="/join"
              className="inline-flex items-center px-6 py-3 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 transition-colors w-fit"
            >
              Create a free profile
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Professional Networking Feature Block */}
      <section className="py-0 bg-brand-500 text-white">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Left - Text Content */}
          <div className="p-12 lg:p-16 flex flex-col justify-center">
            <h3 className="text-3xl md:text-4xl font-bold mb-6">
              Interact with a Trusted Circle of Professional Colleagues
            </h3>
            <p className="text-lg text-white text-opacity-90 mb-4 leading-relaxed">
              Expand your network with verified professionals across industries. Build project teams, share insights, and collaborate with confidence.
            </p>
            <p className="text-lg text-white text-opacity-90 leading-relaxed">
              Say goodbye to spam and fake profiles —only trusted identities, always
            </p>
          </div>

          {/* Right - Image */}
          <div className="p-8 lg:p-12 flex items-center justify-center">
            <img
              src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&h=600&fit=crop"
              alt="Professional team collaboration"
              className="w-full h-full object-cover rounded-lg"
              style={{ maxHeight: '500px' }}
            />
          </div>
        </div>
      </section>
    </LandingLayout>
  );
}

