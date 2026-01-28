import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/services/api';
import LandingLayout from '@/components/landing/LandingLayout';
import { HiBriefcase, HiLocationMarker, HiSearch } from 'react-icons/hi';

interface Job {
  id: string;
  jobTitle: string;
  location: string;
  workMode: string;
  employmentType: string;
  description: string;
  requirements: string[];
  pay?: {
    amount?: number;
    currency?: string;
    period?: string;
  };
  experienceYears?: number;
  jobLevel?: string;
  closingDate?: string;
  createdAt: string;
  organisation: {
    id: string;
    companyName: string;
  };
}

export default function JobsLanding() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationTerm, setLocationTerm] = useState('');
  const [remoteFilter, setRemoteFilter] = useState('all');
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    filterJobs();
  }, [jobs, searchTerm, locationTerm, remoteFilter]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/v1/jobs');
      const jobsData = response.data.data || [];
      setJobs(jobsData);
      setFilteredJobs(jobsData);
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
      setJobs([]);
      setFilteredJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const filterJobs = () => {
    let filtered = [...jobs];

    if (searchTerm) {
      filtered = filtered.filter(
        (job) =>
          job.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.organisation.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (locationTerm) {
      filtered = filtered.filter((job) =>
        job.location.toLowerCase().includes(locationTerm.toLowerCase())
      );
    }

    if (remoteFilter !== 'all') {
      filtered = filtered.filter((job) => {
        if (remoteFilter === 'remote') {
          return job.workMode === 'remote' || job.workMode === 'global_remote';
        }
        return job.workMode === remoteFilter;
      });
    }

    setFilteredJobs(filtered);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    filterJobs();
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const jobDate = new Date(date);
    const diffInHours = Math.floor((now.getTime() - jobDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
  };

  const getCompanyInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const suggestedSearches = [
    'Senior Product Designer',
    'Content Writer',
    'UX Writer',
    'Senior Product Designer',
    'Content Writer',
  ];

  return (
    <LandingLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Search Header */}
        <section className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <HiBriefcase className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Job title, skill or company"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="flex-1 relative">
                <HiLocationMarker className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="City, State or Zip code"
                  value={locationTerm}
                  onChange={(e) => setLocationTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="flex-1">
                <select
                  value={remoteFilter}
                  onChange={(e) => setRemoteFilter(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="all">All</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="on_site">On Site</option>
                  <option value="global_remote">Global Remote</option>
                </select>
              </div>
              <button
                type="submit"
                className="px-8 py-3 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 transition-colors whitespace-nowrap"
              >
                Search
              </button>
            </form>
          </div>
        </section>

        {/* Results Banner */}
        <section className="bg-brand-500 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                Jobs in {locationTerm || 'United States'}
              </h2>
              <span className="text-lg">{filteredJobs.length} results</span>
            </div>
          </div>
        </section>

        {/* Main Content - Two Columns */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {loading ? (
            <div className="text-center py-16">
              <div className="text-gray-600">Loading jobs...</div>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <HiBriefcase className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No jobs found</h3>
              <p className="text-gray-600">
                {jobs.length === 0
                  ? 'There are no jobs available at the moment.'
                  : 'No jobs match your search criteria.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Job Listings */}
              <div className="md:col-span-2 lg:col-span-3">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredJobs.map((job) => (
                  <Link
                    key={job.id}
                    to={`/jobs/${job.id}`}
                    className={`block bg-white rounded-lg p-4 cursor-pointer transition-all ${
                      'border border-gray-200 hover:border-brand-500 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-lg">
                          {getCompanyInitial(job.organisation.companyName)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 mb-1">{job.jobTitle}</h3>
                        <p className="text-sm text-gray-600 mb-1">{job.organisation.companyName}</p>
                        <p className="text-sm text-gray-500">{job.location}</p>
                        <p className="text-xs text-gray-400 mt-2">{getTimeAgo(job.createdAt)}</p>
                      </div>
                    </div>
                  </Link>
                ))}
                </div>
              </div>
            </div>
          )}

          {/* AI Suggested Job Searches */}
          {filteredJobs.length > 0 && (
            <section className="mt-12">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">AI suggested job searches</h3>
              <div className="flex flex-wrap gap-3">
                {suggestedSearches.map((search, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSearchTerm(search);
                      filterJobs();
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-full text-sm text-gray-700 hover:border-brand-500 hover:text-brand-500 transition-colors"
                  >
                    <HiSearch className="w-4 h-4" />
                    {search}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Explore Verified Opportunities */}
          {filteredJobs.length > 0 && (
            <section className="mt-12">
              <div className="flex items-center gap-2 mb-6">
                <HiBriefcase className="w-6 h-6 text-brand-500" />
                <h3 className="text-xl font-semibold text-gray-900">
                  Explore Verified Opportunities from Trusted Organisations
                </h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {filteredJobs.slice(0, 8).map((job) => (
                  <Link
                    key={job.id}
                    to={`/jobs/${job.id}`}
                    className="block bg-white rounded-lg p-4 border border-gray-200 hover:border-brand-500 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-start gap-3 mb-2">
                      <div className="w-10 h-10 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-sm">
                          {getCompanyInitial(job.organisation.companyName)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm mb-1 truncate">
                          {job.jobTitle}
                        </h4>
                        <p className="text-xs text-gray-600 truncate">{job.organisation.companyName}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">{job.location}</p>
                    <p className="text-xs text-gray-400 mt-2">{getTimeAgo(job.createdAt)}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </section>

        {/* Promotional Section - Trusted Circle */}
        <section className="mt-16 mb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-2xl overflow-hidden shadow-xl">
              <div className="grid grid-cols-1 lg:grid-cols-2">
                {/* Left Section - Blue Background with Text */}
                <div className="bg-brand-500 p-8 lg:p-12 flex flex-col justify-center text-white relative">
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                    Interact with a Trusted Circle of Professional Colleagues
                  </h2>
                  <p className="text-lg md:text-xl mb-8 leading-relaxed text-white text-opacity-95">
                    Expand your network with verified professionals across industries. Build project teams, share insights, and collaborate with confidence.
                  </p>
                  <p className="text-base md:text-lg font-medium text-white text-opacity-90">
                    Say goodbye to spam and fake profiles —only trusted identities, always
                  </p>
                </div>

                {/* Right Section - Image with L-shaped cutout */}
                <div className="relative bg-brand-500 overflow-hidden min-h-[400px] lg:min-h-[500px]">
                  {/* Image revealed in L-shape (top-right corner extending down right side) */}
                  <div 
                    className="absolute inset-0"
                    style={{ 
                      clipPath: 'polygon(70% 0, 100% 0, 100% 100%, 70% 100%)' 
                    }}
                  >
                    <img
                      src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=600&fit=crop"
                      alt="Three professionals collaborating and looking at a smartphone"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </LandingLayout>
  );
}


