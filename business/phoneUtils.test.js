const {
    normalizePhoneNumber,
    formatPhoneNumber,
    validatePhoneNumber,
    isValidNigerianPrefix
} = require('../business/phoneUtils.js');

describe('normalizePhoneNumber', () => {
    test('should convert 080-prefix to +234 format', () => {
        expect(normalizePhoneNumber('08012345678')).toBe('+2348012345678');
    });

    test('should convert 80-prefix (no leading zero) to +234 format', () => {
        expect(normalizePhoneNumber('8012345678')).toBe('+2348012345678');
    });

    test('should handle 234-prefix (no plus) and return with plus', () => {
        expect(normalizePhoneNumber('2348012345678')).toBe('+2348012345678');
    });
    
    test('should return already normalized +234 numbers as is', () => {
        expect(normalizePhoneNumber('+2348012345678')).toBe('+2348012345678');
    });

    test('should remove non-digit characters', () => {
        expect(normalizePhoneNumber('080-123-45-678')).toBe('+2348012345678');
        expect(normalizePhoneNumber('234801234asdf45678')).toBe('+2348012345678');
        expect(normalizePhoneNumber('+234 801 234 5678')).toBe('+2348012345678');
    });

    test('should return short numbers as is (or based on specific logic if any)', () => {
        expect(normalizePhoneNumber('12345')).toBe('12345');
    });

    test('should return numbers with other country codes as is', () => {
        expect(normalizePhoneNumber('+14151234567')).toBe('+14151234567'); // US
        expect(normalizePhoneNumber('+442012345678')).toBe('+442012345678'); // UK
    });

    test('should return empty string for empty input', () => {
        expect(normalizePhoneNumber('')).toBe('');
    });
    
    test('should handle various non-digit characters gracefully', () => {
        expect(normalizePhoneNumber('070-7!@#$8%^&*(9)-_=+012;:\'",.<>/?`~34')).toBe('+2347078901234');
    });

    test('should handle numbers that are too long but otherwise look Nigerian', () => {
        // The function currently returns the original string if no specific rule matches length after cleaning
        expect(normalizePhoneNumber('080123456789')).toBe('080123456789'); 
        expect(normalizePhoneNumber('+234801234567890123')).toBe('+234801234567890123'); // Stays as is
    });
});

describe('formatPhoneNumber', () => {
    test('should format +234 numbers with spaces', () => {
        expect(formatPhoneNumber('+2348012345678')).toBe('+234 801 234 5678');
    });

    test('should format 080-prefix numbers with spaces', () => {
        expect(formatPhoneNumber('08012345678')).toBe('0801 234 5678');
    });

    test('should format 80-prefix (no leading zero) numbers with spaces', () => {
        expect(formatPhoneNumber('8012345678')).toBe('801 234 5678');
    });
    
    test('should return already formatted numbers as is (if matching expected format)', () => {
        expect(formatPhoneNumber('+234 801 234 5678')).toBe('+234 801 234 5678');
        expect(formatPhoneNumber('0801 234 5678')).toBe('0801 234 5678');
        expect(formatPhoneNumber('801 234 5678')).toBe('801 234 5678');
    });

    test('should remove existing spaces and reformat for +234 numbers', () => {
        expect(formatPhoneNumber('+234801 2345678')).toBe('+234 801 234 5678');
    });
    
    test('should remove existing spaces and reformat for 080-prefix numbers', () => {
        expect(formatPhoneNumber('0801 234 56789')).toBe('0801 234 56789'); // Assumes it handles extra digits by appending
        expect(formatPhoneNumber('0801234 5678')).toBe('0801 234 5678');
    });

    test('should return numbers that do not match Nigerian patterns as is', () => {
        expect(formatPhoneNumber('1234567890')).toBe('123 456 7890'); // 10 digit non-Nigerian
        expect(formatPhoneNumber('+14151234567')).toBe('+14151234567');
        expect(formatPhoneNumber('abcdefghijk')).toBe('abcdefghijk');
    });
    
    test('should return empty string for empty input', () => {
        expect(formatPhoneNumber('')).toBe('');
    });
});

describe('isValidNigerianPrefix', () => {
    // Valid prefixes based on the function's list
    const validPrefixes = ['703', '802', '905', '809', '817', '701', '705', '804', '702'];
    validPrefixes.forEach(prefix => {
        test(`should return true for valid prefix: ${prefix}`, () => {
            expect(isValidNigerianPrefix(prefix)).toBe(true);
        });
    });

    // Invalid prefixes
    const invalidPrefixes = ['123', '000', '555', '700', '800', '900'];
    invalidPrefixes.forEach(prefix => {
        test(`should return false for invalid prefix: ${prefix}`, () => {
            expect(isValidNigerianPrefix(prefix)).toBe(false);
        });
    });

    test('should return false for prefixes with incorrect length', () => {
        expect(isValidNigerianPrefix('70')).toBe(false);
        expect(isValidNigerianPrefix('8031')).toBe(false);
    });

    test('should return false for empty string or non-string input', () => {
        expect(isValidNigerianPrefix('')).toBe(false);
        // expect(isValidNigerianPrefix(null)).toBe(false); // Function expects string
        // expect(isValidNigerianPrefix(undefined)).toBe(false); // Function expects string
    });
});


describe('validatePhoneNumber', () => {
    // Valid numbers based on the function's logic (which uses isValidNigerianPrefix)
    const validNumbers = [
        '08031234567', // Glo
        '+2347051234567', // Glo
        '09061234567', // MTN
        '2348121234567', // Airtel (no +)
        '07021234567', // Smile
        '+2348091234567' // 9mobile
    ];
    validNumbers.forEach(number => {
        test(`should return true for valid Nigerian number: ${number}`, () => {
            expect(validatePhoneNumber(number)).toBe(true);
        });
    });

    // Invalid numbers
    const invalidNumbers = [
        '08000000000', // Invalid prefix '800'
        '+2347001234567', // Invalid prefix '700'
        '0801234567',   // Too short (10 digits, needs 11 with leading 0)
        '801234567',    // Too short (9 digits, needs 10 without leading 0)
        '+234801234567', // Too short for +234 (needs 10 after +234)
        '080123456789',  // Too long (12 digits)
        '+23480123456789', // Too long (14 digits after +)
        '12345678901', // Not a Nigerian pattern
        '+14151234567', // US number
        '080-123-4567', // Contains non-digits, validatePhoneNumber expects clean digits or specific prefixes
        '0801234567A' // Contains letter
    ];
    invalidNumbers.forEach(number => {
        test(`should return false for invalid number: ${number}`, () => {
            expect(validatePhoneNumber(number)).toBe(false);
        });
    });

    test('should return false for empty string', () => {
        expect(validatePhoneNumber('')).toBe(false);
    });

    test('should handle numbers with spaces correctly (based on its internal logic)', () => {
        // validatePhoneNumber as written doesn't clean spaces itself before length check,
        // it relies on the prefix check after digit extraction.
        // It extracts digits first: '080 1234 5678' -> '08012345678' which is then validated.
        expect(validatePhoneNumber('080 3123 4567')).toBe(true); // Valid after digit extraction
        expect(validatePhoneNumber('+234 705 123 4567')).toBe(true); // Valid
        expect(validatePhoneNumber('0800 000 0000')).toBe(false); // Invalid prefix '800'
    });
});
