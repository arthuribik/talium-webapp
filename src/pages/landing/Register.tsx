import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { register, clearError } from '@/store/authSlice';
import { api } from '@/services/api';
import { HiCheckCircle, HiArrowRight, HiArrowLeft, HiEye, HiEyeOff } from 'react-icons/hi';
import { COUNTRIES } from '@/utils/countries';
import PhoneNumberInput from '@/components/common/PhoneNumberInput';
import { SearchableList } from '@/components/common/SearchableList';
import logo from '@/assets/logo.svg';

type Step = 1 | 2 | 3;

export default function Register() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    country: '',
    phoneNumber: '',
  });
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [localError, setLocalError] = useState('');
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Step 1: Email Verification
  const handleSendVerificationCode = async () => {
    if (!email.trim()) {
      setLocalError('Please enter an email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setLocalError('Please enter a valid email address');
      return;
    }

    setVerifyingEmail(true);
    setLocalError('');

    try {
      const response = await api.post('/v1/auth/send-verification-code', { email });
      setCodeSent(true);
      setVerificationCode('');
      toast.success('Verification code sent to your email');
      
      if (response.data.code) {
        console.log('Verification code:', response.data.code);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to send verification code';
      setLocalError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      setLocalError('Please enter the complete 6-digit code');
      return;
    }

    setVerifyingCode(true);
    setLocalError('');

    try {
      await api.post('/v1/auth/verify-email', {
        email,
        code: verificationCode,
      });
      
      setEmailVerified(true);
      toast.success('Email verified successfully!');
      // Move to next step after a brief delay
      setTimeout(() => {
        setCurrentStep(2);
      }, 500);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Invalid verification code. Please try again.';
      setLocalError(errorMsg);
      setVerificationCode('');
      toast.error(errorMsg);
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleResendCode = async () => {
    setCodeSent(false);
    setVerificationCode('');
    await handleSendVerificationCode();
  };

  const handleCodeInputChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const newCode = verificationCode.split('');
    newCode[index] = value;
    const updatedCode = newCode.join('').slice(0, 6);
    
    setVerificationCode(updatedCode);
    setLocalError('');

    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      if (nextInput) {
        (nextInput as HTMLInputElement).focus();
      }
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      if (prevInput) {
        (prevInput as HTMLInputElement).focus();
      }
    }
  };

  // Step 2: Basic Details - Move to next step
  const handleNextToPassword = () => {
    if (!formData.firstName.trim()) {
      setLocalError('First name is required');
      toast.error('First name is required');
      return;
    }
    if (!formData.lastName.trim()) {
      setLocalError('Last name is required');
      toast.error('Last name is required');
      return;
    }
    setLocalError('');
    setCurrentStep(3);
  };

  // Step 3: Password & Registration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    dispatch(clearError());
    
    // Validate passwords match
    if (password !== confirmPassword) {
      const errorMsg = 'Passwords do not match';
      setLocalError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (password.length < 8 || !passwordRegex.test(password)) {
      const errorMsg = 'Password must be at least 8 characters and contain one uppercase, one lowercase, one number, and one special character';
      setLocalError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    try {
      await dispatch(register({
        ...formData,
        email,
        password,
        confirmPassword,
      })).unwrap();
      
      // Remove registrationId from localStorage on successful registration
      localStorage.removeItem('registrationId');
      
      toast.success('Registration successful!');
      
      // Redirect to the job page if user came from there, otherwise go to login
      if (redirectUrl) {
        navigate(redirectUrl);
      } else {
        navigate('/login');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-lg w-full space-y-8 p-8">
        <div className="text-center">
          <Link to="/" className="inline-block mb-6">
            <img src={logo} alt="Taldium" className="h-10 mx-auto" />
          </Link>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Register as Professional
          </h2>
          <p className="text-sm text-gray-600 mt-2">Step {currentStep} of 3</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${currentStep >= 1 ? 'bg-brand-500 border-brand-500 text-white' : 'border-gray-300 text-gray-400'}`}>
              {emailVerified ? <HiCheckCircle className="w-6 h-6" /> : '1'}
            </div>
            <div className={`w-12 h-1 ${currentStep >= 2 ? 'bg-brand-500' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${currentStep >= 2 ? 'bg-brand-500 border-brand-500 text-white' : 'border-gray-300 text-gray-400'}`}>
              {currentStep > 2 ? <HiCheckCircle className="w-6 h-6" /> : '2'}
            </div>
            <div className={`w-12 h-1 ${currentStep >= 3 ? 'bg-brand-500' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${currentStep >= 3 ? 'bg-brand-500 border-brand-500 text-white' : 'border-gray-300 text-gray-400'}`}>
              3
            </div>
          </div>
        </div>

        {/* Step 1: Email Verification */}
        {currentStep === 1 && (
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Verify Your Email</h3>
            
            {localError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {localError}
              </div>
            )}

            {!codeSent ? (
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setLocalError('');
                    }}
                    disabled={emailVerified}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    placeholder="Enter your email address"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendVerificationCode}
                  disabled={verifyingEmail || !email || emailVerified}
                  className="w-full px-4 py-2 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {verifyingEmail ? 'Sending...' : 'Send Verification Code'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    We've sent a 6-digit verification code to <strong>{email}</strong>
                  </p>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter Verification Code
                  </label>
                  <div className="flex gap-2 justify-center">
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <input
                        key={index}
                        id={`code-${index}`}
                        type="text"
                        maxLength={1}
                        value={verificationCode[index] || ''}
                        onChange={(e) => handleCodeInputChange(index, e.target.value)}
                        onKeyDown={(e) => handleCodeKeyDown(index, e)}
                        className="w-12 h-12 text-center text-lg font-semibold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                      />
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleVerifyCode}
                  disabled={verifyingCode || verificationCode.length !== 6}
                  className="w-full px-4 py-2 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {verifyingCode ? 'Verifying...' : 'Verify Code'}
                </button>
                <button
                  type="button"
                  onClick={handleResendCode}
                  className="w-full text-sm text-brand-600 hover:text-brand-700 font-medium"
                >
                  Resend Code
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Basic Details */}
        {currentStep === 2 && (
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h3>
            
            {localError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {localError}
            </div>
          )}

          <div className="space-y-4">
            <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                First Name
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                required
                value={formData.firstName}
                onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                Last Name
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                required
                value={formData.lastName}
                onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                Country
              </label>
              <SearchableList
                id="country"
                value={formData.country}
                onChange={(country) => setFormData({ ...formData, country })}
                options={[{ value: '', label: 'Select country' }, ...COUNTRIES.map((c) => ({ value: c, label: c }))]}
                placeholder="Select country"
                className="w-full focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div>
              <PhoneNumberInput
                value={formData.phoneNumber}
                onChange={(value) => setFormData({ ...formData, phoneNumber: value })}
                label="Phone Number"
                placeholder="Enter phone number"
              />
            </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center"
              >
                <HiArrowLeft className="w-5 h-5 mr-2" />
                Back
              </button>
              <button
                type="button"
                onClick={handleNextToPassword}
                className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 transition-colors flex items-center justify-center"
              >
                Continue
                <HiArrowRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Password */}
        {currentStep === 3 && (
          <form className="bg-white rounded-lg p-6 shadow-sm" onSubmit={handleSubmit}>
            <div className="text-center mb-6">
              <h3 className="text-3xl font-bold text-blue-600 mb-2">Set Your Password</h3>
              <p className="text-sm text-gray-600">Create a secure password for your organisation account.</p>
            </div>
            
            {(error || localError) && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {error || localError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <HiEyeOff className="h-5 w-5" />
                    ) : (
                      <HiEye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Password Requirements */}
              <div className="space-y-2">
                <div className="flex items-center">
                  <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                    password.length >= 8 ? 'bg-green-500 border-green-500' : 'border-gray-300'
                  }`}>
                    {password.length >= 8 && <HiCheckCircle className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-sm text-gray-700">At least 8 characters</span>
                </div>
                <div className="flex items-center">
                  <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                    /[A-Z]/.test(password) ? 'bg-green-500 border-green-500' : 'border-gray-300'
                  }`}>
                    {/[A-Z]/.test(password) && <HiCheckCircle className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-sm text-gray-700">Contains uppercase letter</span>
                </div>
                <div className="flex items-center">
                  <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                    /[a-z]/.test(password) ? 'bg-green-500 border-green-500' : 'border-gray-300'
                  }`}>
                    {/[a-z]/.test(password) && <HiCheckCircle className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-sm text-gray-700">Contains lowercase letter</span>
                </div>
                <div className="flex items-center">
                  <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                    /\d/.test(password) ? 'bg-green-500 border-green-500' : 'border-gray-300'
                  }`}>
                    {/\d/.test(password) && <HiCheckCircle className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-sm text-gray-700">Contains a number</span>
                </div>
                <div className="flex items-center">
                  <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                    /[@$!%*?&]/.test(password) ? 'bg-green-500 border-green-500' : 'border-gray-300'
                  }`}>
                    {/[@$!%*?&]/.test(password) && <HiCheckCircle className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-sm text-gray-700">Contains special character</span>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? (
                      <HiEyeOff className="h-5 w-5" />
                    ) : (
                      <HiEye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center"
              >
                <HiArrowLeft className="w-5 h-5 mr-2" />
                Back
              </button>
            <button
              type="submit"
              disabled={loading}
                className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
                {loading ? 'Registering...' : (
                  <>
                    Complete Registration
                    <HiArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
            </button>
          </div>
          </form>
        )}

          <div className="text-center">
          <Link to="/login" className="text-sm text-brand-600 hover:text-brand-500">
              Already have an account? Sign in
            </Link>
          </div>
      </div>
    </div>
  );
}

