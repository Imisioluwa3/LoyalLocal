// Customer Phone Utility Functions

function validatePhoneNumber(phoneInput) {
    const phoneNumber = phoneInput.replace(/\D/g, '');
    
    // Check if it's a valid Nigerian number
    if (phoneNumber.length < 13 || phoneNumber.length > 14) {
        return { isValid: false, message: 'Phone number must be 10-11 digits after country code' };
    }
    
    if (!phoneNumber.startsWith('234')) {
        return { isValid: false, message: 'Please enter a valid Nigerian phone number (+234...)' };
    }
    
    // Check valid Nigerian prefixes after 234
    const prefix = phoneNumber.substring(3, 6);
    const validPrefixes = ['701', '702', '703', '704', '705', '706', '707', '708', '709', 
                          '802', '803', '804', '805', '806', '807', '808', '809', '810', 
                          '811', '812', '813', '814', '815', '816', '817', '818', '819',
                          '901', '902', '903', '904', '905', '906', '907', '908', '909',
                          '915', '916', '917', '918'];
    
    if (!validPrefixes.includes(prefix)) {
        return { isValid: false, message: 'Invalid Nigerian phone number prefix' };
    }
    
    return { isValid: true, phoneNumber };
}

function generatePhoneVariations(phoneNumber) {
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    const variations = new Set();
    
    // Original format
    variations.add(cleanNumber);
    
    // With + prefix
    variations.add('+' + cleanNumber);
    
    // Formatted versions
    if (cleanNumber.startsWith('234')) {
        const localNumber = cleanNumber.substring(3);
        
        // +234 817 072 4872
        variations.add(`+234 ${localNumber.substring(0,3)} ${localNumber.substring(3,6)} ${localNumber.substring(6)}`);
        
        // +234-817-072-4872
        variations.add(`+234-${localNumber.substring(0,3)}-${localNumber.substring(3,6)}-${localNumber.substring(6)}`);
        
        // +234.817.072.4872
        variations.add(`+234.${localNumber.substring(0,3)}.${localNumber.substring(3,6)}.${localNumber.substring(6)}`);
        
        // (234) 817-072-4872
        variations.add(`(234) ${localNumber.substring(0,3)}-${localNumber.substring(3,6)}-${localNumber.substring(6)}`);
        
        // 0817072472 (local format)
        variations.add('0' + localNumber);
        
        // +234(817)072-4872
        variations.add(`+234(${localNumber.substring(0,3)})${localNumber.substring(3,6)}-${localNumber.substring(6)}`);
    }
    
    return Array.from(variations);
}

// Export for CommonJS (Node.js/Jest) or attach to window for browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        validatePhoneNumber,
        generatePhoneVariations
    };
} else if (typeof window !== 'undefined') {
    window.customerPhoneUtils = {
        validatePhoneNumber,
        generatePhoneVariations
    };
}
