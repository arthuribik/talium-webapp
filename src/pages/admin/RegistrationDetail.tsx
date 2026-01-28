import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/services/api';
import AdminLayout from '@/components/admin/AdminLayout';
import { HiArrowLeft, HiCheckCircle, HiClock, HiOfficeBuilding, HiMail, HiGlobe, HiCalendar } from 'react-icons/hi';

interface RegistrationData {
  id: string;
  step1?: {
    isRegistered: boolean;
  };
  step2?: {
    legalName: string;
    countryOfIncorporation: string;
    incorporationNumber: string;
  };
  step3?: {
    category: string;
    schoolType?: string;
    religiousOrgType?: string;
    internationalOrgType?: string;
    politicalPartyCountry?: string;
    associatedSchool?: string;
  };
  step4?: {
    description: string;
    otherName?: string;
    industry: string;
    headquartersCity: string;
    headquartersCountry: string;
    foundedDate: string;
    address: {
      buildingName?: string;
      streetNumber?: string;
      street: string;
      city: string;
      country: string;
    };
  };
  step5?: {
    organisationEmail: string;
  };
  step7?: {
    organisationName: string;
    organisationCountry: string;
    description: string;
    industry: string;
    foundedDate: string;
    address: {
      buildingName?: string;
      streetNumber?: string;
      street: string;
      city: string;
      country: string;
    };
  };
  step8?: {
    category: string;
    schoolType?: string;
    religiousOrgType?: string;
    internationalOrgType?: string;
    politicalPartyCountry?: string;
    associatedSchool?: string;
  };
  currentStep: number;
  updatedAt: string;
  createdAt?: string;
}

