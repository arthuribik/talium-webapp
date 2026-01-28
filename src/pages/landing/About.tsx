import { Link } from 'react-router-dom';
import LandingLayout from '@/components/landing/LandingLayout';
import { HiCheckCircle, HiShieldCheck, HiGlobe, HiUserGroup, HiOfficeBuilding, HiLockClosed, HiChartBar } from 'react-icons/hi';

export default function About() {
  return (
    <LandingLayout>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-brand-500 to-brand-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Building a Trusted Digital Ecosystem
            </h1>
            <p className="text-xl md:text-2xl text-white text-opacity-90 leading-relaxed">
              Taldium enables professionals and organizations to create verified, reusable identity profiles for trusted interactions in job applications, recruitment, and everyday digital services.
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="bg-gray-50 rounded-xl p-8">
              <div className="w-16 h-16 bg-brand-500 rounded-full flex items-center justify-center mb-6">
                <HiGlobe className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Mission</h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                To empower professionals and organizations worldwide by creating a trusted digital identity ecosystem that simplifies verification, enhances opportunities, and builds authentic connections across borders.
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-8">
              <div className="w-16 h-16 bg-brand-500 rounded-full flex items-center justify-center mb-6">
                <HiChartBar className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Vision</h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                To become the global standard for verified professional identities, where one trusted profile opens doors to endless opportunities—from job applications to banking, healthcare, and beyond.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What is Taldium */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">What is Taldium?</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Taldium is a comprehensive platform that helps both professionals and organizations create and manage verifiable digital footprints for everyday digital interactions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            <div className="bg-white rounded-xl p-8 shadow-sm">
              <HiShieldCheck className="w-12 h-12 text-brand-500 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Verified Identity</h3>
              <p className="text-gray-600">
                Create a trusted, verified profile with identity, education, and work experience verification that you can reuse across multiple platforms and services.
              </p>
            </div>
            <div className="bg-white rounded-xl p-8 shadow-sm">
              <HiGlobe className="w-12 h-12 text-brand-500 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Global Access</h3>
              <p className="text-gray-600">
                Access opportunities and services worldwide with a single verified profile, breaking down geographical barriers and opening doors to global markets.
              </p>
            </div>
            <div className="bg-white rounded-xl p-8 shadow-sm">
              <HiLockClosed className="w-12 h-12 text-brand-500 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Data Ownership</h3>
              <p className="text-gray-600">
                You control your data. Know who has access to your information, manage permissions, and retrieve your data at any time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Key Features</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to build and manage your trusted digital identity
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex gap-4">
              <HiCheckCircle className="w-6 h-6 text-brand-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Identity Verification</h3>
                <p className="text-gray-600">
                  Verify your identity using government-issued IDs with advanced liveness checks and third-party verification services.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <HiCheckCircle className="w-6 h-6 text-brand-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Education Verification</h3>
                <p className="text-gray-600">
                  Add and verify your educational qualifications, from certificates to degrees, with document upload and verification.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <HiCheckCircle className="w-6 h-6 text-brand-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Work Experience Verification</h3>
                <p className="text-gray-600">
                  Document and verify your professional experience with employer verification and detailed work history.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <HiCheckCircle className="w-6 h-6 text-brand-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Job Application Center</h3>
                <p className="text-gray-600">
                  Apply for jobs with your verified profile, making the application process faster and more trustworthy.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <HiCheckCircle className="w-6 h-6 text-brand-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Data Exchange History</h3>
                <p className="text-gray-600">
                  Track who has accessed your data, when, and for what purpose, giving you complete transparency and control.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <HiCheckCircle className="w-6 h-6 text-brand-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Organization Verification</h3>
                <p className="text-gray-600">
                  Organizations can verify their business credentials and access verified professional profiles for recruitment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who is Taldium For */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Who is Taldium For?</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Three user types, one trusted platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Professionals */}
            <div className="bg-white rounded-xl p-8 shadow-sm border-2 border-transparent hover:border-brand-500 transition-colors">
              <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mb-6">
                <HiUserGroup className="w-8 h-8 text-brand-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Professionals</h3>
              <p className="text-gray-600 mb-6">
                Individual professionals looking to create a verified digital identity for job applications, service access, and professional networking.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center text-sm text-gray-600">
                  <HiCheckCircle className="w-4 h-4 text-brand-500 mr-2" />
                  Create verified professional profile
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <HiCheckCircle className="w-4 h-4 text-brand-500 mr-2" />
                  Apply for jobs globally
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <HiCheckCircle className="w-4 h-4 text-brand-500 mr-2" />
                  Control data sharing permissions
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <HiCheckCircle className="w-4 h-4 text-brand-500 mr-2" />
                  Track data exchange history
                </li>
              </ul>
            </div>

            {/* Organizations */}
            <div className="bg-white rounded-xl p-8 shadow-sm border-2 border-transparent hover:border-brand-500 transition-colors">
              <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mb-6">
                <HiOfficeBuilding className="w-8 h-8 text-brand-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Organizations</h3>
              <p className="text-gray-600 mb-6">
                Businesses and organizations seeking verified professional profiles for recruitment, onboarding, and trusted business interactions.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center text-sm text-gray-600">
                  <HiCheckCircle className="w-4 h-4 text-brand-500 mr-2" />
                  Post job opportunities
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <HiCheckCircle className="w-4 h-4 text-brand-500 mr-2" />
                  Search verified professional profiles
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <HiCheckCircle className="w-4 h-4 text-brand-500 mr-2" />
                  Manage organization profile
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <HiCheckCircle className="w-4 h-4 text-brand-500 mr-2" />
                  Streamline recruitment workflow
                </li>
              </ul>
            </div>

            {/* Admins */}
            <div className="bg-white rounded-xl p-8 shadow-sm border-2 border-transparent hover:border-brand-500 transition-colors">
              <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mb-6">
                <HiShieldCheck className="w-8 h-8 text-brand-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Taldium Admins</h3>
              <p className="text-gray-600 mb-6">
                Platform administrators who oversee activities, manage accounts, configure settings, and ensure system integrity.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center text-sm text-gray-600">
                  <HiCheckCircle className="w-4 h-4 text-brand-500 mr-2" />
                  Monitor platform metrics
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <HiCheckCircle className="w-4 h-4 text-brand-500 mr-2" />
                  Manage verifications
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <HiCheckCircle className="w-4 h-4 text-brand-500 mr-2" />
                  Configure system settings
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <HiCheckCircle className="w-4 h-4 text-brand-500 mr-2" />
                  Access audit trails
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Simple steps to build your trusted digital identity
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-brand-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Create Account</h3>
              <p className="text-gray-600">
                Sign up as a professional or organization and verify your email address to get started.
              </p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-brand-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Complete Profile</h3>
              <p className="text-gray-600">
                Add your personal information, education, and work experience to build your comprehensive profile.
              </p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-brand-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Get Verified</h3>
              <p className="text-gray-600">
                Submit documents for verification of your identity, education, and work experience through our secure process.
              </p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-brand-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                4
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Start Using</h3>
              <p className="text-gray-600">
                Apply for jobs, access services, and share your verified profile with trusted organizations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-20 bg-brand-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Our Core Values</h2>
            <p className="text-xl text-white text-opacity-90 max-w-3xl mx-auto">
              The principles that guide everything we do
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-8">
              <h3 className="text-2xl font-bold mb-4">Trust</h3>
              <p className="text-white text-opacity-90">
                We believe in building trust through verification. Every profile on Taldium is verified, ensuring authenticity and reliability.
              </p>
            </div>
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-8">
              <h3 className="text-2xl font-bold mb-4">Privacy</h3>
              <p className="text-white text-opacity-90">
                Your data belongs to you. We give you complete control over who accesses your information and how it's used.
              </p>
            </div>
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-8">
              <h3 className="text-2xl font-bold mb-4">Accessibility</h3>
              <p className="text-white text-opacity-90">
                We're breaking down barriers to global opportunities, making it easier for professionals worldwide to access services and opportunities.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Ready to Build Your Trusted Digital Identity?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of professionals and organizations already using Taldium to create verified profiles and access global opportunities.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/join"
              className="px-8 py-4 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 transition-colors text-lg"
            >
              Create Your Profile
            </Link>
            <Link
              to="/register-business"
              className="px-8 py-4 border-2 border-brand-500 text-brand-500 rounded-lg font-medium hover:bg-brand-50 transition-colors text-lg"
            >
              Register Your Organization
            </Link>
          </div>
        </div>
      </section>
    </LandingLayout>
  );
}

