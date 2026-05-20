import { useState, useRef, useEffect } from 'react';
import { HiChevronDown, HiSearch, HiX, HiCheckCircle } from 'react-icons/hi';

interface CountryCode {
  code: string;
  dialCode: string;
  name: string;
  flag: string;
}

// Comprehensive list of country codes with flags (emoji)
const COUNTRY_CODES: CountryCode[] = [
  { code: 'US', dialCode: '+1', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', dialCode: '+44', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'CA', dialCode: '+1', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', dialCode: '+61', name: 'Australia', flag: '🇦🇺' },
  { code: 'DE', dialCode: '+49', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', dialCode: '+33', name: 'France', flag: '🇫🇷' },
  { code: 'IT', dialCode: '+39', name: 'Italy', flag: '🇮🇹' },
  { code: 'ES', dialCode: '+34', name: 'Spain', flag: '🇪🇸' },
  { code: 'NL', dialCode: '+31', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'BE', dialCode: '+32', name: 'Belgium', flag: '🇧🇪' },
  { code: 'CH', dialCode: '+41', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'SE', dialCode: '+46', name: 'Sweden', flag: '🇸🇪' },
  { code: 'NO', dialCode: '+47', name: 'Norway', flag: '🇳🇴' },
  { code: 'DK', dialCode: '+45', name: 'Denmark', flag: '🇩🇰' },
  { code: 'FI', dialCode: '+358', name: 'Finland', flag: '🇫🇮' },
  { code: 'PL', dialCode: '+48', name: 'Poland', flag: '🇵🇱' },
  { code: 'PT', dialCode: '+351', name: 'Portugal', flag: '🇵🇹' },
  { code: 'IE', dialCode: '+353', name: 'Ireland', flag: '🇮🇪' },
  { code: 'AT', dialCode: '+43', name: 'Austria', flag: '🇦🇹' },
  { code: 'GR', dialCode: '+30', name: 'Greece', flag: '🇬🇷' },
  { code: 'JP', dialCode: '+81', name: 'Japan', flag: '🇯🇵' },
  { code: 'KR', dialCode: '+82', name: 'South Korea', flag: '🇰🇷' },
  { code: 'SG', dialCode: '+65', name: 'Singapore', flag: '🇸🇬' },
  { code: 'HK', dialCode: '+852', name: 'Hong Kong', flag: '🇭🇰' },
  { code: 'IN', dialCode: '+91', name: 'India', flag: '🇮🇳' },
  { code: 'CN', dialCode: '+86', name: 'China', flag: '🇨🇳' },
  { code: 'BR', dialCode: '+55', name: 'Brazil', flag: '🇧🇷' },
  { code: 'MX', dialCode: '+52', name: 'Mexico', flag: '🇲🇽' },
  { code: 'AR', dialCode: '+54', name: 'Argentina', flag: '🇦🇷' },
  { code: 'ZA', dialCode: '+27', name: 'South Africa', flag: '🇿🇦' },
  { code: 'NG', dialCode: '+234', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'KE', dialCode: '+254', name: 'Kenya', flag: '🇰🇪' },
  { code: 'GH', dialCode: '+233', name: 'Ghana', flag: '🇬🇭' },
  { code: 'EG', dialCode: '+20', name: 'Egypt', flag: '🇪🇬' },
  { code: 'AE', dialCode: '+971', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'SA', dialCode: '+966', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'IL', dialCode: '+972', name: 'Israel', flag: '🇮🇱' },
  { code: 'TR', dialCode: '+90', name: 'Turkey', flag: '🇹🇷' },
  { code: 'RU', dialCode: '+7', name: 'Russia', flag: '🇷🇺' },
  { code: 'NZ', dialCode: '+64', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'AF', dialCode: '+93', name: 'Afghanistan', flag: '🇦🇫' },
  { code: 'AL', dialCode: '+355', name: 'Albania', flag: '🇦🇱' },
  { code: 'DZ', dialCode: '+213', name: 'Algeria', flag: '🇩🇿' },
  { code: 'AD', dialCode: '+376', name: 'Andorra', flag: '🇦🇩' },
  { code: 'AO', dialCode: '+244', name: 'Angola', flag: '🇦🇴' },
  { code: 'AG', dialCode: '+1268', name: 'Antigua and Barbuda', flag: '🇦🇬' },
  { code: 'AM', dialCode: '+374', name: 'Armenia', flag: '🇦🇲' },
  { code: 'AZ', dialCode: '+994', name: 'Azerbaijan', flag: '🇦🇿' },
  { code: 'BS', dialCode: '+1242', name: 'Bahamas', flag: '🇧🇸' },
  { code: 'BH', dialCode: '+973', name: 'Bahrain', flag: '🇧🇭' },
  { code: 'BD', dialCode: '+880', name: 'Bangladesh', flag: '🇧🇩' },
  { code: 'BB', dialCode: '+1246', name: 'Barbados', flag: '🇧🇧' },
  { code: 'BY', dialCode: '+375', name: 'Belarus', flag: '🇧🇾' },
  { code: 'BZ', dialCode: '+501', name: 'Belize', flag: '🇧🇿' },
  { code: 'BJ', dialCode: '+229', name: 'Benin', flag: '🇧🇯' },
  { code: 'BT', dialCode: '+975', name: 'Bhutan', flag: '🇧🇹' },
  { code: 'BO', dialCode: '+591', name: 'Bolivia', flag: '🇧🇴' },
  { code: 'BA', dialCode: '+387', name: 'Bosnia and Herzegovina', flag: '🇧🇦' },
  { code: 'BW', dialCode: '+267', name: 'Botswana', flag: '🇧🇼' },
  { code: 'BN', dialCode: '+673', name: 'Brunei', flag: '🇧🇳' },
  { code: 'BG', dialCode: '+359', name: 'Bulgaria', flag: '🇧🇬' },
  { code: 'BF', dialCode: '+226', name: 'Burkina Faso', flag: '🇧🇫' },
  { code: 'BI', dialCode: '+257', name: 'Burundi', flag: '🇧🇮' },
  { code: 'CV', dialCode: '+238', name: 'Cabo Verde', flag: '🇨🇻' },
  { code: 'KH', dialCode: '+855', name: 'Cambodia', flag: '🇰🇭' },
  { code: 'CM', dialCode: '+237', name: 'Cameroon', flag: '🇨🇲' },
  { code: 'CF', dialCode: '+236', name: 'Central African Republic', flag: '🇨🇫' },
  { code: 'TD', dialCode: '+235', name: 'Chad', flag: '🇹🇩' },
  { code: 'CL', dialCode: '+56', name: 'Chile', flag: '🇨🇱' },
  { code: 'CO', dialCode: '+57', name: 'Colombia', flag: '🇨🇴' },
  { code: 'KM', dialCode: '+269', name: 'Comoros', flag: '🇰🇲' },
  { code: 'CG', dialCode: '+242', name: 'Congo', flag: '🇨🇬' },
  { code: 'CR', dialCode: '+506', name: 'Costa Rica', flag: '🇨🇷' },
  { code: 'HR', dialCode: '+385', name: 'Croatia', flag: '🇭🇷' },
  { code: 'CU', dialCode: '+53', name: 'Cuba', flag: '🇨🇺' },
  { code: 'CY', dialCode: '+357', name: 'Cyprus', flag: '🇨🇾' },
  { code: 'CZ', dialCode: '+420', name: 'Czech Republic', flag: '🇨🇿' },
  { code: 'DJ', dialCode: '+253', name: 'Djibouti', flag: '🇩🇯' },
  { code: 'DM', dialCode: '+1767', name: 'Dominica', flag: '🇩🇲' },
  { code: 'DO', dialCode: '+1809', name: 'Dominican Republic', flag: '🇩🇴' },
  { code: 'EC', dialCode: '+593', name: 'Ecuador', flag: '🇪🇨' },
  { code: 'SV', dialCode: '+503', name: 'El Salvador', flag: '🇸🇻' },
  { code: 'GQ', dialCode: '+240', name: 'Equatorial Guinea', flag: '🇬🇶' },
  { code: 'ER', dialCode: '+291', name: 'Eritrea', flag: '🇪🇷' },
  { code: 'EE', dialCode: '+372', name: 'Estonia', flag: '🇪🇪' },
  { code: 'SZ', dialCode: '+268', name: 'Eswatini', flag: '🇸🇿' },
  { code: 'ET', dialCode: '+251', name: 'Ethiopia', flag: '🇪🇹' },
  { code: 'FJ', dialCode: '+679', name: 'Fiji', flag: '🇫🇯' },
  { code: 'GA', dialCode: '+241', name: 'Gabon', flag: '🇬🇦' },
  { code: 'GM', dialCode: '+220', name: 'Gambia', flag: '🇬🇲' },
  { code: 'GE', dialCode: '+995', name: 'Georgia', flag: '🇬🇪' },
  { code: 'GD', dialCode: '+1473', name: 'Grenada', flag: '🇬🇩' },
  { code: 'GT', dialCode: '+502', name: 'Guatemala', flag: '🇬🇹' },
  { code: 'GN', dialCode: '+224', name: 'Guinea', flag: '🇬🇳' },
  { code: 'GW', dialCode: '+245', name: 'Guinea-Bissau', flag: '🇬🇼' },
  { code: 'GY', dialCode: '+592', name: 'Guyana', flag: '🇬🇾' },
  { code: 'HT', dialCode: '+509', name: 'Haiti', flag: '🇭🇹' },
  { code: 'HN', dialCode: '+504', name: 'Honduras', flag: '🇭🇳' },
  { code: 'HU', dialCode: '+36', name: 'Hungary', flag: '🇭🇺' },
  { code: 'IS', dialCode: '+354', name: 'Iceland', flag: '🇮🇸' },
  { code: 'ID', dialCode: '+62', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'IR', dialCode: '+98', name: 'Iran', flag: '🇮🇷' },
  { code: 'IQ', dialCode: '+964', name: 'Iraq', flag: '🇮🇶' },
  { code: 'JM', dialCode: '+1876', name: 'Jamaica', flag: '🇯🇲' },
  { code: 'JO', dialCode: '+962', name: 'Jordan', flag: '🇯🇴' },
  { code: 'KZ', dialCode: '+7', name: 'Kazakhstan', flag: '🇰🇿' },
  { code: 'KI', dialCode: '+686', name: 'Kiribati', flag: '🇰🇮' },
  { code: 'XK', dialCode: '+383', name: 'Kosovo', flag: '🇽🇰' },
  { code: 'KW', dialCode: '+965', name: 'Kuwait', flag: '🇰🇼' },
  { code: 'KG', dialCode: '+996', name: 'Kyrgyzstan', flag: '🇰🇬' },
  { code: 'LA', dialCode: '+856', name: 'Laos', flag: '🇱🇦' },
  { code: 'LV', dialCode: '+371', name: 'Latvia', flag: '🇱🇻' },
  { code: 'LB', dialCode: '+961', name: 'Lebanon', flag: '🇱🇧' },
  { code: 'LS', dialCode: '+266', name: 'Lesotho', flag: '🇱🇸' },
  { code: 'LR', dialCode: '+231', name: 'Liberia', flag: '🇱🇷' },
  { code: 'LY', dialCode: '+218', name: 'Libya', flag: '🇱🇾' },
  { code: 'LI', dialCode: '+423', name: 'Liechtenstein', flag: '🇱🇮' },
  { code: 'LT', dialCode: '+370', name: 'Lithuania', flag: '🇱🇹' },
  { code: 'LU', dialCode: '+352', name: 'Luxembourg', flag: '🇱🇺' },
  { code: 'MG', dialCode: '+261', name: 'Madagascar', flag: '🇲🇬' },
  { code: 'MW', dialCode: '+265', name: 'Malawi', flag: '🇲🇼' },
  { code: 'MY', dialCode: '+60', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'MV', dialCode: '+960', name: 'Maldives', flag: '🇲🇻' },
  { code: 'ML', dialCode: '+223', name: 'Mali', flag: '🇲🇱' },
  { code: 'MT', dialCode: '+356', name: 'Malta', flag: '🇲🇹' },
  { code: 'MH', dialCode: '+692', name: 'Marshall Islands', flag: '🇲🇭' },
  { code: 'MR', dialCode: '+222', name: 'Mauritania', flag: '🇲🇷' },
  { code: 'MU', dialCode: '+230', name: 'Mauritius', flag: '🇲🇺' },
  { code: 'FM', dialCode: '+691', name: 'Micronesia', flag: '🇫🇲' },
  { code: 'MD', dialCode: '+373', name: 'Moldova', flag: '🇲🇩' },
  { code: 'MC', dialCode: '+377', name: 'Monaco', flag: '🇲🇨' },
  { code: 'MN', dialCode: '+976', name: 'Mongolia', flag: '🇲🇳' },
  { code: 'ME', dialCode: '+382', name: 'Montenegro', flag: '🇲🇪' },
  { code: 'MA', dialCode: '+212', name: 'Morocco', flag: '🇲🇦' },
  { code: 'MZ', dialCode: '+258', name: 'Mozambique', flag: '🇲🇿' },
  { code: 'MM', dialCode: '+95', name: 'Myanmar', flag: '🇲🇲' },
  { code: 'NA', dialCode: '+264', name: 'Namibia', flag: '🇳🇦' },
  { code: 'NR', dialCode: '+674', name: 'Nauru', flag: '🇳🇷' },
  { code: 'NP', dialCode: '+977', name: 'Nepal', flag: '🇳🇵' },
  { code: 'NI', dialCode: '+505', name: 'Nicaragua', flag: '🇳🇮' },
  { code: 'NE', dialCode: '+227', name: 'Niger', flag: '🇳🇪' },
  { code: 'KP', dialCode: '+850', name: 'North Korea', flag: '🇰🇵' },
  { code: 'MK', dialCode: '+389', name: 'North Macedonia', flag: '🇲🇰' },
  { code: 'OM', dialCode: '+968', name: 'Oman', flag: '🇴🇲' },
  { code: 'PK', dialCode: '+92', name: 'Pakistan', flag: '🇵🇰' },
  { code: 'PW', dialCode: '+680', name: 'Palau', flag: '🇵🇼' },
  { code: 'PS', dialCode: '+970', name: 'Palestine', flag: '🇵🇸' },
  { code: 'PA', dialCode: '+507', name: 'Panama', flag: '🇵🇦' },
  { code: 'PG', dialCode: '+675', name: 'Papua New Guinea', flag: '🇵🇬' },
  { code: 'PY', dialCode: '+595', name: 'Paraguay', flag: '🇵🇾' },
  { code: 'PE', dialCode: '+51', name: 'Peru', flag: '🇵🇪' },
  { code: 'PH', dialCode: '+63', name: 'Philippines', flag: '🇵🇭' },
  { code: 'QA', dialCode: '+974', name: 'Qatar', flag: '🇶🇦' },
  { code: 'RO', dialCode: '+40', name: 'Romania', flag: '🇷🇴' },
  { code: 'RW', dialCode: '+250', name: 'Rwanda', flag: '🇷🇼' },
  { code: 'KN', dialCode: '+1869', name: 'Saint Kitts and Nevis', flag: '🇰🇳' },
  { code: 'LC', dialCode: '+1758', name: 'Saint Lucia', flag: '🇱🇨' },
  { code: 'VC', dialCode: '+1784', name: 'Saint Vincent and the Grenadines', flag: '🇻🇨' },
  { code: 'WS', dialCode: '+685', name: 'Samoa', flag: '🇼🇸' },
  { code: 'SM', dialCode: '+378', name: 'San Marino', flag: '🇸🇲' },
  { code: 'ST', dialCode: '+239', name: 'Sao Tome and Principe', flag: '🇸🇹' },
  { code: 'SN', dialCode: '+221', name: 'Senegal', flag: '🇸🇳' },
  { code: 'RS', dialCode: '+381', name: 'Serbia', flag: '🇷🇸' },
  { code: 'SC', dialCode: '+248', name: 'Seychelles', flag: '🇸🇨' },
  { code: 'SL', dialCode: '+232', name: 'Sierra Leone', flag: '🇸🇱' },
  { code: 'SK', dialCode: '+421', name: 'Slovakia', flag: '🇸🇰' },
  { code: 'SI', dialCode: '+386', name: 'Slovenia', flag: '🇸🇮' },
  { code: 'SB', dialCode: '+677', name: 'Solomon Islands', flag: '🇸🇧' },
  { code: 'SO', dialCode: '+252', name: 'Somalia', flag: '🇸🇴' },
  { code: 'SS', dialCode: '+211', name: 'South Sudan', flag: '🇸🇸' },
  { code: 'LK', dialCode: '+94', name: 'Sri Lanka', flag: '🇱🇰' },
  { code: 'SD', dialCode: '+249', name: 'Sudan', flag: '🇸🇩' },
  { code: 'SR', dialCode: '+597', name: 'Suriname', flag: '🇸🇷' },
  { code: 'SY', dialCode: '+963', name: 'Syria', flag: '🇸🇾' },
  { code: 'TW', dialCode: '+886', name: 'Taiwan', flag: '🇹🇼' },
  { code: 'TJ', dialCode: '+992', name: 'Tajikistan', flag: '🇹🇯' },
  { code: 'TZ', dialCode: '+255', name: 'Tanzania', flag: '🇹🇿' },
  { code: 'TH', dialCode: '+66', name: 'Thailand', flag: '🇹🇭' },
  { code: 'TL', dialCode: '+670', name: 'Timor-Leste', flag: '🇹🇱' },
  { code: 'TG', dialCode: '+228', name: 'Togo', flag: '🇹🇬' },
  { code: 'TO', dialCode: '+676', name: 'Tonga', flag: '🇹🇴' },
  { code: 'TT', dialCode: '+1868', name: 'Trinidad and Tobago', flag: '🇹🇹' },
  { code: 'TN', dialCode: '+216', name: 'Tunisia', flag: '🇹🇳' },
  { code: 'TM', dialCode: '+993', name: 'Turkmenistan', flag: '🇹🇲' },
  { code: 'TV', dialCode: '+688', name: 'Tuvalu', flag: '🇹🇻' },
  { code: 'UG', dialCode: '+256', name: 'Uganda', flag: '🇺🇬' },
  { code: 'UA', dialCode: '+380', name: 'Ukraine', flag: '🇺🇦' },
  { code: 'UY', dialCode: '+598', name: 'Uruguay', flag: '🇺🇾' },
  { code: 'UZ', dialCode: '+998', name: 'Uzbekistan', flag: '🇺🇿' },
  { code: 'VU', dialCode: '+678', name: 'Vanuatu', flag: '🇻🇺' },
  { code: 'VA', dialCode: '+39', name: 'Vatican City', flag: '🇻🇦' },
  { code: 'VE', dialCode: '+58', name: 'Venezuela', flag: '🇻🇪' },
  { code: 'VN', dialCode: '+84', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'YE', dialCode: '+967', name: 'Yemen', flag: '🇾🇪' },
  { code: 'ZM', dialCode: '+260', name: 'Zambia', flag: '🇿🇲' },
  { code: 'ZW', dialCode: '+263', name: 'Zimbabwe', flag: '🇿🇼' },
];

interface PhoneNumberInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  error?: string;
  disabled?: boolean;
}

