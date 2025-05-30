const {
    validatePhoneNumber,
    generatePhoneVariations
} = require('../customer/phoneUtils.js');

describe('validatePhoneNumber (customer)', () => {
    test('should return isValid: true for valid +234 number with spaces', () => {
        const result = validatePhoneNumber('+234 803 123 4567');
        expect(result.isValid).toBe(true);
        expect(result.phoneNumber).toBe('2348031234567');
    });

    test('should return isValid: false for valid 080 number (as it expects 234 prefix)', () => {
        const result = validatePhoneNumber('08031234567');
        expect(result.isValid).toBe(false);
        expect(result.message).toBe('Phone number must be 10-11 digits after country code');
    });
    
    test('should return isValid: true for valid +234 number without spaces', () => {
        const result = validatePhoneNumber('+2348031234567');
        expect(result.isValid).toBe(true);
        expect(result.phoneNumber).toBe('2348031234567');
    });

    test('should return isValid: true for valid 234 number without plus', () => {
        const result = validatePhoneNumber('2348031234567');
        expect(result.isValid).toBe(true);
        expect(result.phoneNumber).toBe('2348031234567');
    });

    // Test cases for various valid prefixes
    const validPrefixes = ['701', '703', '802', '803', '810', '815', '903', '905'];
    validPrefixes.forEach(prefix => {
        const number = `+234${prefix}1234567`;
        test(`should return isValid: true for valid prefix ${prefix} (${number})`, () => {
            const result = validatePhoneNumber(number);
            expect(result.isValid).toBe(true);
            expect(result.phoneNumber).toBe(`234${prefix}1234567`);
        });
    });

    test('should return isValid: false for number too short after country code', () => {
        const result = validatePhoneNumber('+234803123456'); // 9 digits after 234
        expect(result.isValid).toBe(false);
        expect(result.message).toBe('Phone number must be 10-11 digits after country code');
    });

    test('should return isValid: false for number too long after country code', () => {
        const result = validatePhoneNumber('+23480312345678'); // 11 digits after 234 (14 total) - this specific function might allow 11 digits after 234
        const resultTooLong = validatePhoneNumber('+234803123456789'); // 12 digits after 234
        expect(resultTooLong.isValid).toBe(false);
        expect(resultTooLong.message).toBe('Phone number must be 10-11 digits after country code');
    });
    
    test('should return isValid: false for numbers that are not 234 prefixed (after cleaning)', () => {
        const result = validatePhoneNumber('+1238031234567');
        expect(result.isValid).toBe(false);
        expect(result.message).toBe('Please enter a valid Nigerian phone number (+234...)');
    });
    
    test('should return isValid: false for invalid Nigerian prefix', () => {
        const result = validatePhoneNumber('+2340001234567');
        expect(result.isValid).toBe(false);
        expect(result.message).toBe('Invalid Nigerian phone number prefix');
    });

    test('should return isValid: false for empty string', () => {
        const result = validatePhoneNumber('');
        expect(result.isValid).toBe(false);
        // Message might vary, could be length check or prefix check first
        expect(result.message).toBeDefined();
    });

    test('should handle numeric input by converting to string for validation', () => {
        // The function is designed for string inputs, typical from phoneInput.value
        // Testing with a string representation of a number.
        const result = validatePhoneNumber('123');
        expect(result.isValid).toBe(false);
        expect(result.message).toBe('Phone number must be 10-11 digits after country code');
    });

    test('should handle input with mixed characters', () => {
        const result = validatePhoneNumber('+234-803-123-4567-abc');
        expect(result.isValid).toBe(true);
        expect(result.phoneNumber).toBe('2348031234567');
    });
});

describe('generatePhoneVariations (customer)', () => {
    const baseNumber = '+2348031234567';
    const baseNumberClean = '2348031234567';
    const localPart = '8031234567';

    test('should return an array of strings', () => {
        const variations = generatePhoneVariations(baseNumber);
        expect(Array.isArray(variations)).toBe(true);
        variations.forEach(v => expect(typeof v).toBe('string'));
    });

    test('should contain the original cleaned number', () => {
        const variations = generatePhoneVariations(baseNumber);
        expect(variations).toContain(baseNumberClean);
    });

    test('should contain the number with + prefix', () => {
        const variations = generatePhoneVariations(baseNumber);
        expect(variations).toContain(baseNumber);
    });
    
    test('should contain the local format with leading 0', () => {
        const variations = generatePhoneVariations(baseNumber);
        expect(variations).toContain(`0${localPart}`);
    });

    test('should contain formatted version with spaces: +234 XXX XXX XXXX', () => {
        const variations = generatePhoneVariations(baseNumber);
        expect(variations).toContain(`+234 ${localPart.substring(0,3)} ${localPart.substring(3,6)} ${localPart.substring(6)}`);
    });
    
    test('should contain formatted version with hyphens: +234-XXX-XXX-XXXX', () => {
        const variations = generatePhoneVariations(baseNumber);
        expect(variations).toContain(`+234-${localPart.substring(0,3)}-${localPart.substring(3,6)}-${localPart.substring(6)}`);
    });

    test('should contain formatted version with dots: +234.XXX.XXX.XXXX', () => {
        const variations = generatePhoneVariations(baseNumber);
        expect(variations).toContain(`+234.${localPart.substring(0,3)}.${localPart.substring(3,6)}.${localPart.substring(6)}`);
    });

    test('should contain formatted version with parentheses: (234) XXX-XXX-XXXX', () => {
        const variations = generatePhoneVariations(baseNumber);
        expect(variations).toContain(`(234) ${localPart.substring(0,3)}-${localPart.substring(3,6)}-${localPart.substring(6)}`);
    });
    
    test('should contain formatted version: +234(XXX)XXX-XXXX', () => {
        const variations = generatePhoneVariations(baseNumber);
        expect(variations).toContain(`+234(${localPart.substring(0,3)})${localPart.substring(3,6)}-${localPart.substring(6)}`);
    });

    test('should handle input that is not +234 prefixed (returns limited variations)', () => {
        const nonNigerianNumber = '+14151234567';
        const variations = generatePhoneVariations(nonNigerianNumber);
        expect(variations).toContain(nonNigerianNumber.replace(/\D/g, ''));
        expect(variations).toContain(nonNigerianNumber);
        expect(variations.length).toBe(2); // Only base and +base if not Nigerian '234'
    });

    test('should return minimal variations for empty string', () => {
        const variations = generatePhoneVariations('');
        expect(variations).toEqual(['', '+']); // As per current function logic
    });
    
    test('should handle short numbers (not 234 prefixed)', () => {
        const shortNumber = '12345';
        const variations = generatePhoneVariations(shortNumber);
        expect(variations).toContain('12345');
        expect(variations).toContain('+12345');
        expect(variations.length).toBe(2);
    });
});
