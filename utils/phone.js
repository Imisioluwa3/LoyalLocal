/**
 * Phone Utility Module for LoyalLocal
 * Handles Nigerian phone number validation, formatting, and normalization
 * @module utils/phone
 */

/**
 * Comprehensive list of valid Nigerian mobile network prefixes
 * Updated as of 2024
 */
const NIGERIAN_PREFIXES = [
    // MTN
    '703', '706', '803', '806', '810', '813', '814', '816', '903', '906',
    // Airtel
    '701', '708', '802', '808', '812', '901', '902', '904', '907', '912',
    // Glo
    '705', '805', '807', '811', '815', '905', '915',
    // 9mobile (Etisalat)
    '809', '817', '818', '908', '909',
    // Ntel
    '804',
    // Smile
    '702',
    // Additional prefixes
    '910', '911', '913', '914', '916', '917', '918'
];

/**
 * Validates if a prefix is a valid Nigerian mobile network prefix
 * @param {string} prefix - Three-digit network prefix
 * @returns {boolean} True if valid Nigerian prefix
 */
function isValidNigerianPrefix(prefix) {
    return NIGERIAN_PREFIXES.includes(prefix);
}

/**
 * Normalizes a Nigerian phone number to international format (+234XXXXXXXXXX)
 * Handles various input formats:
 * - Local: 08012345678, 8012345678
 * - International: +2348012345678, 2348012345678
 * - Formatted: +234 801 234 5678, etc.
 *
 * @param {string} phone - Phone number in any format
 * @returns {string} Normalized phone number in +234XXXXXXXXXX format
 * @example
 * normalizePhoneNumber('08012345678') // returns '+2348012345678'
 * normalizePhoneNumber('8012345678')  // returns '+2348012345678'
 * normalizePhoneNumber('+234 801 234 5678') // returns '+2348012345678'
 */
function normalizePhoneNumber(phone) {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');

    // Handle different Nigerian phone number formats
    if (digits.length === 11 && digits.startsWith('0')) {
        // Convert 08012345678 to +2348012345678
        return `+234${digits.substring(1)}`;
    } else if (digits.length === 10 && !digits.startsWith('0')) {
        // Convert 8012345678 to +2348012345678
        return `+234${digits}`;
    } else if (digits.length === 13 && digits.startsWith('234')) {
        // Convert 2348012345678 to +2348012345678
        return `+${digits}`;
    } else if (digits.length === 14 && phone.startsWith('+234')) {
        // Already in +234 format
        return `+${digits}`;
    }

    // Return original if it doesn't match expected patterns
    return phone;
}

/**
 * Formats a phone number for display
 * Converts to readable format: +234 801 234 5678
 *
 * @param {string} phone - Phone number in any format
 * @param {string} [format='international'] - Format type: 'international', 'local', or 'compact'
 * @returns {string} Formatted phone number
 * @example
 * formatPhoneNumber('+2348012345678') // returns '+234 801 234 5678'
 * formatPhoneNumber('08012345678', 'local') // returns '0801 234 5678'
 * formatPhoneNumber('2348012345678', 'compact') // returns '234-801-234-5678'
 */