export default function RegistrationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [registration, setRegistration] = useState<RegistrationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchRegistrationDetail();
    }
  }, [id]);

  const fetchRegistrationDetail = async () => {
    try {
      const response = await api.get(`/v1/admin/registrations/${id}`);
      setRegistration(response.data.data);
    } catch (err) {
      console.error('Failed to fetch registration:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      school: 'School',
      religious_organisation: 'Religious Organisation',
      international_organisation: 'International Organisation',
      political_party: 'Political Party',
      student_union: 'Student Union',
      student_association: 'Student Association',
      business: 'Business',
      ngo: 'NGO',
      other: 'Other',
    };
    return labels[category] || category;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="text-center text-gray-600">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!registration) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="text-center text-gray-600">Registration not found</div>
        </div>
      </AdminLayout>
    );
  }

  const isRegistered = registration.step1?.isRegistered === true;
  const orgName = isRegistered ? registration.step2?.legalName : registration.step7?.organisationName;
  const country = isRegistered ? registration.step2?.countryOfIncorporation : registration.step7?.organisationCountry;
  const category = isRegistered ? registration.step3?.category : registration.step8?.category;
  const description = isRegistered ? registration.step4?.description : registration.step7?.description;
  const industry = isRegistered ? registration.step4?.industry : registration.step7?.industry;
  const foundedDate = isRegistered ? registration.step4?.foundedDate : registration.step7?.foundedDate;
  const address = isRegistered ? registration.step4?.address : registration.step7?.address;

  return (
    <AdminLayout>
      <div className="p-6">
        <button
          onClick={() => navigate('/admin/registrations')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <HiArrowLeft className="w-5 h-5 mr-2" />
          Back to Registrations
        </button>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Registration Details</h1>
              <p className="text-gray-600">Registration ID: {registration.id}</p>
            </div>
            <div className="flex items-center gap-2">
              {registration.currentStep >= 6 ? (
                <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full flex items-center">
                  <HiCheckCircle className="w-4 h-4 mr-1" />
                  Completed
                </span>
              ) : (
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-semibold rounded-full flex items-center">
                  <HiClock className="w-4 h-4 mr-1" />
                  Step {registration.currentStep || 1}
                </span>
              )}
            </div>
          </div>

          {/* Registration Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">Registration Type</div>
              <div className="text-lg font-semibold text-gray-900">
                {isRegistered ? 'Registered Organisation' : 'Non-Registered Organisation'}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">Current Step</div>
              <div className="text-lg font-semibold text-gray-900">Step {registration.currentStep || 1}</div>
            </div>
          </div>
        </div>

        {/* Organisation Information */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <HiOfficeBuilding className="w-6 h-6 mr-2 text-brand-600" />
            Organisation Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-gray-500 mb-1">Organisation Name</div>
              <div className="text-base font-medium text-gray-900">{orgName || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Country</div>
              <div className="text-base font-medium text-gray-900">{country || 'N/A'}</div>
            </div>
            {isRegistered && registration.step2?.incorporationNumber && (
              <div>
                <div className="text-sm text-gray-500 mb-1">Incorporation Number</div>
                <div className="text-base font-medium text-gray-900">{registration.step2.incorporationNumber}</div>
              </div>
            )}
            {category && (
              <div>
                <div className="text-sm text-gray-500 mb-1">Category</div>
                <div className="text-base font-medium text-gray-900">{getCategoryLabel(category)}</div>
              </div>
            )}
            {industry && (
              <div>
                <div className="text-sm text-gray-500 mb-1">Industry</div>
                <div className="text-base font-medium text-gray-900">{industry}</div>
              </div>
            )}
            {foundedDate && (
              <div>
                <div className="text-sm text-gray-500 mb-1">Founded Date</div>
                <div className="text-base font-medium text-gray-900">
                  {new Date(foundedDate).toLocaleDateString()}
                </div>
              </div>
            )}
            {registration.step5?.organisationEmail && (
              <div>
                <div className="text-sm text-gray-500 mb-1">Email</div>
                <div className="text-base font-medium text-gray-900 flex items-center">
                  <HiMail className="w-4 h-4 mr-2 text-gray-400" />
                  {registration.step5.organisationEmail}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {description && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Description</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{description}</p>
          </div>
        )}

        {/* Address */}
        {address && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <HiGlobe className="w-6 h-6 mr-2 text-brand-600" />
              Address
            </h2>
            <div className="text-gray-700">
              {[
                address.buildingName,
                address.streetNumber,
                address.street,
                address.city,
                address.country,
              ]
                .filter(Boolean)
                .join(', ')}
            </div>
          </div>
        )}

        {/* Category Details */}
        {category && (registration.step3 || registration.step8) && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Category Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {registration.step3?.schoolType && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">School Type</div>
                  <div className="text-base font-medium text-gray-900">{registration.step3.schoolType}</div>
                </div>
              )}
              {registration.step3?.religiousOrgType && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">Religious Organisation Type</div>
                  <div className="text-base font-medium text-gray-900">{registration.step3.religiousOrgType}</div>
                </div>
              )}
              {registration.step3?.internationalOrgType && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">International Organisation Type</div>
                  <div className="text-base font-medium text-gray-900">{registration.step3.internationalOrgType}</div>
                </div>
              )}
              {registration.step3?.politicalPartyCountry && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">Political Party Country</div>
                  <div className="text-base font-medium text-gray-900">{registration.step3.politicalPartyCountry}</div>
                </div>
              )}
              {(registration.step3?.associatedSchool || registration.step8?.associatedSchool) && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">Associated School</div>
                  <div className="text-base font-medium text-gray-900">
                    {registration.step3?.associatedSchool || registration.step8?.associatedSchool}
                  </div>
                </div>
              )}
              {registration.step8?.schoolType && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">School Type</div>
                  <div className="text-base font-medium text-gray-900">{registration.step8.schoolType}</div>
                </div>
              )}
              {registration.step8?.religiousOrgType && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">Religious Organisation Type</div>
                  <div className="text-base font-medium text-gray-900">{registration.step8.religiousOrgType}</div>
                </div>
              )}
              {registration.step8?.internationalOrgType && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">International Organisation Type</div>
                  <div className="text-base font-medium text-gray-900">{registration.step8.internationalOrgType}</div>
                </div>
              )}
              {registration.step8?.politicalPartyCountry && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">Political Party Country</div>
                  <div className="text-base font-medium text-gray-900">{registration.step8.politicalPartyCountry}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <HiCalendar className="w-6 h-6 mr-2 text-brand-600" />
            Timestamps
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {registration.createdAt && (
              <div>
                <div className="text-sm text-gray-500 mb-1">Created At</div>
                <div className="text-base font-medium text-gray-900">
                  {new Date(registration.createdAt).toLocaleString()}
                </div>
              </div>
            )}
            {registration.updatedAt && (
              <div>
                <div className="text-sm text-gray-500 mb-1">Last Updated</div>
                <div className="text-base font-medium text-gray-900">
                  {new Date(registration.updatedAt).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

