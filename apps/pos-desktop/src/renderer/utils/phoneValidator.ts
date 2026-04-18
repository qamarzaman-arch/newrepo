/**
 * Phone Number Validation and Formatting Utility
 * Supports multiple international formats
 */

export interface PhoneValidationResult {
  isValid: boolean;
  formatted: string;
  error?: string;
  countryCode?: string;
}

class PhoneValidator {
  // Common phone patterns by country
  private patterns: Record<string, RegExp> = {
    US: /^(\+?1)?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/,
    UK: /^(\+?44)?[-.\s]?([0-9]{4})[-.\s]?([0-9]{6})$/,
    PKR: /^(\+?92)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{7})$/,
    IND: /^(\+?91)?[-.\s]?([0-9]{5})[-.\s]?([0-9]{5})$/,
    BDT: /^(\+?880)?[-.\s]?([0-9]{4})[-.\s]?([0-9]{6})$/,
    SAR: /^(\+?966)?[-.\s]?([0-9]{2})[-.\s]?([0-9]{7})$/,
    AED: /^(\+?971)?[-.\s]?([0-9]{2})[-.\s]?([0-9]{7})$/,
    GENERIC: /^(\+?[0-9]{1,3})?[-.\s]?([0-9]{2,4})[-.\s]?([0-9]{3,4})[-.\s]?([0-9]{4,6})$/,
  };

  /**
   * Clean phone number (remove all non-digit characters except +)
   */
  private cleanPhone(phone: string): string {
    return phone.replace(/[^\d+]/g, '');
  }

  /**
   * Detect country code from phone number
   */
  private detectCountryCode(phone: string): string | null {
    const cleaned = this.cleanPhone(phone);
    
    if (cleaned.startsWith('+1') || cleaned.startsWith('1')) return 'US';
    if (cleaned.startsWith('+44')) return 'UK';
    if (cleaned.startsWith('+92')) return 'PKR';
    if (cleaned.startsWith('+91')) return 'IND';
    if (cleaned.startsWith('+880')) return 'BDT';
    if (cleaned.startsWith('+966')) return 'SAR';
    if (cleaned.startsWith('+971')) return 'AED';
    
    return null;
  }

  /**
   * Format phone number based on detected country
   */
  private formatByCountry(phone: string, country: string): string {
    const cleaned = this.cleanPhone(phone);
    
    switch (country) {
      case 'US':
        // Format: +1 (555) 123-4567
        const usMatch = cleaned.match(/^(\+?1)?(\d{3})(\d{3})(\d{4})$/);
        if (usMatch) {
          return `+1 (${usMatch[2]}) ${usMatch[3]}-${usMatch[4]}`;
        }
        break;
        
      case 'UK':
        // Format: +44 1234 567890
        const ukMatch = cleaned.match(/^(\+?44)?(\d{4})(\d{6})$/);
        if (ukMatch) {
          return `+44 ${ukMatch[2]} ${ukMatch[3]}`;
        }
        break;
        
      case 'PKR':
        // Format: +92 300 1234567
        const pkrMatch = cleaned.match(/^(\+?92)?(\d{3})(\d{7})$/);
        if (pkrMatch) {
          return `+92 ${pkrMatch[2]} ${pkrMatch[3]}`;
        }
        break;
        
      case 'IND':
        // Format: +91 12345 67890
        const indMatch = cleaned.match(/^(\+?91)?(\d{5})(\d{5})$/);
        if (indMatch) {
          return `+91 ${indMatch[2]} ${indMatch[3]}`;
        }
        break;
        
      case 'BDT':
        // Format: +880 1234 567890
        const bdtMatch = cleaned.match(/^(\+?880)?(\d{4})(\d{6})$/);
        if (bdtMatch) {
          return `+880 ${bdtMatch[2]} ${bdtMatch[3]}`;
        }
        break;
        
      case 'SAR':
        // Format: +966 50 1234567
        const sarMatch = cleaned.match(/^(\+?966)?(\d{2})(\d{7})$/);
        if (sarMatch) {
          return `+966 ${sarMatch[2]} ${sarMatch[3]}`;
        }
        break;
        
      case 'AED':
        // Format: +971 50 1234567
        const aedMatch = cleaned.match(/^(\+?971)?(\d{2})(\d{7})$/);
        if (aedMatch) {
          return `+971 ${aedMatch[2]} ${aedMatch[3]}`;
        }
        break;
    }
    
    return cleaned;
  }

  /**
   * Validate and format phone number
   */
  public validate(phone: string, preferredCountry?: string): PhoneValidationResult {
    if (!phone || phone.trim().length === 0) {
      return {
        isValid: false,
        formatted: '',
        error: 'Phone number is required',
      };
    }

    const cleaned = this.cleanPhone(phone);
    
    // Check minimum length
    if (cleaned.length < 10) {
      return {
        isValid: false,
        formatted: phone,
        error: 'Phone number too short (minimum 10 digits)',
      };
    }

    // Check maximum length
    if (cleaned.length > 15) {
      return {
        isValid: false,
        formatted: phone,
        error: 'Phone number too long (maximum 15 digits)',
      };
    }

    // Detect country code
    const detectedCountry = this.detectCountryCode(phone) || preferredCountry || 'GENERIC';
    
    // Validate against pattern
    const pattern = this.patterns[detectedCountry] || this.patterns.GENERIC;
    const isValid = pattern.test(phone);

    if (!isValid) {
      return {
        isValid: false,
        formatted: phone,
        error: `Invalid phone number format for ${detectedCountry}`,
      };
    }

    // Format the phone number
    const formatted = this.formatByCountry(phone, detectedCountry);

    return {
      isValid: true,
      formatted,
      countryCode: detectedCountry,
    };
  }

  /**
   * Format phone number as user types (real-time formatting)
   */
  public formatAsYouType(phone: string, preferredCountry: string = 'US'): string {
    const cleaned = this.cleanPhone(phone);
    
    if (cleaned.length === 0) return '';

    // Auto-detect or use preferred country
    const country = this.detectCountryCode(phone) || preferredCountry;
    
    switch (country) {
      case 'US':
        if (cleaned.length <= 3) return cleaned;
        if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
        if (cleaned.length <= 10) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
        return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 11)}`;
        
      case 'PKR':
        if (cleaned.length <= 3) return cleaned;
        if (cleaned.length <= 10) return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
        return `+92 ${cleaned.slice(2, 5)} ${cleaned.slice(5)}`;
        
      default:
        // Generic formatting: add spaces every 3-4 digits
        return cleaned.replace(/(\d{3,4})(?=\d)/g, '$1 ');
    }
  }

  /**
   * Extract digits only (for database storage)
   */
  public getDigitsOnly(phone: string): string {
    return this.cleanPhone(phone).replace(/^\+/, '');
  }

  /**
   * Check if two phone numbers are the same
   */
  public areEqual(phone1: string, phone2: string): boolean {
    const cleaned1 = this.cleanPhone(phone1);
    const cleaned2 = this.cleanPhone(phone2);
    
    // Remove leading + and country codes for comparison
    const normalized1 = cleaned1.replace(/^\+?[0-9]{1,3}/, '');
    const normalized2 = cleaned2.replace(/^\+?[0-9]{1,3}/, '');
    
    return normalized1 === normalized2;
  }
}

// Singleton instance
let phoneValidator: PhoneValidator | null = null;

export const getPhoneValidator = (): PhoneValidator => {
  if (!phoneValidator) {
    phoneValidator = new PhoneValidator();
  }
  return phoneValidator;
};

export default PhoneValidator;
