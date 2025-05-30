// Phone Utility Functions

function normalizePhoneNumber(phone) {
    const digits = phone.replace(/\D/g, '');
    
    if (digits.length === 11 && digits.startsWith('0')) {
        return `+234${digits.substring(1)}`;
    } else if (digits.length === 10 && !digits.startsWith('0')) {
        return `+234${digits}`;
    } else if (digits.length === 13 && digits.startsWith('234')) {
        return `+${digits}`;
    } else if (digits.length === 14 && digits.startsWith('+234')) { 
        // This condition is for already normalized numbers like '+2348031234567'
        // However, 'digits' variable is phone.replace(/\D/g, ''), so it will not contain '+'.
        // An input like '+2348031234567' will result in digits = '2348031234567',
        // which is correctly handled by the (digits.length === 13 && digits.startsWith('234')) condition.
        // For robustness, if this specific formatting of 'digits' (14 chars, starts with '+234')
        // was ever intended, it would need to operate on 'phone' or a different variable.
        // Given 'digits' definition, this specific 'else if' block as written for 'digits' is unlikely to be hit.
        // However, if the intention was to check the raw `phone` for this, it should be `phone.startsWith('+234')`.
        // For now, keeping it as per prompt, but noting `digits` won't match this.
        // A more correct handling for an already normalized number is done by the previous condition.
        // If an input like '+2348012345678' is passed, `digits` becomes '2348012345678',
        // and `digits.length === 13 && digits.startsWith('234')` handles it.
        // Let's assume the prompt means to check the cleaned digits for a 234 prefix if it's very long.
        // For instance, if digits = "2348012345678" (len 13), it's covered.
        // If digits = "+2348012345678" (len 14) - this won't happen as '+' is removed.
        // So, this condition is effectively dead code for `digits`.
        // To make it meaningful for `digits`, it would be like `digits.length === 13 && digits.startsWith('234')` (already covered)
        // or if `digits` was `+234...` (not possible).
        // The most direct interpretation of the prompt for this line is to keep it,
        // while acknowledging it won't be hit by `digits`.
        // If `phone` was `+234...` and `digits` was derived, `digits` would be `234...`.
        // The previous condition (`digits.length === 13 && digits.startsWith('234')`) handles this.
        // This line will remain as requested by the prompt, but it's redundant with `digits`.
        return digits; // Should be `phone` if we want to return the original `+234...` string. Or `+${digits.substring(1)}`
    }
    return phone; // Return original if no Nigerian pattern matched
}

function formatPhoneNumber(phone) {
    const digits = phone.replace(/\D/g, '');
    
    if (digits.length === 13 && digits.startsWith('234')) {
        return `+234 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
    } else if (digits.length === 11 && digits.startsWith('0')) {
        return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
    } else if (digits.length === 10) {
        return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    }
    return phone;
}

function isValidNigerianPrefix(prefix) {
    const nigerianPrefixes = [
        '703', '706', '803', '806', '813', '814', '816', '903', '906',
        '701', '708', '802', '808', '812', '901', '902', '904', '907', '912',
        '705', '805', '807', '811', '815', '905', '915',
        '809', '817', '818', '908', '909',
        '804',
        '702'
    ];
    return nigerianPrefixes.includes(prefix);
}

function validatePhoneNumber(phone) {
    const digits = phone.replace(/\D/g, ''); 
    if (digits.length === 11 && digits.startsWith('0')) {
        const prefix = digits.substring(1, 4);
        return isValidNigerianPrefix(prefix);
    } else if (digits.length === 10 && !digits.startsWith('0')) {
        const prefix = digits.substring(0, 3);
        return isValidNigerianPrefix(prefix);
    } else if (digits.length === 13 && digits.startsWith('234')) {
        const prefix = digits.substring(3, 6);
        return isValidNigerianPrefix(prefix);
    }
    return false;
}

// Export for CommonJS (Node.js/Jest) or attach to window for browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        normalizePhoneNumber,
        formatPhoneNumber,
        validatePhoneNumber,
        isValidNigerianPrefix
    };
} else if (typeof window !== 'undefined') {
    window.phoneUtils = {
        normalizePhoneNumber,
        formatPhoneNumber,
        validatePhoneNumber,
        isValidNigerianPrefix
    };
}