export default function PhoneNumberInput({
  value,
  onChange,
  label = 'Phone Number',
  required = false,
  placeholder = 'Enter phone number',
  className = '',
  error,
  disabled = false,
}: PhoneNumberInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(COUNTRY_CODES[0]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse existing value to extract country code and number
  useEffect(() => {
    if (value && !value.startsWith('+')) {
      // If value doesn't start with +, it's just a number, keep current country
      return;
    }
    
    if (value) {
      // Try to find matching country code (check longest dial codes first)
      const sortedCountries = [...COUNTRY_CODES].sort((a, b) => b.dialCode.length - a.dialCode.length);
      const matchingCountry = sortedCountries.find((country) =>
        value.startsWith(country.dialCode)
      );
      if (matchingCountry) {
        setSelectedCountry(matchingCountry);
        // Extract number without country code
        const number = value.replace(matchingCountry.dialCode, '').trim();
        if (inputRef.current) {
          inputRef.current.value = number;
        }
      } else if (value.startsWith('+')) {
        // Has + but no matching country, use default
        const number = value.replace(/^\+/, '').trim();
        if (inputRef.current) {
          inputRef.current.value = number;
        }
      }
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper to get display number (extract number part from full value)
  const getDisplayNumber = () => {
    if (!value) return '';
    if (value.startsWith(selectedCountry.dialCode)) {
      return value.replace(selectedCountry.dialCode, '').trim();
    }
    // If value starts with + but not our selected country code, try to find matching country
    if (value.startsWith('+')) {
      const sortedCountries = [...COUNTRY_CODES].sort((a, b) => b.dialCode.length - a.dialCode.length);
      const matchingCountry = sortedCountries.find((country) =>
        value.startsWith(country.dialCode)
      );
      if (matchingCountry) {
        return value.replace(matchingCountry.dialCode, '').trim();
      }
      // No match, remove the + and return
      return value.replace(/^\+/, '').trim();
    }
    // No + prefix, return as is (might be just digits)
    return value;
  };

  const displayNumber = getDisplayNumber();

  const filteredCountries = COUNTRY_CODES.filter((country) =>
    country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.dialCode.includes(searchTerm) ||
    country.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCountrySelect = (country: CountryCode) => {
    setSelectedCountry(country);
    setIsOpen(false);
    setSearchTerm('');
    
    // Update the full phone number with new country code
    // Get current number part (without old country code)
    const currentDisplayNumber = getDisplayNumber();
    const newFullNumber = country.dialCode + currentDisplayNumber;
    onChange(newFullNumber);
    
    // Focus back on input
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const number = e.target.value.replace(/\D/g, ''); // Only digits
    const fullNumber = selectedCountry.dialCode + number;
    onChange(fullNumber);
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="flex gap-2">
        {/* Country Code Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => !disabled && setIsOpen(!isOpen)}
            className={`flex items-center gap-2 px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 bg-white hover:bg-gray-50 transition-colors min-w-[140px] disabled:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 ${
              error
                ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
            }`}
          >
            <span className="text-xl">{selectedCountry.flag}</span>
            <span className="text-sm font-medium text-gray-700">{selectedCountry.dialCode}</span>
            <HiChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {isOpen && (
            <div className="absolute z-50 mt-1 w-80 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-hidden">
              {/* Search Input */}
              <div className="p-3 border-b border-gray-200">
                <div className="relative">
                  <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search country..."
                    className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <HiX className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Country List */}
              <div className="overflow-y-auto max-h-80">
                {filteredCountries.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    No countries found
                  </div>
                ) : (
                  filteredCountries.map((country) => (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => handleCountrySelect(country)}
                      className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors ${
                        selectedCountry.code === country.code ? 'bg-blue-50' : ''
                      }`}
                    >
                      <span className="text-xl">{country.flag}</span>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium text-gray-900">{country.name}</div>
                        <div className="text-xs text-gray-500">{country.dialCode}</div>
                      </div>
                      {selectedCountry.code === country.code && (
                        <HiCheckCircle className="w-5 h-5 text-blue-600" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Phone Number Input */}
        <div className="flex-1">
          <input
            ref={inputRef}
            type="tel"
            value={displayNumber}
            onChange={handleNumberChange}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={disabled}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:cursor-not-allowed ${
              error
                ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
            }`}
            aria-invalid={Boolean(error)}
            required={required}
          />
          {error && (
            <p className="mt-1 text-sm text-red-600">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}

