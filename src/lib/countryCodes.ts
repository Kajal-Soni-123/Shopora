export interface CountryCode {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  placeholder?: string;
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳', placeholder: '98765 43210' },
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸', placeholder: '555 019 2834' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧', placeholder: '7911 123456' },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦', placeholder: '555 019 2834' },
  { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺', placeholder: '412 345 678' },
  { code: 'AE', name: 'United Arab Emirates', dialCode: '+971', flag: '🇦🇪', placeholder: '50 123 4567' },
  { code: 'SG', name: 'Singapore', dialCode: '+65', flag: '🇸🇬', placeholder: '8123 4567' },
  { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪', placeholder: '151 23456789' },
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷', placeholder: '6 12 34 56 78' },
  { code: 'JP', name: 'Japan', dialCode: '+81', flag: '🇯🇵', placeholder: '90 1234 5678' },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦', placeholder: '50 123 4567' },
  { code: 'QA', name: 'Qatar', dialCode: '+974', flag: '🇶🇦', placeholder: '3312 3456' },
  { code: 'KW', name: 'Kuwait', dialCode: '+965', flag: '🇰🇼', placeholder: '9123 4567' },
  { code: 'OM', name: 'Oman', dialCode: '+968', flag: '🇴🇲', placeholder: '9123 4567' },
  { code: 'BH', name: 'Bahrain', dialCode: '+973', flag: '🇧🇭', placeholder: '3612 3456' },
  { code: 'ZA', name: 'South Africa', dialCode: '+27', flag: '🇿🇦', placeholder: '71 234 5678' },
  { code: 'NG', name: 'Nigeria', dialCode: '+234', flag: '🇳🇬', placeholder: '802 123 4567' },
  { code: 'KE', name: 'Kenya', dialCode: '+254', flag: '🇰🇪', placeholder: '712 345678' },
  { code: 'BR', name: 'Brazil', dialCode: '+55', flag: '🇧🇷', placeholder: '11 91234-5678' },
  { code: 'MX', name: 'Mexico', dialCode: '+52', flag: '🇲🇽', placeholder: '55 1234 5678' },
  { code: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷', placeholder: '11 1234-5678' },
  { code: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳', placeholder: '139 1234 5678' },
  { code: 'HK', name: 'Hong Kong', dialCode: '+852', flag: '🇭🇰', placeholder: '9123 4567' },
  { code: 'KR', name: 'South Korea', dialCode: '+82', flag: '🇰🇷', placeholder: '10 1234 5678' },
  { code: 'MY', name: 'Malaysia', dialCode: '+60', flag: '🇲🇾', placeholder: '12 345 6789' },
  { code: 'ID', name: 'Indonesia', dialCode: '+62', flag: '🇮🇩', placeholder: '812 3456 7890' },
  { code: 'TH', name: 'Thailand', dialCode: '+66', flag: '🇹🇭', placeholder: '81 234 5678' },
  { code: 'VN', name: 'Vietnam', dialCode: '+84', flag: '🇻🇳', placeholder: '91 234 5678' },
  { code: 'PH', name: 'Philippines', dialCode: '+63', flag: '🇵🇭', placeholder: '917 123 4567' },
  { code: 'PK', name: 'Pakistan', dialCode: '+92', flag: '🇵🇰', placeholder: '300 1234567' },
  { code: 'BD', name: 'Bangladesh', dialCode: '+880', flag: '🇧🇩', placeholder: '1712 345678' },
  { code: 'LK', name: 'Sri Lanka', dialCode: '+94', flag: '🇱🇰', placeholder: '71 234 5678' },
  { code: 'NP', name: 'Nepal', dialCode: '+977', flag: '🇳🇵', placeholder: '984 1234567' },
  { code: 'NL', name: 'Netherlands', dialCode: '+31', flag: '🇳🇱', placeholder: '6 12345678' },
  { code: 'CH', name: 'Switzerland', dialCode: '+41', flag: '🇨🇭', placeholder: '79 123 45 67' },
  { code: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹', placeholder: '312 345 6789' },
  { code: 'ES', name: 'Spain', dialCode: '+34', flag: '🇪🇸', placeholder: '612 34 56 78' },
  { code: 'SE', name: 'Sweden', dialCode: '+46', flag: '🇸🇪', placeholder: '70 123 45 67' },
  { code: 'NO', name: 'Norway', dialCode: '+47', flag: '🇳🇴', placeholder: '412 34 567' },
  { code: 'DK', name: 'Denmark', dialCode: '+45', flag: '🇩🇰', placeholder: '20 12 34 56' },
  { code: 'FI', name: 'Finland', dialCode: '+358', flag: '🇫🇮', placeholder: '40 123 4567' },
  { code: 'IE', name: 'Ireland', dialCode: '+353', flag: '🇮🇪', placeholder: '87 123 4567' },
  { code: 'NZ', name: 'New Zealand', dialCode: '+64', flag: '🇳🇿', placeholder: '21 123 4567' },
  { code: 'TR', name: 'Turkey', dialCode: '+90', flag: '🇹🇷', placeholder: '501 234 5678' },
  { code: 'RU', name: 'Russia', dialCode: '+7', flag: '🇷🇺', placeholder: '912 345-67-89' },
];

export const DEFAULT_COUNTRY: CountryCode = COUNTRY_CODES[0]; // India (+91)

/**
 * Parses a full phone number string into a matching CountryCode and national number string.
 * Example: "+916353801173" -> { country: India (+91), nationalNumber: "6353801173" }
 */
export function parsePhoneNumber(phoneString: string = ''): { country: CountryCode; nationalNumber: string } {
  if (!phoneString || typeof phoneString !== 'string') {
    return { country: DEFAULT_COUNTRY, nationalNumber: '' };
  }

  const cleaned = phoneString.trim();
  if (!cleaned.startsWith('+')) {
    // If no leading '+', return default country and the raw input as national number
    return { country: DEFAULT_COUNTRY, nationalNumber: cleaned };
  }

  // Find longest matching dialCode (e.g. +880 before +88)
  const sortedByDialLength = [...COUNTRY_CODES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  for (const country of sortedByDialLength) {
    if (cleaned.startsWith(country.dialCode)) {
      const nationalNumber = cleaned.slice(country.dialCode.length).trim();
      return { country, nationalNumber };
    }
  }

  return { country: DEFAULT_COUNTRY, nationalNumber: cleaned.replace(/^\+/, '') };
}
