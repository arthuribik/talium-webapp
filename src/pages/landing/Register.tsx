import { useState, useEffect, useCallback } from 'react';
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
import {
  registerSendCodeSchema,
  registerVerifyCodeSchema,
  registerBasicDetailsSchema,
  registerPasswordSchema,
} from '@/schemas/register.schema';
import { fieldErrorsFromZod } from '@/utils/zodFieldErrors';

function fieldClass(field: string, errors: Record<string, string>): string {
  return errors[field]
    ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500'
    : 'border-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500';
}

function passwordFieldClass(field: string, errors: Record<string, string>): string {
  return errors[field]
    ? 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500'
    : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
}

type Step = 1 | 2 | 3;

const STEP_VALUES: Step[] = [1, 2, 3];

function parseStepParam(raw: string | null): Step {
  const n = raw ? parseInt(raw, 10) : 1;
  return STEP_VALUES.includes(n as Step) ? (n as Step) : 1;
}

export default function Register() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState<Step>(() => parseStepParam(searchParams.get('step')));
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
    profession: '',
    country: '',
    phoneNumber: '',
  });
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  /** Server / network message (shown above the form when not tied to one field). */
  const [formError, setFormError] = useState('');
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const redirectUrl = searchParams.get('redirect');

  const goToStep = useCallback(
    (step: Step, opts?: { replace?: boolean }) => {
      setCurrentStep(step);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('step', String(step));
          return next;
        },
        { replace: opts?.replace ?? true },
      );
    },
    [setSearchParams],
  );

  const stepFromUrl = parseStepParam(searchParams.get('step'));

  // Keep wizard step in sync with ?step= on load, back/forward, or manual URL edits
  useEffect(() => {
    if (stepFromUrl >= 2 && !emailVerified) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('step', '1');
          return next;
        },
        { replace: true },
      );
      setCurrentStep(1);
      return;
    }
    setCurrentStep((prev) => (prev === stepFromUrl ? prev : stepFromUrl));
  }, [stepFromUrl, emailVerified, setSearchParams]);

  // Ensure ?step= is present (e.g. /join with only ?redirect=)
  useEffect(() => {
    if (searchParams.get('step') != null && searchParams.get('step') !== '') return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('step', '1');
        return next;
      },
      { replace: true },
    );
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    setFieldErrors({});
    setFormError('');
  }, [currentStep]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name } = e.target;
    setFormData({ ...formData, [name]: e.target.value });
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  // Step 1: Email Verification
  const handleSendVerificationCode = async () => {
    setFormError('');
    const parsed = registerSendCodeSchema.safeParse({ email });
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error));
      return;
    }

    setVerifyingEmail(true);
    setFieldErrors({});

    try {
      const response = await api.post('/v1/auth/send-verification-code', { email: parsed.data.email });
      setCodeSent(true);
      setVerificationCode('');
      toast.success('Verification code sent to your email');

      if (response.data.code) {
        console.log('Verification code:', response.data.code);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to send verification code';
      setFieldErrors({ email: errorMsg });
      toast.error(errorMsg);
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleVerifyCode = async () => {
    setFormError('');
    const parsed = registerVerifyCodeSchema.safeParse({ verificationCode });
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error));
      return;
    }

    setVerifyingCode(true);
    setFieldErrors({});

    try {
      await api.post('/v1/auth/verify-email', {
        email,
        code: parsed.data.verificationCode,
      });

      setEmailVerified(true);
      toast.success('Email verified successfully!');
      setTimeout(() => {
        goToStep(2, { replace: true });
      }, 500);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Invalid verification code. Please try again.';
      setFieldErrors({ verificationCode: errorMsg });
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
    if (fieldErrors.verificationCode) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.verificationCode;
        return next;
      });
    }

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
    setFormError('');
    const parsed = registerBasicDetailsSchema.safeParse(formData);
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error));
      return;
    }
    setFieldErrors({});
    goToStep(3);
  };

  // Step 3: Password & Registration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    dispatch(clearError());

    const parsed = registerPasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error));
      return;
    }
    setFieldErrors({});

    try {
      await dispatch(
        register({
          ...formData,
          email,
          password: parsed.data.password,
          confirmPassword: parsed.data.confirmPassword,
        }),
      ).unwrap();

      localStorage.removeItem('registrationId');

      toast.success('Registration successful!');

      if (redirectUrl) {
        navigate(redirectUrl);
      } else {
        navigate('/login');
      }
    } catch (err: any) {
      const msg = err?.message || 'Registration failed';
      toast.error(msg);
      setFormError(msg);
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

        {/* Progress steps — sync with ?step=; click to jump when allowed */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center" role="tablist" aria-label="Registration steps">
            {([1, 2, 3] as const).map((step, i) => {
              const canJump = step === 1 || emailVerified;
              const active = currentStep === step;
              const reached = currentStep >= step;
              const showCheck =
                (step === 1 && emailVerified) || (step === 2 && currentStep > 2);
              return (
                <div key={step} className="flex items-center">
                  {i > 0 && (
                    <div
                      className={`w-12 h-1 ${currentStep >= step ? 'bg-brand-500' : 'bg-gray-300'}`}
                      aria-hidden
                    />
                  )}
                  <button
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-current={active ? 'step' : undefined}
                    disabled={!canJump}
                    onClick={() => canJump && goToStep(step)}
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 text-sm font-semibold transition-colors ${
                      active
                        ? 'bg-brand-500 border-brand-500 text-white ring-2 ring-brand-200 ring-offset-2'
                        : reached
                          ? 'bg-brand-500 border-brand-500 text-white'
                          : 'border-gray-300 text-gray-400'
                    } ${canJump ? 'cursor-pointer hover:opacity-90' : 'cursor-not-allowed opacity-60'}`}
                  >
                    {showCheck ? <HiCheckCircle className="w-6 h-6" aria-hidden /> : step}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 1: Email Verification */}
        {currentStep === 1 && (
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Verify Your Email</h3>
            
            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4" role="alert">
                {formError}
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
                      setFormError('');
                      if (fieldErrors.email) {
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next.email;
                          return next;
                        });
                      }
                    }}
                    disabled={emailVerified}
                    aria-invalid={Boolean(fieldErrors.email)}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none ${fieldClass('email', fieldErrors)}`}
                    placeholder="Enter your email address"
                  />
                  {fieldErrors.email ? (
                    <p className="mt-1 text-sm text-red-600" role="alert">
                      {fieldErrors.email}
                    </p>
                  ) : null}
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
                        aria-invalid={Boolean(fieldErrors.verificationCode)}
                        className={`w-12 h-12 text-center text-lg font-semibold border-2 rounded-lg focus:outline-none ${
                          fieldErrors.verificationCode
                            ? 'border-red-500 focus:ring-2 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-2 focus:ring-brand-500'
                        }`}
                      />
                    ))}
                  </div>
                  {fieldErrors.verificationCode ? (
                    <p className="mt-2 text-sm text-red-600 text-center" role="alert">
                      {fieldErrors.verificationCode}
                    </p>
                  ) : null}
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
            
            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4" role="alert">
                {formError}
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
                aria-invalid={Boolean(fieldErrors.firstName)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none ${fieldClass('firstName', fieldErrors)}`}
              />
              {fieldErrors.firstName ? (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {fieldErrors.firstName}
                </p>
              ) : null}
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
                aria-invalid={Boolean(fieldErrors.lastName)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none ${fieldClass('lastName', fieldErrors)}`}
              />
              {fieldErrors.lastName ? (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {fieldErrors.lastName}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor="profession" className="block text-sm font-medium text-gray-700 mb-2">
                Professional / job title
              </label>
              <input
                id="profession"
                name="profession"
                type="text"
                required
                value={formData.profession}
                onChange={handleChange}
                aria-invalid={Boolean(fieldErrors.profession)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none ${fieldClass('profession', fieldErrors)}`}
                placeholder="e.g. Registered Nurse, Software Engineer"
              />
              {fieldErrors.profession ? (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {fieldErrors.profession}
                </p>
              ) : null}
            </div>
            <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                Country
              </label>
              <SearchableList
                id="country"
                value={formData.country}
                onChange={(country) => {
                  setFormData({ ...formData, country });
                  if (fieldErrors.country) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.country;
                      return next;
                    });
                  }
                }}
                options={[{ value: '', label: 'Select country' }, ...COUNTRIES.map((c) => ({ value: c, label: c }))]}
                placeholder="Select country"
                error={fieldErrors.country}
                className="w-full"
              />
            </div>
            <div>
              <PhoneNumberInput
                value={formData.phoneNumber}
                onChange={(value) => {
                  setFormData({ ...formData, phoneNumber: value });
                  if (fieldErrors.phoneNumber) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.phoneNumber;
                      return next;
                    });
                  }
                }}
                label="Phone Number"
                placeholder="Enter phone number"
                error={fieldErrors.phoneNumber}
              />
            </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => goToStep(1)}
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
              <h3 className="text-3xl font-bold text-black-600 mb-2">Set Your Password</h3>
              <p className="text-sm text-gray-600">Create a secure password for your organisation account.</p>
            </div>
            
            {(error || formError) && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4" role="alert">
                {error || formError}
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
                    onChange={(e) => {
                      setPassword(e.target.value);
                      dispatch(clearError());
                      setFormError('');
                      if (fieldErrors.password) {
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next.password;
                          return next;
                        });
                      }
                    }}
                    aria-invalid={Boolean(fieldErrors.password)}
                    className={`w-full px-4 py-3 pr-10 border rounded-lg focus:outline-none ${passwordFieldClass('password', fieldErrors)}`}
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
                {fieldErrors.password ? (
                  <p className="mt-1 text-sm text-red-600" role="alert">
                    {fieldErrors.password}
                  </p>
                ) : null}
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
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      dispatch(clearError());
                      setFormError('');
                      if (fieldErrors.confirmPassword) {
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next.confirmPassword;
                          return next;
                        });
                      }
                    }}
                    aria-invalid={Boolean(fieldErrors.confirmPassword)}
                    className={`w-full px-4 py-3 pr-10 border rounded-lg focus:outline-none ${passwordFieldClass('confirmPassword', fieldErrors)}`}
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
                {fieldErrors.confirmPassword ? (
                  <p className="mt-1 text-sm text-red-600" role="alert">
                    {fieldErrors.confirmPassword}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => goToStep(2)}
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