function formatPhoneNumber(phone, format = 'international') {
    const digits = phone.replace(/\D/g, '');

    if (format === 'international' && digits.length === 13 && digits.startsWith('234')) {
        // Format as +234 801 234 5678
        return `+234 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
    } else if (format === 'local' && digits.length === 11 && digits.startsWith('0')) {
        // Format as 0801 234 5678
        return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
    } else if (format === 'local' && digits.length === 13 && digits.startsWith('234')) {
        // Convert to local format: 0801 234 5678
        return `0${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
    } else if (format === 'compact') {
        // Format as 234-801-234-5678 (good for database consistency)
        if (digits.length === 13 && digits.startsWith('234')) {
            return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}-${digits.slice(9)}`;
        } else if (digits.length === 11 && digits.startsWith('0')) {
            return `234-${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
        }
    } else if (digits.length === 10) {
        // Format as 801 234 5678
        return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    }

    return phone;
}

/**
 * Validates a Nigerian phone number
 * Checks format and verifies against valid Nigerian network prefixes
 *
 * @param {string} phone - Phone number to validate
 * @returns {{isValid: boolean, message: string, phoneNumber?: string}} Validation result
 * @example
 * validatePhoneNumber('08012345678')
 * // returns { isValid: true, phoneNumber: '+2348012345678' }
 *
 * validatePhoneNumber('12345')
 * // returns { isValid: false, message: 'Phone number must be 10-11 digits after country code' }
 */
function validatePhoneNumber(phone) {
    const digits = phone.replace(/\D/g, '');

    // Valid Nigerian phone number patterns:
    // 11 digits starting with 0 (08012345678)
    // 10 digits not starting with 0 (8012345678)
    // 13 digits starting with 234 (2348012345678)
    // With + prefix for international format

    let prefix;

    if (digits.length === 11 && digits.startsWith('0')) {
        prefix = digits.substring(1, 4);
    } else if (digits.length === 10 && !digits.startsWith('0')) {
        prefix = digits.substring(0, 3);
    } else if (digits.length === 13 && digits.startsWith('234')) {
        prefix = digits.substring(3, 6);
    } else if (digits.length === 14 && phone.startsWith('+234')) {
        prefix = digits.substring(3, 6);
    } else {
        return {
            isValid: false,
            message: 'Phone number must be 10-11 digits (or 13 digits with country code)'
        };
    }

    // Validate prefix
    if (!isValidNigerianPrefix(prefix)) {
        return {
            isValid: false,
            message: 'Invalid Nigerian phone number prefix'
        };
    }

    // Return normalized phone number
    const normalized = normalizePhoneNumber(phone);
    return {
        isValid: true,
        phoneNumber: normalized
    };
}

/**
 * Generates multiple phone number format variations for flexible database matching
 * Useful when you're not sure which format was stored in the database
 *
 * @param {string} phoneNumber - Phone number in any format
 * @returns {string[]} Array of phone number variations
 * @example
 * generatePhoneVariations('2348012345678')
 * // returns [
 * //   '2348012345678',
 * //   '+2348012345678',
 * //   '+234 801 234 5678',
 * //   '+234-801-234-5678',
 * //   '08012345678',
 * //   // ... more variations
 * // ]
 */
function generatePhoneVariations(phoneNumber) {
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    const variations = new Set();

    // Original format (digits only)
    variations.add(cleanNumber);

    // With + prefix
    if (cleanNumber.startsWith('234')) {
        variations.add('+' + cleanNumber);

        const localNumber = cleanNumber.substring(3);

        // Formatted versions with spaces
        variations.add(`+234 ${localNumber.substring(0,3)} ${localNumber.substring(3,6)} ${localNumber.substring(6)}`);

        // Formatted versions with dashes
        variations.add(`+234-${localNumber.substring(0,3)}-${localNumber.substring(3,6)}-${localNumber.substring(6)}`);

        // Formatted versions with dots
        variations.add(`+234.${localNumber.substring(0,3)}.${localNumber.substring(3,6)}.${localNumber.substring(6)}`);

        // Formatted versions with parentheses
        variations.add(`(234) ${localNumber.substring(0,3)}-${localNumber.substring(3,6)}-${localNumber.substring(6)}`);
        variations.add(`+234(${localNumber.substring(0,3)})${localNumber.substring(3,6)}-${localNumber.substring(6)}`);

        // Local format (0817072472)
        variations.add('0' + localNumber);

        // Local format with spaces
        variations.add(`0${localNumber.substring(0,3)} ${localNumber.substring(3,6)} ${localNumber.substring(6)}`);

        // Local format with dashes
        variations.add(`0${localNumber.substring(0,3)}-${localNumber.substring(3,6)}-${localNumber.substring(6)}`);
    }

    return Array.from(variations);
}

/**
 * Auto-formats phone number as user types (for input fields)
 * Adds country code and formats with spaces
 *
 * @param {string} value - Current input value
 * @returns {string} Formatted value
 * @example
 * autoFormatPhoneInput('0801234567') // returns '+234 801 234 567'
 */
function autoFormatPhoneInput(value) {
    let digits = value.replace(/\D/g, '');

    // Auto-add country code if user starts with local number
    if (digits.length > 0 && !digits.startsWith('234')) {
        // If starts with 0, replace with 234
        if (digits.startsWith('0')) {
            digits = '234' + digits.substring(1);
        }
        // If starts with 7,8,9 (common Nigerian prefixes), add 234
        else if (/^[789]/.test(digits)) {
            digits = '234' + digits;
        }
    }

    // Format as +234 817 072 4872
    let formatted = '';
    if (digits.length > 0) {
        formatted = '+' + digits.substring(0, 3);
        if (digits.length > 3) {
            formatted += ' ' + digits.substring(3, 6);
        }
        if (digits.length > 6) {
            formatted += ' ' + digits.substring(6, 9);
        }
        if (digits.length > 9) {
            formatted += ' ' + digits.substring(9, 13);
        }
    }

    // Limit to valid Nigerian phone number length (+234 XXX XXX XXXX = 17 chars)
    if (digits.length > 13) {
        formatted = formatted.substring(0, 17);
    }

    return formatted;
}

/**
 * Validates email address format
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid email format
 */
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Export for use in other modules
// For ES6 modules (if using type="module")
if (typeof module !== 'undefined' && module.exports) {
    // CommonJS (Node.js)
    module.exports = {
        normalizePhoneNumber,
        formatPhoneNumber,
        validatePhoneNumber,
        generatePhoneVariations,
        autoFormatPhoneInput,
        isValidNigerianPrefix,
        validateEmail,
        NIGERIAN_PREFIXES
    };
}

// For browser globals (if not using modules)
if (typeof window !== 'undefined') {
    window.PhoneUtils = {
        normalizePhoneNumber,
        formatPhoneNumber,
        validatePhoneNumber,
        generatePhoneVariations,
        autoFormatPhoneInput,
        isValidNigerianPrefix,
        validateEmail,
        NIGERIAN_PREFIXES
    };
}
