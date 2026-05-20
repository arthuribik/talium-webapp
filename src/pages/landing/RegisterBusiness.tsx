import { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAppSelector } from '@/store/hooks';
import { api } from '@/services/api';
import { 
  HiDocumentText, 
  HiQuestionMarkCircle, 
  HiChevronLeft, 
  HiChevronRight, 
  HiChevronDown,
  HiCheckCircle,
  HiCalendar,
  HiMail,
  HiX,
  HiEye,
  HiEyeOff,
  HiLockClosed
} from 'react-icons/hi';
import PhoneNumberInput from '@/components/common/PhoneNumberInput';
import { 
  FaBuilding, 
  FaGraduationCap, 
  FaChurch, 
  FaLandmark, 
  FaGlobe, 
  FaFlag,
  FaUsers,
  FaUserFriends,
  FaHandshake,
  FaFileAlt,
  FaBriefcase,
  FaEnvelope,
  FaBookmark
} from 'react-icons/fa';
import logo from '@/assets/logo.svg';

interface RegistrationFormData {
  // Step 1: Registration Status
  isRegistered: boolean | null;
  
  // Step 2: Incorporation Details (for registered organizations)
  legalName: string;
  countryOfIncorporation: string;
  incorporationNumber: string;
  
  // Step 7: Organisation Details (for non-registered organizations)
  organisationName: string;
  organisationCountry: string;
  
  // Step 3: Category
  category: string;
  
  // Conditional fields based on category
  schoolType: string; // for School
  religiousOrgType: string; // for Religious Organisation
  internationalOrgType: string; // for International Organisation
  politicalPartyCountry: string; // for Political Party
  associatedSchool: string; // for Student Union and Student Association
  
  // Step 4: Description
  description: string; // Describe Your Organisation
  otherName: string; // Other name known as
  industry: string; // Industry
  headquartersCity: string; // Headquarters City
  headquartersCountry: string; // Headquarters Country
  foundedDate: string; // When was organisation founded
  address: {
    buildingName: string;
    streetNumber: string;
    street: string;
    city: string;
    country: string;
  };
  
  // Step 5: Email Verification
  organisationEmail: string; // Organisation Email
  emailVerified: boolean; // Email verification status
  verificationCode: string; // 6-digit verification code
  codeSent: boolean; // Whether verification code has been sent
  
  // Future steps
  [key: string]: any;
}

interface CategoryOption {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

import { COUNTRIES } from '@/utils/countries';

// Organization categories
const CATEGORIES: CategoryOption[] = [
  { id: 'company', label: 'Company', icon: FaBuilding },
  { id: 'school', label: 'School', icon: FaGraduationCap },
  { id: 'religious_organisation', label: 'Religious Organisation', icon: FaChurch },
  { id: 'government_agency', label: 'Government Agency', icon: FaLandmark },
  { id: 'international_organisation', label: 'International Organisation', icon: FaGlobe },
  { id: 'political_party', label: 'Political Party', icon: FaFlag },
  { id: 'student_union', label: 'Student Union', icon: FaUsers },
  { id: 'student_association', label: 'Student Association', icon: FaUserFriends },
  { id: 'association', label: 'Association', icon: FaHandshake },
];

// Industries list
const INDUSTRIES = [
  'Technology', 'Healthcare', 'Finance', 'Education', 'Manufacturing', 'Retail',
  'Real Estate', 'Construction', 'Transportation', 'Energy', 'Agriculture', 'Food & Beverage',
  'Entertainment', 'Media & Communications', 'Consulting', 'Legal Services', 'Accounting',
  'Hospitality', 'Tourism', 'Non-Profit', 'Government', 'Pharmaceuticals', 'Automotive',
  'Aerospace', 'Telecommunications', 'Banking', 'Insurance', 'Investment', 'E-commerce',
  'Fashion', 'Sports', 'Arts & Culture', 'Research', 'Other'
];

export default function RegisterBusiness() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [savingStep, setSavingStep] = useState(false);
  const [formData, setFormData] = useState<RegistrationFormData>({
    isRegistered: null,
    legalName: '',
    organisationName: '',
    countryOfIncorporation: '',
    organisationCountry: '',
    incorporationNumber: '',
    category: '',
    schoolType: '',
    religiousOrgType: '',
    internationalOrgType: '',
    politicalPartyCountry: '',
    associatedSchool: '',
    description: '',
    otherName: '',
    industry: '',
    headquartersCity: '',
    headquartersCountry: '',
    foundedDate: '',
    address: {
      buildingName: '',
      streetNumber: '',
      street: '',
      city: '',
      country: '',
    },
    organisationEmail: '',
    emailVerified: false,
    verificationCode: '',
    codeSent: false,
  });
  const [localError, setLocalError] = useState('');
  const { loading, error } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();

  // Show toast errors when error or localError changes
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  useEffect(() => {
    if (localError) {
      toast.error(localError);
    }
  }, [localError]);

  // Initialize from URL params and localStorage
  useEffect(() => {
    const initialize = async () => {
      const stepParam = searchParams.get('step');
      const idParam = searchParams.get('id');
      
      // Clear localStorage unless we have step=5 with an id
      const isStep5WithId = stepParam === '5' && idParam;
      if (!isStep5WithId) {
        localStorage.removeItem('registrationId');
      }
      
      // Resolve step from URL (defaults to 1)
      let targetStep = 1;
      if (stepParam) {
        const parsedStep = parseInt(stepParam, 10);
        if (!Number.isNaN(parsedStep) && parsedStep >= 1 && parsedStep <= 8) {
          targetStep = parsedStep;
        }
      }
      
      // Get registration ID from URL or localStorage
      const storedId = isStep5WithId ? localStorage.getItem('registrationId') : null;
      const regId = idParam || storedId || null;
      
      // If we already have an ID, set it and load data
      if (regId) {
        setRegistrationId(regId);
        localStorage.setItem('registrationId', regId);
        setCurrentStep(targetStep);
        await loadRegistrationData(regId);
        return;
      }
      
      // If no ID yet and the user is landing on step 2 (registered flow)
      // or step 7 (non-registered flow), create a registration ID immediately
      if (targetStep === 2 || targetStep === 7) {
        const isRegistered = targetStep === 2;
        // Prime local form state
        setFormData((prev) => ({ ...prev, isRegistered }));
        
        try {
          const response = await api.post('/v1/auth/registration/step', { step: 1, isRegistered });
          const newId = response.data?.id;
          if (newId) {
            setRegistrationId(newId);
            localStorage.setItem('registrationId', newId);
            setCurrentStep(targetStep);
          } else {
            setCurrentStep(1);
          }
        } catch (err) {
          console.error('Failed to initialize registration ID:', err);
          setCurrentStep(1);
        }
      } else {
        // Default to first step
        setCurrentStep(1);
      }
    };
    
    void initialize();
  }, []);

  // Update URL params when step or ID changes
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('step', currentStep.toString());
    if (registrationId) {
      params.set('id', registrationId);
      localStorage.setItem('registrationId', registrationId);
    }
    setSearchParams(params, { replace: true });
  }, [currentStep, registrationId, setSearchParams]);

  // Load registration data from API
  const loadRegistrationData = async (id: string) => {
    try {
      const response = await api.get(`/v1/auth/registration/${id}`);
      const data = response.data;
      
      // Restore form data from saved registration
      if (data.step1) {
        setFormData(prev => ({ ...prev, isRegistered: data.step1.isRegistered }));
      }
      if (data.step2) {
        setFormData(prev => ({
          ...prev,
          legalName: data.step2.legalName || '',
          countryOfIncorporation: data.step2.countryOfIncorporation || '',
          incorporationNumber: data.step2.incorporationNumber || '',
        }));
      }
      if (data.step3) {
        setFormData(prev => ({
          ...prev,
          category: data.step3.category || '',
          schoolType: data.step3.schoolType || '',
          religiousOrgType: data.step3.religiousOrgType || '',
          internationalOrgType: data.step3.internationalOrgType || '',
          politicalPartyCountry: data.step3.politicalPartyCountry || '',
          associatedSchool: data.step3.associatedSchool || '',
        }));
      }
      if (data.step4) {
        setFormData(prev => ({
          ...prev,
          description: data.step4.description || '',
          otherName: data.step4.otherName || '',
          industry: data.step4.industry || '',
          headquartersCity: data.step4.headquartersCity || '',
          headquartersCountry: data.step4.headquartersCountry || '',
          foundedDate: data.step4.foundedDate || '',
          address: data.step4.address || prev.address,
        }));
      }
      if (data.step5) {
        setFormData(prev => ({
          ...prev,
          organisationEmail: data.step5.organisationEmail || '',
        }));
        if (data.step5.phoneNumber) {
          setPhoneNumber(data.step5.phoneNumber);
        }
      }
      if (data.step7) {
        setFormData(prev => ({
          ...prev,
          organisationName: data.step7.organisationName || '',
          organisationCountry: data.step7.organisationCountry || '',
          description: data.step7.description || '',
          industry: data.step7.industry || '',
          foundedDate: data.step7.foundedDate || '',
          address: data.step7.address || prev.address,
        }));
      }
      if (data.step8) {
        setFormData(prev => ({
          ...prev,
          category: data.step8.category || '',
          schoolType: data.step8.schoolType || '',
          religiousOrgType: data.step8.religiousOrgType || '',
          internationalOrgType: data.step8.internationalOrgType || '',
          politicalPartyCountry: data.step8.politicalPartyCountry || '',
          associatedSchool: data.step8.associatedSchool || '',
        }));
      }
    } catch (error) {
      console.error('Failed to load registration data:', error);
    }
  };

  // Ensure registration ID exists, create one if needed
  const ensureRegistrationId = async (isRegistered: boolean): Promise<string> => {
    if (registrationId) {
      return registrationId;
    }
    
    // Create a new registration by saving step 1
    try {
        const step1Data = { step: 1, isRegistered };
        const response = await api.post(`/v1/auth/registration/step`, step1Data);
      const newId = response.data.id;
      
      if (newId) {
        setRegistrationId(newId);
        localStorage.setItem('registrationId', newId);
        // Also update formData with the registration status
        setFormData(prev => ({ ...prev, isRegistered }));
        return newId;
      }
      
      throw new Error('Failed to create registration ID');
    } catch (error: any) {
      setLocalError(error.response?.data?.message || 'Failed to create registration. Please try again.');
      throw error;
    }
  };

  // Save step data to API (using unified endpoint)
  const saveStepData = async (step: number, data: any): Promise<string | null> => {
    setSavingStep(true);
    setLocalError('');
    
    try {
      // Ensure we have a registration ID before saving (except for steps 1 and 7 which create the ID)
      let idToUse = registrationId;
      if (!idToUse && step !== 1 && step !== 7) {
        // Determine if registered based on current step or formData
        // Steps 2, 3, 4, 5 are for registered flow
        // Steps 8 is for non-registered flow
        const isRegistered = step >= 2 && step <= 5;
        idToUse = await ensureRegistrationId(isRegistered);
      }
      
      // Use unified endpoint
      const payload = {
        step,
        ...(idToUse && { id: idToUse }),
        ...data,
      };
      
      const response = await api.post(`/v1/auth/registration/step`, payload);
      
      const returnedId = response.data.id;
      if (returnedId && returnedId !== registrationId) {
        setRegistrationId(returnedId);
        localStorage.setItem('registrationId', returnedId);
      }
      
      toast.success('Step saved successfully!');
      setSavingStep(false);
      return returnedId;
    } catch (error: any) {
      setSavingStep(false);
      const errorMsg = error.response?.data?.message || 'Failed to save step data';
      setLocalError(errorMsg);
      toast.error(errorMsg);
      throw error;
    }
  };

  const handleRegistrationStatusSelect = (isRegistered: boolean) => {
    setFormData({ ...formData, isRegistered });
    // Move to next step
    if (isRegistered) {
      setTimeout(() => setCurrentStep(2), 300); // Step 2: Incorporation Details
    } else {
      setTimeout(() => setCurrentStep(7), 300); // Step 7: Organisation Details (non-registered)
    }
  };

  const handleInputChange = (field: keyof RegistrationFormData, value: string) => {
    setFormData({ ...formData, [field]: value });
    setLocalError('');
  };

  const handleAddressChange = (field: keyof RegistrationFormData['address'], value: string) => {
    setFormData({
      ...formData,
      address: { ...formData.address, [field]: value },
    });
    setLocalError('');
  };

  const handleVerifyEmail = async () => {
    if (!formData.organisationEmail.trim()) {
      setLocalError('Please enter an email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.organisationEmail)) {
      setLocalError('Please enter a valid email address');
      return;
    }

    setVerifyingEmail(true);
    setLocalError('');

    try {
      // Call backend API to send verification code
      const response = await api.post('/v1/auth/send-verification-code', { 
        email: formData.organisationEmail 
      });
      
      // Mark that code has been sent
      setFormData({ ...formData, codeSent: true, verificationCode: '' });
      
      // In development, log the code if returned
      if (response.data.code) {
        console.log('Verification code:', response.data.code);
      }
    } catch (err: any) {
      setLocalError(err.response?.data?.message || 'Failed to send verification code');
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleVerifyCode = async () => {
    if (formData.verificationCode.length !== 6) {
      setLocalError('Please enter the complete 6-digit code');
      return;
    }

    setVerifyingCode(true);
    setLocalError('');

    try {
      // Call backend API to verify code
      await api.post('/v1/auth/verify-email', { 
        email: formData.organisationEmail,
        code: formData.verificationCode
      });
      
      // Mark as verified
      setFormData({ ...formData, emailVerified: true });
    } catch (err: any) {
      setLocalError(err.response?.data?.message || 'Invalid verification code. Please try again.');
      setFormData({ ...formData, verificationCode: '' });
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleResendCode = async () => {
    await handleVerifyEmail();
  };

  const handleCodeInputChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = formData.verificationCode.split('');
    newCode[index] = value;
    const updatedCode = newCode.join('').slice(0, 6);
    
    setFormData({ ...formData, verificationCode: updatedCode });
    setLocalError('');

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      if (nextInput) {
        (nextInput as HTMLInputElement).focus();
      }
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace to move to previous input
    if (e.key === 'Backspace' && !formData.verificationCode[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      if (prevInput) {
        (prevInput as HTMLInputElement).focus();
      }
    }
  };

  const handleNext = async () => {
    setLocalError('');
    
    if (currentStep === 1) {
      if (formData.isRegistered === null) {
        setLocalError('Please select a registration status');
        return;
      }
      // Save step 1 data
      try {
        const id = await saveStepData(1, { isRegistered: formData.isRegistered });
        if (id) setRegistrationId(id);
        
        if (formData.isRegistered) {
          setCurrentStep(2);
        } else {
          setCurrentStep(7);
        }
      } catch (error) {
        // Error already handled in saveStepData
        return;
      }
    } else if (currentStep === 7) {
      // Validate Step 7 fields (Organisation Details for non-registered)
      if (!formData.organisationName.trim()) {
        setLocalError('Organisation name is required');
        return;
      }
      if (!formData.organisationCountry) {
        setLocalError('Country is required');
        return;
      }
      if (!formData.description.trim()) {
        setLocalError('Description is required');
        return;
      }
      if (!formData.industry) {
        setLocalError('Industry is required');
        return;
      }
      if (!formData.foundedDate) {
        setLocalError('Founded date is required');
        return;
      }
      if (!formData.address.street.trim()) {
        setLocalError('Street address is required');
        return;
      }
      if (!formData.address.city.trim()) {
        setLocalError('City is required');
        return;
      }
      if (!formData.address.country) {
        setLocalError('Address country is required');
        return;
      }
      // Save step 7 data (this will create ID if needed)
      try {
        await saveStepData(7, {
          organisationName: formData.organisationName,
          organisationCountry: formData.organisationCountry,
          description: formData.description,
          industry: formData.industry,
          foundedDate: formData.foundedDate,
          address: formData.address,
        });
        setCurrentStep(8);
      } catch (error) {
        return;
      }
    } else if (currentStep === 8) {
      // Validate Step 8 fields (Category for non-registered)
      if (!formData.category) {
        setLocalError('Please select a category');
        return;
      }
      
      // Validate conditional fields based on category
      if (formData.category === 'school' && !formData.schoolType) {
        setLocalError('Please select a school type');
        return;
      }
      if (formData.category === 'religious_organisation' && !formData.religiousOrgType) {
        setLocalError('Please select a religious organisation type');
        return;
      }
      if (formData.category === 'international_organisation' && !formData.internationalOrgType) {
        setLocalError('Please select an international organisation type');
        return;
      }
      if (formData.category === 'political_party' && !formData.politicalPartyCountry) {
        setLocalError('Please select a country');
        return;
      }
      if ((formData.category === 'student_union' || formData.category === 'student_association') && !formData.associatedSchool.trim()) {
        setLocalError('Please enter the associated school');
        return;
      }
      
      // Save step 8 data (this will create ID if needed)
      try {
        await saveStepData(8, {
          category: formData.category,
          schoolType: formData.schoolType,
          religiousOrgType: formData.religiousOrgType,
          internationalOrgType: formData.internationalOrgType,
          politicalPartyCountry: formData.politicalPartyCountry,
          associatedSchool: formData.associatedSchool,
        });
        setCurrentStep(5);
      } catch (error) {
        return;
      }
    } else if (currentStep === 2) {
      // Validate Step 2 fields
      if (!formData.legalName.trim()) {
        setLocalError('Legal name is required');
        return;
      }
      if (!formData.countryOfIncorporation) {
        setLocalError('Country of incorporation is required');
        return;
      }
      if (!formData.incorporationNumber.trim()) {
        setLocalError('Incorporation number is required');
        return;
      }
      // Save step 2 data (this will create ID if needed)
      try {
        await saveStepData(2, {
          legalName: formData.legalName,
          countryOfIncorporation: formData.countryOfIncorporation,
          incorporationNumber: formData.incorporationNumber,
        });
        setCurrentStep(3);
      } catch (error) {
        return;
      }
    } else if (currentStep === 3) {
      // Validate Step 3 fields
      if (!formData.category) {
        setLocalError('Please select a category');
        return;
      }
      
      // Validate conditional fields based on category
      if (formData.category === 'school' && !formData.schoolType) {
        setLocalError('Please select a school type');
        return;
      }
      if (formData.category === 'religious_organisation' && !formData.religiousOrgType) {
        setLocalError('Please select a religious organisation type');
        return;
      }
      if (formData.category === 'international_organisation' && !formData.internationalOrgType) {
        setLocalError('Please select an international organisation type');
        return;
      }
      if (formData.category === 'political_party' && !formData.politicalPartyCountry) {
        setLocalError('Please select a country');
        return;
      }
      if ((formData.category === 'student_union' || formData.category === 'student_association') && !formData.associatedSchool.trim()) {
        setLocalError('Please enter the associated school');
        return;
      }
      
      // Save step 3 data (this will create ID if needed)
      try {
        await saveStepData(3, {
          category: formData.category,
          schoolType: formData.schoolType,
          religiousOrgType: formData.religiousOrgType,
          internationalOrgType: formData.internationalOrgType,
          politicalPartyCountry: formData.politicalPartyCountry,
          associatedSchool: formData.associatedSchool,
        });
        setCurrentStep(4);
      } catch (error) {
        return;
      }
    } else if (currentStep === 4) {
      // Validate Step 4 fields
      if (!formData.description.trim()) {
        setLocalError('Please describe your organisation');
        return;
      }
      if (formData.description.length > 500) {
        setLocalError('Description must be 500 characters or less');
        return;
      }
      if (!formData.industry) {
        setLocalError('Please select an industry');
        return;
      }
      if (!formData.headquartersCity.trim()) {
        setLocalError('Please enter headquarters city');
        return;
      }
      if (!formData.headquartersCountry) {
        setLocalError('Please select headquarters country');
        return;
      }
      if (!formData.foundedDate) {
        setLocalError('Please enter the founding date');
        return;
      }
      if (!formData.address.street.trim()) {
        setLocalError('Please enter street address');
        return;
      }
      if (!formData.address.city.trim()) {
        setLocalError('Please enter city');
        return;
      }
      if (!formData.address.country) {
        setLocalError('Please select country');
        return;
      }
      // Save step 4 data (this will create ID if needed)
      try {
        await saveStepData(4, {
          description: formData.description,
          otherName: formData.otherName,
          industry: formData.industry,
          headquartersCity: formData.headquartersCity,
          headquartersCountry: formData.headquartersCountry,
          foundedDate: formData.foundedDate,
          address: formData.address,
        });
        setCurrentStep(5);
      } catch (error) {
        return;
      }
    } else if (currentStep === 5) {
      // Validate Step 5 fields
      if (!formData.organisationEmail.trim()) {
        setLocalError('Please enter an organisation email address');
        return;
      }
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.organisationEmail)) {
        setLocalError('Please enter a valid email address');
        return;
      }
      if (!formData.emailVerified) {
        setLocalError('Please verify your email address before continuing');
        return;
      }
      if (!phoneNumber.trim()) {
        setLocalError('Please enter a phone number');
        return;
      }
      // Save step 5 data (this will create ID if needed)
      try {
        await saveStepData(5, {
          organisationEmail: formData.organisationEmail,
          phoneNumber: phoneNumber,
        });
        setCurrentStep(6);
      } catch (error) {
        return;
      }
    } else if (currentStep === 6) {
      // Step 6 is preview, so "Set Your Password" will move to password step
      // For now, we'll handle the final submission later
      // This will be implemented when we add the password step
    }
    // Add more step validations as we add more steps
  };

  const handleBack = () => {
    if (currentStep > 1) {
      // Special handling for step 7 (Organisation Details for non-registered) - go back to step 1
      if (currentStep === 7 && formData.isRegistered === false) {
        setCurrentStep(1); // Go back to "Create Your Organisation" page
      } else if (currentStep === 5 && formData.isRegistered === false) {
        setCurrentStep(8); // Go back to Category for non-registered
      } else if (currentStep === 5 && formData.isRegistered === true) {
        setCurrentStep(4); // Go back to Description for registered
      } else if (currentStep === 8 && formData.isRegistered === false) {
        setCurrentStep(7); // Go back to Organisation Details for non-registered
      } else {
        setCurrentStep(currentStep - 1);
      }
      setLocalError('');
    }
  };

  // Step 1: Registration Status Selection
  const renderStep1 = () => {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Your Organisation</h1>
          <p className="text-gray-600">Let's start by understanding your organisation's registration status</p>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-8">
            Is Your Organisation Registered?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Yes, It's Registered */}
            <button
              type="button"
              onClick={() => handleRegistrationStatusSelect(true)}
              className={`p-6 rounded-xl border-2 transition-all text-left ${
                formData.isRegistered === true
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex flex-col items-start">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                  <HiDocumentText className="w-6 h-6 text-brand-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Yes, It's Registered
                </h3>
                <p className="text-sm text-gray-600">
                  My organisation is officially incorporated or registered with a government body
                </p>
              </div>
            </button>

            {/* No, Not Registered */}
            <button
              type="button"
              onClick={() => handleRegistrationStatusSelect(false)}
              className={`p-6 rounded-xl border-2 transition-all text-left ${
                formData.isRegistered === false
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex flex-col items-start">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                  <HiQuestionMarkCircle className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No, Not Registered
                </h3>
                <p className="text-sm text-gray-600">
                  My organisation operates informally without official registration
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-end mt-8">
          <button
            type="button"
            onClick={handleNext}
            disabled={formData.isRegistered === null || loading || savingStep}
            className="px-6 py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {savingStep ? 'Saving...' : 'Continue'}
          </button>
        </div>
      </div>
    );
  };

  // Step 2: Incorporation Details (for registered organizations)
  const renderStep2 = () => {
    return (
      <div className="w-full max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Organisation Status & Incorporation Details
          </h1>
          <p className="text-gray-600">
            Provide your organisation's official registration information.
          </p>
        </div>

        <div className="space-y-6">
          {/* Legal Name */}
          <div>
            <label htmlFor="legalName" className="block text-sm font-medium text-gray-700 mb-2">
              What is the Legal Name of Your Organisation? <span className="text-red-500">*</span>
            </label>
            <input
              id="legalName"
              type="text"
              value={formData.legalName}
              onChange={(e) => handleInputChange('legalName', e.target.value)}
              placeholder="e.g., Acme Corporation Ltd"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Country of Incorporation */}
          <div>
            <label htmlFor="countryOfIncorporation" className="block text-sm font-medium text-gray-700 mb-2">
              What Country is it Incorporated/Registered? <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                id="countryOfIncorporation"
                value={formData.countryOfIncorporation}
                onChange={(e) => handleInputChange('countryOfIncorporation', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                required
              >
                <option value="">Select country</option>
                {COUNTRIES.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
              <HiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Incorporation Number */}
          <div>
            <label htmlFor="incorporationNumber" className="block text-sm font-medium text-gray-700 mb-2">
              What is the Incorporation Number? <span className="text-red-500">*</span>
            </label>
            <input
              id="incorporationNumber"
              type="text"
              value={formData.incorporationNumber}
              onChange={(e) => handleInputChange('incorporationNumber', e.target.value)}
              placeholder="e.g., RC123456"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="mt-2 text-sm text-gray-500">
              This is the unique identifier assigned during registration
            </p>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            <HiChevronLeft className="w-5 h-5 mr-2" />
            Back
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={loading || savingStep || !formData.legalName.trim() || !formData.countryOfIncorporation || !formData.incorporationNumber.trim()}
            className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {savingStep ? 'Saving...' : 'Continue'}
            <HiChevronRight className="w-5 h-5 ml-2" />
          </button>
        </div>
      </div>
    );
  };

  // Step 3: Category Selection
  const renderStep3 = () => {
    const isContinueDisabled = () => {
      if (!formData.category) return true;
      
      // Check conditional field requirements
      if (formData.category === 'school' && !formData.schoolType) return true;
      if (formData.category === 'religious_organisation' && !formData.religiousOrgType) return true;
      if (formData.category === 'international_organisation' && !formData.internationalOrgType) return true;
      if (formData.category === 'political_party' && !formData.politicalPartyCountry) return true;
      if ((formData.category === 'student_union' || formData.category === 'student_association') && !formData.associatedSchool.trim()) return true;
      
      return false;
    };

    return (
      <div className="w-full max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Select Your Organisation Category
          </h1>
          <p className="text-gray-600">
            Choose the category that best describes your organisation
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {CATEGORIES.map((category) => {
            const Icon = category.icon;
            const isSelected = formData.category === category.id;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => handleInputChange('category', category.id)}
                className={`p-6 rounded-lg border-2 transition-all flex flex-col items-center justify-center ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <Icon className={`w-8 h-8 mb-3 ${
                  isSelected ? 'text-blue-600' : 'text-gray-400'
                }`} />
                <span className={`text-sm font-medium text-center ${
                  isSelected ? 'text-blue-600' : 'text-gray-700'
                }`}>
                  {category.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Conditional Fields */}
        {formData.category && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            {/* School Type */}
            {formData.category === 'school' && (
              <div className="mb-4">
                <label htmlFor="schoolType" className="block text-sm font-medium text-gray-700 mb-2">
                  School Type <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="schoolType"
                    value={formData.schoolType}
                    onChange={(e) => handleInputChange('schoolType', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                    required
                  >
                    <option value="">Select school type</option>
                    <option value="primary">Primary School</option>
                    <option value="secondary">Secondary School</option>
                    <option value="high_school">High School</option>
                    <option value="vocational">Vocational School</option>
                    <option value="university">University</option>
                    <option value="college">College</option>
                    <option value="technical">Technical Institute</option>
                    <option value="other">Other</option>
                  </select>
                  <HiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Religious Organisation Type */}
            {formData.category === 'religious_organisation' && (
              <div className="mb-4">
                <label htmlFor="religiousOrgType" className="block text-sm font-medium text-gray-700 mb-2">
                  Religious Organisation Type <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="religiousOrgType"
                    value={formData.religiousOrgType}
                    onChange={(e) => handleInputChange('religiousOrgType', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                    required
                  >
                    <option value="">Select type</option>
                    <option value="church">Church</option>
                    <option value="mosque">Mosque</option>
                    <option value="temple">Temple</option>
                    <option value="synagogue">Synagogue</option>
                    <option value="gurdwara">Gurdwara</option>
                    <option value="shrine">Shrine</option>
                    <option value="monastery">Monastery</option>
                    <option value="other">Other</option>
                  </select>
                  <HiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* International Organisation Type */}
            {formData.category === 'international_organisation' && (
              <div className="mb-4">
                <label htmlFor="internationalOrgType" className="block text-sm font-medium text-gray-700 mb-2">
                  International Organisation Type <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="internationalOrgType"
                    value={formData.internationalOrgType}
                    onChange={(e) => handleInputChange('internationalOrgType', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                    required
                  >
                    <option value="">Select type</option>
                    <option value="ngo">NGO (Non-Governmental Organisation)</option>
                    <option value="igo">IGO (Inter-Governmental Organisation)</option>
                    <option value="multilateral">Multilateral Organisation</option>
                    <option value="charity">Charity</option>
                    <option value="foundation">Foundation</option>
                    <option value="association">International Association</option>
                    <option value="other">Other</option>
                  </select>
                  <HiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Political Party Country */}
            {formData.category === 'political_party' && (
              <div className="mb-4">
                <label htmlFor="politicalPartyCountry" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Country <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="politicalPartyCountry"
                    value={formData.politicalPartyCountry}
                    onChange={(e) => handleInputChange('politicalPartyCountry', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                    required
                  >
                    <option value="">Select country</option>
                    {COUNTRIES.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                  <HiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Associated School (for Student Union and Student Association) */}
            {(formData.category === 'student_union' || formData.category === 'student_association') && (
              <div className="mb-4">
                <label htmlFor="associatedSchool" className="block text-sm font-medium text-gray-700 mb-2">
                  Associated School <span className="text-red-500">*</span>
                </label>
                <input
                  id="associatedSchool"
                  type="text"
                  value={formData.associatedSchool}
                  onChange={(e) => handleInputChange('associatedSchool', e.target.value)}
                  placeholder="Enter the name of the associated school"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            <HiChevronLeft className="w-5 h-5 mr-2" />
            Back
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={loading || savingStep || isContinueDisabled()}
            className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {savingStep ? 'Saving...' : 'Continue'}
            <HiChevronRight className="w-5 h-5 ml-2" />
          </button>
        </div>
      </div>
    );
  };

  // Step 4: Organisation Description
  const renderStep4 = () => {
    return (
      <div className="w-full max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Organisation Description
          </h1>
          <p className="text-gray-600">
            Tell us more about your organisation
          </p>
        </div>

        <div className="space-y-6">
          {/* Describe Your Organisation */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Describe Your Organisation <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= 500) {
                    handleInputChange('description', value);
                  }
                }}
                placeholder="We are a technology company focused on..."
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                required
              />
              <div className="absolute bottom-3 right-3 text-sm text-gray-400">
                {formData.description.length}/500
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              A brief description of what your organisation does
            </p>
          </div>

          {/* Other Name */}
          <div>
            <label htmlFor="otherName" className="block text-sm font-medium text-gray-700 mb-2">
              What Other Name is Your Organisation Known As?
            </label>
            <input
              id="otherName"
              type="text"
              value={formData.otherName}
              onChange={(e) => handleInputChange('otherName', e.target.value)}
              placeholder="e.g., ACME"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-2 text-sm text-gray-500">
              Trading name, acronym, or alias
            </p>
          </div>

          {/* Industry */}
          <div>
            <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-2">
              What Industry is Your Organisation? <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                id="industry"
                value={formData.industry}
                onChange={(e) => handleInputChange('industry', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                required
              >
                <option value="">Select industry</option>
                {INDUSTRIES.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
              <HiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Headquarters City and Country */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="headquartersCity" className="block text-sm font-medium text-gray-700 mb-2">
                Headquarters City <span className="text-red-500">*</span>
              </label>
              <input
                id="headquartersCity"
                type="text"
                value={formData.headquartersCity}
                onChange={(e) => handleInputChange('headquartersCity', e.target.value)}
                placeholder="e.g., Lagos"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="headquartersCountry" className="block text-sm font-medium text-gray-700 mb-2">
                Headquarters Country <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="headquartersCountry"
                  value={formData.headquartersCountry}
                  onChange={(e) => handleInputChange('headquartersCountry', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                  required
                >
                  <option value="">Select country</option>
                  {COUNTRIES.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
                <HiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Founded Date */}
          <div>
            <label htmlFor="foundedDate" className="block text-sm font-medium text-gray-700 mb-2">
              When was Your Organisation Founded? <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="foundedDate"
                type="date"
                value={formData.foundedDate}
                onChange={(e) => handleInputChange('foundedDate', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                required
              />
              <HiCalendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Address Section */}
          <div className="pt-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Address</h2>
            
            <div className="space-y-4">
              {/* Building Name and Street Number */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="buildingName" className="block text-sm font-medium text-gray-700 mb-2">
                    Building Name
                  </label>
                  <input
                    id="buildingName"
                    type="text"
                    value={formData.address.buildingName}
                    onChange={(e) => handleAddressChange('buildingName', e.target.value)}
                    placeholder="e.g., Tower 1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="streetNumber" className="block text-sm font-medium text-gray-700 mb-2">
                    Street Number
                  </label>
                  <input
                    id="streetNumber"
                    type="text"
                    value={formData.address.streetNumber}
                    onChange={(e) => handleAddressChange('streetNumber', e.target.value)}
                    placeholder="e.g., 123"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Street */}
              <div>
                <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-2">
                  Street <span className="text-red-500">*</span>
                </label>
                <input
                  id="street"
                  type="text"
                  value={formData.address.street}
                  onChange={(e) => handleAddressChange('street', e.target.value)}
                  placeholder="e.g., Victoria Island"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* City and Country */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="addressCity" className="block text-sm font-medium text-gray-700 mb-2">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="addressCity"
                    type="text"
                    value={formData.address.city}
                    onChange={(e) => handleAddressChange('city', e.target.value)}
                    placeholder="e.g., Lagos"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="addressCountry" className="block text-sm font-medium text-gray-700 mb-2">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="addressCountry"
                      value={formData.address.country}
                      onChange={(e) => handleAddressChange('country', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                      required
                    >
                      <option value="">Select country</option>
                      {COUNTRIES.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                    <HiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            <HiChevronLeft className="w-5 h-5 mr-2" />
            Back
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={loading || savingStep || !formData.description.trim() || !formData.industry || !formData.headquartersCity.trim() || !formData.headquartersCountry || !formData.foundedDate || !formData.address.street.trim() || !formData.address.city.trim() || !formData.address.country}
            className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {savingStep ? 'Saving...' : 'Continue'}
            <HiChevronRight className="w-5 h-5 ml-2" />
          </button>
        </div>
      </div>
    );
  };

  // Step 5: Email Verification
  const renderStep5 = () => {
    return (
      <div className="w-full max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Email Verification
          </h1>
          <p className="text-gray-600">
            Verify your organisation's email address
          </p>
        </div>

        <div className="space-y-8">
          {/* Organisation Email Input Section */}
          <div>
            <label htmlFor="organisationEmail" className="block text-sm font-medium text-gray-700 mb-2">
              Organisation Email <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-3">
              <input
                id="organisationEmail"
                type="email"
                value={formData.organisationEmail}
                onChange={(e) => {
                  // Reset verification status when email changes
                  if (formData.emailVerified || formData.codeSent) {
                    setFormData({ 
                      ...formData, 
                      organisationEmail: e.target.value, 
                      emailVerified: false,
                      codeSent: false,
                      verificationCode: ''
                    });
                  } else {
                    handleInputChange('organisationEmail', e.target.value);
                  }
                }}
                placeholder="contact@yourorganisation.com"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                required
                disabled={formData.codeSent || formData.emailVerified}
              />
              <button
                type="button"
                onClick={handleVerifyEmail}
                disabled={verifyingEmail || !formData.organisationEmail.trim() || formData.codeSent || formData.emailVerified}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                {verifyingEmail ? 'Sending...' : 'Verify Email'}
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Use an official organisation email address
            </p>
          </div>

          {/* Verification Code Section */}
          {formData.codeSent && !formData.emailVerified && (
            <div className="pt-6 border-t border-gray-200">
              <div className="flex flex-col items-center text-center">
                {/* Envelope Icon */}
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <HiMail className="w-8 h-8 text-green-600" />
                </div>

                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Check Your Email
                </h2>
                <p className="text-sm text-gray-600 mb-6">
                  We've sent a 6-digit verification code to <span className="font-medium">{formData.organisationEmail}</span>
                </p>

                {/* Code Input Fields */}
                <div className="flex gap-3 mb-6">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <input
                      key={index}
                      id={`code-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={formData.verificationCode[index] || ''}
                      onChange={(e) => handleCodeInputChange(index, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(index, e)}
                      className="w-12 h-12 text-center text-lg font-semibold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  ))}
                </div>

                {/* Verify Code Button */}
                <button
                  type="button"
                  onClick={handleVerifyCode}
                  disabled={verifyingCode || formData.verificationCode.length !== 6}
                  className="px-8 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-4"
                >
                  {verifyingCode ? 'Verifying...' : 'Verify Code'}
                </button>

                {/* Resend Link */}
                <div className="text-sm text-gray-600">
                  Didn't receive the code?{' '}
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={verifyingEmail}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Resend
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {formData.emailVerified && (
            <div className="pt-6 border-t border-gray-200">
              <div className="flex flex-col items-center text-center">
                {/* Large Green Checkmark Circle */}
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-4">
                  <HiCheckCircle className="w-12 h-12 text-white" />
                </div>
                
                {/* Success Message */}
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Email Verified!
                </h2>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">{formData.organisationEmail}</span> has been verified successfully
                </p>
              </div>
            </div>
          )}

          {/* Phone Number Input Section */}
          {formData.emailVerified && (
            <div className="pt-6 border-t border-gray-200">
              <div>
                <PhoneNumberInput
                  value={phoneNumber}
                  onChange={setPhoneNumber}
                  label="Phone Number"
                  required
                  placeholder="Enter phone number"
                />
                <p className="mt-2 text-sm text-gray-500">
                  We'll use this to contact you about your organisation
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            <HiChevronLeft className="w-5 h-5 mr-2" />
            Back
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={loading || savingStep || !formData.organisationEmail.trim() || !formData.emailVerified || !phoneNumber.trim()}
            className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {savingStep ? 'Saving...' : 'Continue'}
            <HiChevronRight className="w-5 h-5 ml-2" />
          </button>
        </div>
      </div>
    );
  };

  // Helper function to get category label
  const getCategoryLabel = (categoryId: string) => {
    const category = CATEGORIES.find(cat => cat.id === categoryId);
    return category ? category.label : categoryId;
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  // Password validation
  const getPasswordRequirements = () => {
    const requirements = {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[@$!%*?&]/.test(password),
    };
    return requirements;
  };

  const isPasswordValid = () => {
    const reqs = getPasswordRequirements();
    return Object.values(reqs).every(req => req === true);
  };

  const handleCreateOrganisation = async () => {
    setLocalError('');
    
    // Validate password
    if (!password) {
      setLocalError('Password is required');
      return;
    }
    
    if (!isPasswordValid()) {
      setLocalError('Password does not meet all requirements');
      return;
    }
    
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    // Prepare registration data
    // Split organisation name into first and last name
    const orgName = formData.isRegistered ? formData.legalName : formData.organisationName;
    const nameParts = orgName.trim().split(/\s+/);
    const firstName = nameParts[0] || orgName;
    const lastName = nameParts.slice(1).join(' ') || orgName;

    // if (!phoneNumber.trim()) {
    //   setLocalError('Phone number is required');
    //   return;
    // }

    if (!registrationId) {
      setLocalError('Registration ID is missing. Please start over.');
      return;
    }

    const finalizeData = {
      registrationId: registrationId,
      password: password,
      confirmPassword: confirmPassword,
      firstName: firstName,
      lastName: lastName,
      companyName: orgName,
    };

    try {
      await api.post('/v1/auth/registration/finalize', finalizeData);
      toast.success('Registration completed successfully!');
      localStorage.removeItem('registrationId');
      const country = formData.isRegistered
        ? formData.headquartersCountry || formData.address.country
        : formData.organisationCountry || formData.address.country;
      const city = formData.address.city || formData.headquartersCity;

      navigate(`/organization/account-active?id=${registrationId}`, {
        state: {
          name: orgName,
          email: formData.organisationEmail,
          category: formData.category,
          industry: formData.industry,
          location: [city, country].filter(Boolean).join(', '),
          isRegistered: formData.isRegistered,
          incorporationNumber: formData.incorporationNumber,
        },
      });
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Registration failed. Please try again.';
      setLocalError(errorMessage);
      toast.error(errorMessage);
    }
  };

  // Helper function to get conditional category info
  const getCategoryInfo = () => {
    const categoryLabel = getCategoryLabel(formData.category);
    let additionalInfo = '';
    
    if (formData.category === 'school' && formData.schoolType) {
      additionalInfo = formData.schoolType.replace('_', ' ');
    } else if (formData.category === 'religious_organisation' && formData.religiousOrgType) {
      additionalInfo = formData.religiousOrgType;
    } else if (formData.category === 'international_organisation' && formData.internationalOrgType) {
      additionalInfo = formData.internationalOrgType;
    } else if (formData.category === 'political_party' && formData.politicalPartyCountry) {
      additionalInfo = formData.politicalPartyCountry;
    }
    
    return { categoryLabel, additionalInfo };
  };

  // Step 6: Preview/Review
  const renderStep6 = () => {
    const { categoryLabel, additionalInfo } = getCategoryInfo();

    const isRegistered = formData.isRegistered === true;
    const orgName = isRegistered ? formData.legalName : formData.organisationName;

    return (
      <div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Review Your Information
          </h1>
          <p className="text-gray-600">
            Please review the details before creating your organisation
          </p>
        </div>

        <div className="space-y-6">
          {/* About Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-start mb-4">
              <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center mr-4">
                <FaFileAlt className="w-5 h-5 text-brand-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">About</h3>
                <p className="text-sm font-medium text-gray-900 mb-2">{orgName || 'N/A'}</p>
                {formData.otherName && (
                  <p className="text-sm text-gray-600 mb-3">
                    Also known as: <span className="font-medium">{formData.otherName}</span>
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {categoryLabel && (
                    <span className="px-3 py-1 bg-brand-100 text-brand-700 rounded-full text-sm font-medium">
                      {categoryLabel}{additionalInfo ? ` - ${additionalInfo}` : ''}
                    </span>
                  )}
                  <span className="px-3 py-1 bg-brand-100 text-brand-700 rounded-full text-sm font-medium">
                    {isRegistered ? 'Registered' : 'Not Registered'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Two Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Incorporation/Organisation Details */}
            {isRegistered ? (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center mr-3">
                    <FaFileAlt className="w-5 h-5 text-brand-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">INCORPORATION DETAILS</h3>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-xs text-gray-500">Number:</span>
                    <p className="text-sm font-medium text-gray-900">{formData.incorporationNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Country:</span>
                    <p className="text-sm font-medium text-gray-900">{formData.countryOfIncorporation || 'N/A'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center mr-3">
                    <FaFileAlt className="w-5 h-5 text-brand-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">ORGANISATION DETAILS</h3>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-xs text-gray-500">Country:</span>
                    <p className="text-sm font-medium text-gray-900">{formData.organisationCountry || 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Industry & Headquarters */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center mr-3">
                  <FaBriefcase className="w-5 h-5 text-brand-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">INDUSTRY & HEADQUARTERS</h3>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-gray-500">Industry:</span>
                  <p className="text-sm font-medium text-gray-900">{formData.industry || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">HQ:</span>
                  <p className="text-sm font-medium text-gray-900">
                    {formData.headquartersCity && formData.headquartersCountry 
                      ? `${formData.headquartersCity}, ${formData.headquartersCountry}`
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Founded & Address */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center mr-3">
                  <HiCalendar className="w-5 h-5 text-brand-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">FOUNDED & ADDRESS</h3>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-gray-500">Founded:</span>
                  <p className="text-sm font-medium text-gray-900">{formatDate(formData.foundedDate) || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Address:</span>
                  <div className="text-sm text-gray-900 mt-1">
                    {formData.address.buildingName && (
                      <p>{formData.address.buildingName}</p>
                    )}
                    {formData.address.streetNumber && formData.address.street && (
                      <p>{formData.address.streetNumber} {formData.address.street}</p>
                    )}
                    {formData.address.city && (
                      <p>{formData.address.city}</p>
                    )}
                    {formData.address.country && (
                      <p>{formData.address.country}</p>
                    )}
                    {!formData.address.buildingName && !formData.address.street && !formData.address.city && !formData.address.country && (
                      <p className="text-gray-500">N/A</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center mr-3">
                  <FaEnvelope className="w-5 h-5 text-brand-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">CONTACT</h3>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-gray-500">Email:</span>
                  <div className="flex items-center mt-1">
                    <p className="text-sm font-medium text-gray-900 mr-2">{formData.organisationEmail || 'N/A'}</p>
                    {formData.emailVerified && (
                      <HiCheckCircle className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                </div>
                {phoneNumber && (
                  <div>
                    <span className="text-xs text-gray-500">Phone Number:</span>
                    <p className="text-sm font-medium text-gray-900 mt-1">{phoneNumber || 'N/A'}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Description - Full Width */}
          {formData.description && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center mr-3">
                  <FaBookmark className="w-5 h-5 text-brand-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">DESCRIPTION</h3>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{formData.description}</p>
            </div>
          )}

          {/* Category Details Section */}
          {formData.category && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center mr-3">
                  <FaFileAlt className="w-5 h-5 text-brand-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">CATEGORY DETAILS</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-gray-500">Category:</span>
                  <p className="text-sm font-medium text-gray-900 mt-1">{categoryLabel || formData.category || 'N/A'}</p>
                </div>
                {formData.schoolType && (
                  <div>
                    <span className="text-xs text-gray-500">School Type:</span>
                    <p className="text-sm font-medium text-gray-900 mt-1">{formData.schoolType.replace(/_/g, ' ')}</p>
                  </div>
                )}
                {formData.religiousOrgType && (
                  <div>
                    <span className="text-xs text-gray-500">Religious Organisation Type:</span>
                    <p className="text-sm font-medium text-gray-900 mt-1">{formData.religiousOrgType}</p>
                  </div>
                )}
                {formData.internationalOrgType && (
                  <div>
                    <span className="text-xs text-gray-500">International Organisation Type:</span>
                    <p className="text-sm font-medium text-gray-900 mt-1">{formData.internationalOrgType}</p>
                  </div>
                )}
                {formData.politicalPartyCountry && (
                  <div>
                    <span className="text-xs text-gray-500">Political Party Country:</span>
                    <p className="text-sm font-medium text-gray-900 mt-1">{formData.politicalPartyCountry}</p>
                  </div>
                )}
                {formData.associatedSchool && (
                  <div>
                    <span className="text-xs text-gray-500">Associated School:</span>
                    <p className="text-sm font-medium text-gray-900 mt-1">{formData.associatedSchool}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            <HiChevronLeft className="w-5 h-5 mr-2" />
            Back
          </button>
          <button
            type="button"
            onClick={() => setShowPasswordModal(true)}
            disabled={loading}
            className="flex items-center px-6 py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Set Your Password
            <HiChevronRight className="w-5 h-5 ml-2" />
          </button>
        </div>
      </div>
    );
  };

  // Step 7: Organisation Details (for non-registered organizations)
  const renderStep7 = () => {
    const descriptionCharCount = formData.description.length;
    const maxDescriptionChars = 500;

    return (
      <div className="w-full max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Organisation Details</h1>
          <p className="text-gray-600">Tell us about your organisation</p>
        </div>

        <div className="space-y-6">
          {/* Organisation Name */}
          <div>
            <label htmlFor="organisationName" className="block text-sm font-medium text-gray-700 mb-2">
              What is the Name of Your Organisation? <span className="text-red-500">*</span>
            </label>
            <input
              id="organisationName"
              type="text"
              value={formData.organisationName}
              onChange={(e) => handleInputChange('organisationName', e.target.value)}
              placeholder="e.g., Tech Innovators Group"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Country */}
          <div>
            <label htmlFor="organisationCountry" className="block text-sm font-medium text-gray-700 mb-2">
              What Country is Your Organisation Located? <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                id="organisationCountry"
                value={formData.organisationCountry}
                onChange={(e) => handleInputChange('organisationCountry', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                required
              >
                <option value="">Select country</option>
                {COUNTRIES.map((country) => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
              <HiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Describe Your Organisation <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="We are a community focused on..."
                maxLength={maxDescriptionChars}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
                required
              />
              <p className="absolute bottom-2 right-3 text-xs text-gray-500">
                {descriptionCharCount}/{maxDescriptionChars}
              </p>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              A brief description of what your organisation does
            </p>
          </div>

          {/* Industry */}
          <div>
            <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-2">
              What Industry is Your Organisation? <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                id="industry"
                value={formData.industry}
                onChange={(e) => handleInputChange('industry', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                required
              >
                <option value="">Select industry</option>
                {INDUSTRIES.map((industry) => (
                  <option key={industry} value={industry}>{industry}</option>
                ))}
              </select>
              <HiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Founded Date */}
          <div>
            <label htmlFor="foundedDate" className="block text-sm font-medium text-gray-700 mb-2">
              When was Your Organisation Founded? <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="foundedDate"
                type="date"
                value={formData.foundedDate}
                onChange={(e) => handleInputChange('foundedDate', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                required
              />
              <HiCalendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Address Section */}
          <div className="pt-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Address</h2>
            
            <div className="space-y-4">
              {/* Building Name and Street Number */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="buildingName" className="block text-sm font-medium text-gray-700 mb-2">
                    Building Name
                  </label>
                  <input
                    id="buildingName"
                    type="text"
                    value={formData.address.buildingName}
                    onChange={(e) => handleAddressChange('buildingName', e.target.value)}
                    placeholder="e.g., Tower 1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="streetNumber" className="block text-sm font-medium text-gray-700 mb-2">
                    Street Number
                  </label>
                  <input
                    id="streetNumber"
                    type="text"
                    value={formData.address.streetNumber}
                    onChange={(e) => handleAddressChange('streetNumber', e.target.value)}
                    placeholder="e.g., 123"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              {/* Street */}
              <div>
                <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-2">
                  Street <span className="text-red-500">*</span>
                </label>
                <input
                  id="street"
                  type="text"
                  value={formData.address.street}
                  onChange={(e) => handleAddressChange('street', e.target.value)}
                  placeholder="e.g., Victoria Island"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              {/* City and Country */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="city"
                    type="text"
                    value={formData.address.city}
                    onChange={(e) => handleAddressChange('city', e.target.value)}
                    placeholder="e.g., Lagos"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="addressCountry" className="block text-sm font-medium text-gray-700 mb-2">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="addressCountry"
                      value={formData.address.country}
                      onChange={(e) => handleAddressChange('country', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                      required
                    >
                      <option value="">Select country</option>
                      {COUNTRIES.map((country) => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                    <HiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            <HiChevronLeft className="w-5 h-5 mr-2" />
            Back
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={loading || savingStep || !formData.organisationName.trim() || !formData.organisationCountry || !formData.description.trim() || !formData.industry || !formData.foundedDate || !formData.address.street.trim() || !formData.address.city.trim() || !formData.address.country}
            className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {savingStep ? 'Saving...' : 'Continue'}
            <HiChevronRight className="w-5 h-5 ml-2" />
          </button>
        </div>
      </div>
    );
  };

  // Step 8: Category Selection (for non-registered organizations)
  const renderStep8 = () => {
    const isContinueDisabled = () => {
      if (!formData.category) return true;
      
      // Check conditional field requirements
      if (formData.category === 'school' && !formData.schoolType) return true;
      if (formData.category === 'religious_organisation' && !formData.religiousOrgType) return true;
      if (formData.category === 'international_organisation' && !formData.internationalOrgType) return true;
      if (formData.category === 'political_party' && !formData.politicalPartyCountry) return true;
      if ((formData.category === 'student_union' || formData.category === 'student_association') && !formData.associatedSchool.trim()) return true;
      
      return false;
    };

    return (
      <div className="w-full max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Select Your Organisation Category
          </h1>
          <p className="text-gray-600">
            Choose the category that best describes your organisation
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {CATEGORIES.map((category) => {
            const Icon = category.icon;
            const isSelected = formData.category === category.id;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => handleInputChange('category', category.id)}
                className={`p-6 rounded-lg border-2 transition-all flex flex-col items-center justify-center ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <Icon className={`w-8 h-8 mb-3 ${
                  isSelected ? 'text-blue-600' : 'text-gray-400'
                }`} />
                <span className={`text-sm font-medium text-center ${
                  isSelected ? 'text-blue-600' : 'text-gray-700'
                }`}>
                  {category.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Conditional Fields */}
        {formData.category && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            {/* School Type */}
            {formData.category === 'school' && (
              <div className="mb-4">
                <label htmlFor="schoolType" className="block text-sm font-medium text-gray-700 mb-2">
                  School Type <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="schoolType"
                    value={formData.schoolType}
                    onChange={(e) => handleInputChange('schoolType', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                    required
                  >
                    <option value="">Select school type</option>
                    <option value="primary">Primary School</option>
                    <option value="secondary">Secondary School</option>
                    <option value="high_school">High School</option>
                    <option value="vocational">Vocational School</option>
                    <option value="university">University</option>
                    <option value="college">College</option>
                    <option value="technical">Technical Institute</option>
                    <option value="other">Other</option>
                  </select>
                  <HiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Religious Organisation Type */}
            {formData.category === 'religious_organisation' && (
              <div className="mb-4">
                <label htmlFor="religiousOrgType" className="block text-sm font-medium text-gray-700 mb-2">
                  Religious Organisation Type <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="religiousOrgType"
                    value={formData.religiousOrgType}
                    onChange={(e) => handleInputChange('religiousOrgType', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                    required
                  >
                    <option value="">Select type</option>
                    <option value="church">Church</option>
                    <option value="mosque">Mosque</option>
                    <option value="temple">Temple</option>
                    <option value="synagogue">Synagogue</option>
                    <option value="gurdwara">Gurdwara</option>
                    <option value="shrine">Shrine</option>
                    <option value="monastery">Monastery</option>
                    <option value="other">Other</option>
                  </select>
                  <HiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* International Organisation Type */}
            {formData.category === 'international_organisation' && (
              <div className="mb-4">
                <label htmlFor="internationalOrgType" className="block text-sm font-medium text-gray-700 mb-2">
                  International Organisation Type <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="internationalOrgType"
                    value={formData.internationalOrgType}
                    onChange={(e) => handleInputChange('internationalOrgType', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                    required
                  >
                    <option value="">Select type</option>
                    <option value="ngo">NGO (Non-Governmental Organisation)</option>
                    <option value="igo">IGO (Inter-Governmental Organisation)</option>
                    <option value="multilateral">Multilateral Organisation</option>
                    <option value="charity">Charity</option>
                    <option value="foundation">Foundation</option>
                    <option value="association">International Association</option>
                    <option value="other">Other</option>
                  </select>
                  <HiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Political Party Country */}
            {formData.category === 'political_party' && (
              <div className="mb-4">
                <label htmlFor="politicalPartyCountry" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Country <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="politicalPartyCountry"
                    value={formData.politicalPartyCountry}
                    onChange={(e) => handleInputChange('politicalPartyCountry', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                    required
                  >
                    <option value="">Select country</option>
                    {COUNTRIES.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                  <HiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Associated School (for Student Union and Student Association) */}
            {(formData.category === 'student_union' || formData.category === 'student_association') && (
              <div className="mb-4">
                <label htmlFor="associatedSchool" className="block text-sm font-medium text-gray-700 mb-2">
                  Associated School <span className="text-red-500">*</span>
                </label>
                <input
                  id="associatedSchool"
                  type="text"
                  value={formData.associatedSchool}
                  onChange={(e) => handleInputChange('associatedSchool', e.target.value)}
                  placeholder="Enter the name of the associated school"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            <HiChevronLeft className="w-5 h-5 mr-2" />
            Back
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={loading || savingStep || isContinueDisabled()}
            className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {savingStep ? 'Saving...' : 'Continue'}
            <HiChevronRight className="w-5 h-5 ml-2" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Logo at top right */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link to="/">
          <img src={logo} alt="Taldium" className="h-10" />
        </Link>
      </div>

      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 relative">
        
        
        <div className="w-full">
          {/* Step Indicator */}
          <div className="max-w-4xl mx-auto mb-8">
            <div className="flex items-center justify-center space-x-2 md:space-x-4">
              {(() => {
                // Show different steps based on registration status
                const steps = formData.isRegistered === false
                  ? [
                      { number: 1, label: 'Details', step: 7 }, // Organisation Details (step 7)
                      { number: 2, label: 'Category', step: 8 }, // Category (step 8)
                      { number: 3, label: 'Email Verification', step: 5 }, // Email Verification (step 5)
                      { number: 4, label: 'Preview', step: 6 }, // Preview (step 6)
                    ]
                  : formData.isRegistered === true
                  ? [
                      { number: 1, label: 'Incorporation', step: 2 }, // Incorporation details (step 2)
                      { number: 2, label: 'Category', step: 3 }, // Category (step 3)
                      { number: 3, label: 'Description', step: 4 }, // Description (step 4)
                      { number: 4, label: 'Email Verification', step: 5 }, // Email Verification (step 5)
                      { number: 5, label: 'Preview', step: 6 }, // Preview (step 6)
                    ]
                  : []; // No steps shown until registration status is selected

                const activeStepIndex = steps.findIndex((s) => s.step === currentStep);

                return steps.map((stepInfo, index) => {
                  // Skip empty steps
                  if (stepInfo.step === 0) {
                    return <div key={`empty-${index}`} className="w-8" />;
                  }

                  const isActive = currentStep === stepInfo.step;
                  // Completion is based on visible step order, not numeric step ids.
                  // This avoids marking step 5/6 as completed when currentStep is 7/8.
                  const isCompleted = activeStepIndex > -1 && index < activeStepIndex;
                return (
                  <div key={stepInfo.step} className="flex items-center">
                    <div className={`flex items-center ${
                      isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
                        isActive 
                          ? 'bg-blue-600 text-white' 
                          : isCompleted 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-200 text-gray-500'
                      }`}>
                        {isCompleted ? (
                          <HiCheckCircle className="w-5 h-5" />
                        ) : (
                          stepInfo.number
                        )}
                      </div>
                      <span className={`ml-2 text-sm font-medium hidden md:inline ${
                        isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {stepInfo.label}
                      </span>
                    </div>
                    {index < steps.length - 1 && steps[index + 1]?.step !== 0 && (
                      <div className={`w-8 h-0.5 mx-1 ${
                        isCompleted ? 'bg-green-500' : isActive ? 'bg-gray-300' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                );
              });
              })()}
            </div>
          </div>

          {/* Step Content */}
          <div className="w-full">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
            {currentStep === 5 && renderStep5()}
            {currentStep === 6 && renderStep6()}
            {currentStep === 7 && renderStep7()}
            {currentStep === 8 && renderStep8()}
            {/* Add more step renders as we add more steps */}
          </div>

          {/* Back to Login Link */}
          <div className="text-center mt-8">
            <Link to="/login" className="text-sm text-brand-600 hover:text-brand-700">
              Already have an account? Sign in
            </Link>
          </div>
        </div>

        {/* Password Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <HiX className="w-6 h-6" />
              </button>

              {/* Padlock Icon */}
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <HiLockClosed className="w-8 h-8 text-blue-600" />
                </div>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
                Set Your Password
              </h2>
              <p className="text-sm text-gray-600 text-center mb-6">
                Create a secure password for your organisation account.
              </p>

              {/* Password Input */}
              <div className="mb-4">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 border-2 border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <HiEyeOff className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Password Requirements */}
                <div className="mt-3 space-y-2">
                  {[
                    { label: 'At least 8 characters', check: getPasswordRequirements().minLength },
                    { label: 'Contains uppercase letter', check: getPasswordRequirements().hasUppercase },
                    { label: 'Contains lowercase letter', check: getPasswordRequirements().hasLowercase },
                    { label: 'Contains a number', check: getPasswordRequirements().hasNumber },
                    { label: 'Contains special character', check: getPasswordRequirements().hasSpecialChar },
                  ].map((req, index) => (
                    <div key={index} className="flex items-center">
                      <div className={`w-4 h-4 rounded-full border-2 mr-2 flex items-center justify-center ${
                        req.check 
                          ? 'bg-green-500 border-green-500' 
                          : 'border-gray-300'
                      }`}>
                        {req.check && <HiCheckCircle className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`text-sm ${
                        req.check ? 'text-gray-700' : 'text-gray-500'
                      }`}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Confirm Password Input */}
              <div className="mb-4">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <HiEyeOff className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
                )}
              </div>

              {/* Create Organisation Button */}
              <button
                type="button"
                onClick={handleCreateOrganisation}
                disabled={loading || !isPasswordValid() || password !== confirmPassword}
                className="w-full px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Creating...' : 'Create Organisation'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
