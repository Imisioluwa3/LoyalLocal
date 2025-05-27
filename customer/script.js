// Configuration - Move to environment variables in production
const SUPABASE_URL = 'https://mhwsjjumsiveahfckcwr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1od3NqanVtc2l2ZWFoZmNrY3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMTc4MTQsImV4cCI6MjA2MzU5MzgxNH0.5varGB23DXpfi1adlwejmYwLlTbbjCPfKGDm9rWEQBo';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: false, // Changed from true to false for customer portal
        autoRefreshToken: false
    }
});

// Global variables for cleanup and optimization
let phoneInputTimeout;
let notificationTimeout;
let isOnline = navigator.onLine;

// Phone number validation and formatting
document.addEventListener('DOMContentLoaded', function() {
    const phoneInput = document.getElementById('customerPhone');
    
    phoneInput.addEventListener('input', function(e) {
        clearTimeout(phoneInputTimeout);
        
        phoneInputTimeout = setTimeout(() => {
            let value = e.target.value.replace(/\D/g, '');
            
            // Auto-add country code if user starts with local number
            if (value.length > 0 && !value.startsWith('234')) {
                // If starts with 0, replace with 234
                if (value.startsWith('0')) {
                    value = '234' + value.substring(1);
                }
                // If starts with 7,8,9 (common Nigerian prefixes), add 234
                else if (/^[789]/.test(value)) {
                    value = '234' + value;
                }
            }
            
            // Format as +234 817 072 4872
            let formatted = '';
            if (value.length > 0) {
                formatted = '+' + value.substring(0, 3);
                if (value.length > 3) {
                    formatted += ' ' + value.substring(3, 6);
                }
                if (value.length > 6) {
                    formatted += ' ' + value.substring(6, 9);
                }
                if (value.length > 9) {
                    formatted += ' ' + value.substring(9, 13);
                }
            }
            
            // Limit to valid Nigerian phone number length
            if (value.length > 13) {
                formatted = formatted.substring(0, 17); // +234 817 072 4872
            }
            
            e.target.value = formatted;
        }, 100); // Debounce for 100ms
    });

    // Enter key support for phone input
    phoneInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            lookupRewards();
        }
    });

    // Auto-focus on phone input when page loads
    phoneInput.focus();
    
    // Add keyboard navigation support
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const resultsSection = document.getElementById('resultsSection');
            if (resultsSection && resultsSection.classList.contains('active')) {
                goBack();
            }
        }
    });
});

// Phone number validation function
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

// Main lookup function with improved error handling
// Enhanced lookup function with better error handling and flexible phone number matching
async function lookupRewards() {
    // Check internet connection
    if (!isOnline) {
        showNotification('No internet connection. Please check your network.', 'error');
        return;
    }

    const phoneInput = document.getElementById('customerPhone');
    if (!phoneInput) {
        console.error('Phone input element not found');
        return;
    }

    const validation = validatePhoneNumber(phoneInput.value);
    
    if (!validation.isValid) {
        showNotification(validation.message, 'error');
        phoneInput.focus();
        return;
    }

    const btn = document.querySelector('.btn');
    const btnText = document.getElementById('btnText');
    const phoneNumber = validation.phoneNumber;
    
    if (!btn || !btnText) {
        console.error('Button elements not found');
        return;
    }
    
    // Show loading state
    btn.disabled = true;
    btnText.textContent = 'Searching...';
    btn.classList.add('loading');

    try {
        // Create multiple phone number variations for flexible matching
        const phoneVariations = generatePhoneVariations(phoneNumber);
        console.log('Searching for phone variations:', phoneVariations);

        // First, let's check if the visits table exists and has data
        const { data: testData, error: testError } = await supabase
            .from('visits')
            .select('*')
            .limit(1);

        if (testError) {
            console.error('Table access error:', testError);
            throw new Error(`Database error: ${testError.message}`);
        }

        console.log('Table access successful, sample data:', testData);

        // Try multiple queries with different phone number formats
        let visits = null;
        let queryError = null;

        for (const phoneVariation of phoneVariations) {
            try {
                console.log(`Trying phone format: ${phoneVariation}`);
                
                const { data, error } = await supabase
                    .from('visits')
                    .select(`
                        *,
                        businesses:business_id (
                            name,
                            type,
                            loyalty_visits_required,
                            loyalty_reward_description
                        )
                    `)
                    .eq('customer_phone_number', phoneVariation)
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error(`Query error for ${phoneVariation}:`, error);
                    queryError = error;
                    continue;
                }

                if (data && data.length > 0) {
                    console.log(`Found ${data.length} visits for ${phoneVariation}`);
                    visits = data;
                    break;
                }
            } catch (err) {
                console.error(`Exception for ${phoneVariation}:`, err);
                continue;
            }
        }

        // If no visits found with any format, try a broader search
        if (!visits || visits.length === 0) {
            console.log('No exact matches found, trying broader search...');
            
            // Try searching with LIKE operator for partial matches
            const cleanNumber = phoneNumber.replace(/\D/g, '');
            const numberSuffix = cleanNumber.slice(-10); // Last 10 digits
            
            const { data: likeData, error: likeError } = await supabase
                .from('visits')
                .select(`
                    *,
                    businesses:business_id (
                        name,
                        type,
                        loyalty_visits_required,
                        loyalty_reward_description
                    )
                `)
                .like('customer_phone_number', `%${numberSuffix}`)
                .order('created_at', { ascending: false });

            if (!likeError && likeData && likeData.length > 0) {
                console.log(`Found ${likeData.length} visits with LIKE search`);
                visits = likeData;
            }
        }

        // Handle results
        if (!visits || visits.length === 0) {
            console.log('No visits found for phone number');
            showNoResults();
        } else {
            // Filter out visits with null business data
            const validVisits = visits.filter(visit => visit.businesses && visit.businesses.name);
            
            if (validVisits.length === 0) {
                console.log('No valid business data found');
                showNoResults();
            } else {
                console.log(`Processing ${validVisits.length} valid visits`);
                const customerData = transformVisitData(validVisits, phoneNumber);
                displayResults(customerData, phoneInput.value);
            }
        }

    } catch (error) {
        console.error('Lookup error:', error);
        
        // Show user-friendly error message
        const errorMessage = error.name === 'TypeError' && !navigator.onLine
            ? 'Please check your internet connection and try again'
            : error.message || 'Unable to fetch rewards. Please try again later.';
            
        showNotification(errorMessage, 'error');
        
    } finally {
        // Reset button state
        btn.disabled = false;
        btnText.textContent = 'Check My Rewards';
        btn.classList.remove('loading');
    }
}

// Generate different phone number format variations for flexible matching
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


// Helper function to translate error codes to user-friendly messages
function getErrorMessage(error) {
    if (!error) return 'An unexpected error occurred';
    
    switch (error.code) {
        case 'PGRST116':
            return 'Service temporarily unavailable. Please try again later.';
        case 'PGRST301':
            return 'Unable to connect to the database. Please check your connection.';
        case '42P01':
            return 'Data temporarily unavailable. Please try again later.';
        case 'PGRST000':
            return 'Database connection error. Please try again.';
        default:
            return error.message || 'An unexpected error occurred. Please try again.';
    }
}

// Fixed data processing logic with better error handling
function transformVisitData(visits, phoneNumber) {
    const businessesMap = {};
    let customerName = '';
    let mostRecentNameDate = null;
    
    visits.forEach(visit => {
        // Skip visits without valid business data
        if (!visit.businesses || !visit.businesses.name) {
            console.warn('Skipping visit with invalid business data:', visit);
            return;
        }

        const business = visit.businesses;
        const businessName = business.name;
        
        if (!businessesMap[businessName]) {
            businessesMap[businessName] = {
                type: business.type || 'other',
                currentVisits: 0, // Visits counting toward next reward
                totalVisits: 0,   // All visits ever made
                visitsRequired: Math.max(1, business.loyalty_visits_required || 10), // Ensure minimum of 1
                rewardDescription: business.loyalty_reward_description || 'Free service',
                lastVisit: visit.created_at,
                totalEarned: 0,
                availableRewards: 0
            };
        }
        
        const businessData = businessesMap[businessName];
        
        // Count all visits
        businessData.totalVisits++;
        
        if (visit.is_redeemed_for_reward) {
            // This visit was used to redeem a reward
            businessData.totalEarned++;
        } else {
            // This visit counts toward the next reward
            businessData.currentVisits++;
        }
        
        // Calculate available rewards (can have multiple ready)
        businessData.availableRewards = Math.floor(businessData.currentVisits / businessData.visitsRequired);
        
        // Get the most recent customer name
        if (visit.customer_name) {
            const visitDate = new Date(visit.created_at);
            if (!mostRecentNameDate || visitDate > mostRecentNameDate) {
                customerName = visit.customer_name;
                mostRecentNameDate = visitDate;
            }
        }
        
        // Track most recent visit date
        const visitDate = new Date(visit.created_at);
        const storedDate = new Date(businessData.lastVisit);
        if (visitDate > storedDate) {
            businessData.lastVisit = visit.created_at;
        }
    });

    return {
        name: customerName,
        businesses: businessesMap
    };
}

// Display results with improved error handling
function displayResults(customerData, phoneNumber) {
    const lookupSection = document.getElementById('lookupSection');
    const resultsSection = document.getElementById('resultsSection');
    
    if (!lookupSection || !resultsSection) {
        console.error('Required sections not found');
        return;
    }

    lookupSection.style.display = 'none';
    resultsSection.classList.add('active');

    // Format phone number for display
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    const formattedPhone = `+${cleanNumber.substring(0, 3)} ${cleanNumber.substring(3, 6)} ${cleanNumber.substring(6, 9)} ${cleanNumber.substring(9)}`;

    // Update customer summary
    const welcomeMessage = document.getElementById('welcomeMessage');
    const phoneDisplay = document.getElementById('phoneDisplay');
    
    if (welcomeMessage) {
        welcomeMessage.textContent = customerData.name ? `Welcome back, ${customerData.name}!` : 'Welcome back!';
    }
    
    if (phoneDisplay) {
        phoneDisplay.textContent = `Phone: ${formattedPhone.trim()}`;
    }

    // Calculate summary stats
    const businesses = Object.keys(customerData.businesses);
    let totalVisits = 0;
    let availableRewards = 0;
    let earnedRewards = 0;

    businesses.forEach(businessName => {
        const business = customerData.businesses[businessName];
        totalVisits += business.totalVisits;
        earnedRewards += business.totalEarned;
        availableRewards += business.availableRewards;
    });

    // Update summary stats with null checks
    updateElementText('totalBusinesses', businesses.length);
    updateElementText('totalVisits', totalVisits);
    updateElementText('availableRewards', availableRewards);
    updateElementText('earnedRewards', earnedRewards);

    generateLoyaltyCards(customerData.businesses);
}

// Helper function to safely update element text
function updateElementText(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    } else {
        console.warn(`Element with ID '${elementId}' not found`);
    }
}

// Optimized loyalty card generation with error handling
function generateLoyaltyCards(businesses) {
    const container = document.getElementById('loyaltyCards');
    
    if (!container) {
        console.error('Loyalty cards container not found');
        return;
    }
    
    // Use DocumentFragment for efficient DOM updates
    const fragment = document.createDocumentFragment();
    
    Object.entries(businesses).forEach(([businessName, data]) => {
        try {
            const card = createLoyaltyCard(businessName, data);
            fragment.appendChild(card);
        } catch (error) {
            console.error(`Error creating card for ${businessName}:`, error);
        }
    });
    
    // Clear container and append all cards at once
    container.innerHTML = '';
    container.appendChild(fragment);
}

// Create loyalty card with updated logic and better error handling
function createLoyaltyCard(businessName, data) {
    const card = document.createElement('div');
    card.className = 'loyalty-card';
    
    // Ensure data integrity
    const visitsRequired = Math.max(1, data.visitsRequired || 10);
    const currentVisits = Math.max(0, data.currentVisits || 0);
    const availableRewards = Math.max(0, data.availableRewards || 0);
    
    // Calculate progress based on current visits toward next reward
    const visitsForProgress = currentVisits % visitsRequired;
    const progress = Math.min((visitsForProgress / visitsRequired) * 100, 100);
    const hasReward = availableRewards > 0;
    const businessIcon = getBusinessIcon(data.type);
    
    card.innerHTML = `
        <div class="business-header">
            <div class="business-icon">${businessIcon}</div>
            <div class="business-info">
                <h3>${escapeHtml(businessName)}</h3>
                <div class="business-type">${escapeHtml(data.type || 'other')}</div>
            </div>
        </div>
        <div class="progress-section">
            <div class="progress-header">
                <div class="visits-count">${visitsForProgress} visits</div>
                <div class="visits-needed">${visitsRequired} needed for reward</div>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
        </div>
        <div class="stamps-visual" role="group" aria-label="Visit progress">
            ${generateStamps(visitsForProgress, visitsRequired)}
        </div>
        ${hasReward ? `
            <div class="reward-available">
                <div class="reward-title">🎉 ${availableRewards} Reward${availableRewards > 1 ? 's' : ''} Available!</div>
                <div class="reward-description">${escapeHtml(data.rewardDescription || 'Free service')}</div>
                <div class="reward-instructions">
                    Show this to the staff at ${escapeHtml(businessName)} to redeem your reward${availableRewards > 1 ? 's' : ''}!
                </div>
            </div>
        ` : ''}
        <div class="card-footer">
            <div class="last-visit">Last visit: ${formatDate(data.lastVisit)}</div>
            <div class="total-stats">Total visits: ${data.totalVisits || 0} | Rewards earned: ${data.totalEarned || 0}</div>
        </div>
    `;
    return card;
}

// Helper function to escape HTML to prevent XSS
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Generate stamp visualization with better accessibility
function generateStamps(visits, required) {
    let stamps = '';
    const maxStamps = Math.min(required, 10); // Limit stamps for better mobile display
    
    for (let i = 1; i <= maxStamps; i++) {
        const isFilled = i <= visits;
        stamps += `<div class="stamp ${isFilled ? 'filled' : 'empty'}" aria-label="${isFilled ? 'Visit completed' : `Visit ${i} needed`}">
            ${isFilled ? '✓' : i}
        </div>`;
    }
    
    // If there are more stamps than we can display, show a summary
    if (required > maxStamps) {
        stamps += `<div class="stamp-summary">+${required - maxStamps} more</div>`;
    }
    
    return stamps;
}

// Business icon mapping with fallback
function getBusinessIcon(type) {
    const iconMap = {
        'salon': '💇‍♀️',
        'barber': '💈',
        'cafe': '☕',
        'restaurant': '🍽️',
        'retail': '🛍️',
        'service': '🔧',
        'other': '🏪'
    };
    
    return iconMap[type] || iconMap['other'];
}

// Improved date formatting with error handling
function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return 'Unknown date';
        }
        
        const today = new Date();
        const diffTime = Math.abs(today - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.ceil(diffDays / 7)} week${Math.ceil(diffDays / 7) > 1 ? 's' : ''} ago`;
        
        return date.toLocaleDateString('en-NG', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Unknown date';
    }
}

// Show no results page with improved error handling
function showNoResults() {
    const lookupSection = document.getElementById('lookupSection');
    const resultsSection = document.getElementById('resultsSection');
    const customerSummary = document.getElementById('customerSummary');
    const loyaltyCards = document.getElementById('loyaltyCards');
    const noResults = document.getElementById('noResults');
    
    if (lookupSection) lookupSection.style.display = 'none';
    if (resultsSection) resultsSection.classList.add('active');
    if (customerSummary) customerSummary.style.display = 'none';
    if (loyaltyCards) loyaltyCards.style.display = 'none';
    if (noResults) noResults.style.display = 'block';
}

// Navigation back to search with improved error handling
function goBack() {
    const lookupSection = document.getElementById('lookupSection');
    const resultsSection = document.getElementById('resultsSection');
    const customerSummary = document.getElementById('customerSummary');
    const loyaltyCards = document.getElementById('loyaltyCards');
    const noResults = document.getElementById('noResults');
    const phoneInput = document.getElementById('customerPhone');
    
    if (lookupSection) lookupSection.style.display = 'block';
    if (resultsSection) resultsSection.classList.remove('active');
    if (customerSummary) customerSummary.style.display = 'block';
    if (loyaltyCards) loyaltyCards.style.display = 'block';
    if (noResults) noResults.style.display = 'none';
    
    if (phoneInput) {
        phoneInput.value = '';
        phoneInput.focus();
    }
}

// Improved notification system with better cleanup
function showNotification(message, type = 'success') {
    // Clear existing notification timeout
    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
    }
    
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => {
        if (notification.parentNode) {
            notification.remove();
        }
    });
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add ARIA attributes for screen readers
    notification.setAttribute('role', 'alert');
    notification.setAttribute('aria-live', 'polite');
    
    document.body.appendChild(notification);
    
    // Use requestAnimationFrame for smooth animations
    requestAnimationFrame(() => {
        notification.classList.add('show');
    });
    
    notificationTimeout = setTimeout(() => {
        notification.classList.add('hide');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 4000);
}

// Connection monitoring with improved handling
window.addEventListener('online', () => {
    isOnline = true;
    showNotification('Connection restored', 'success');
});

window.addEventListener('offline', () => {
    isOnline = false;
    showNotification('Connection lost. Please check your internet.', 'error');
});

// Cleanup function
function cleanup() {
    if (phoneInputTimeout) clearTimeout(phoneInputTimeout);
    if (notificationTimeout) clearTimeout(notificationTimeout);
    
    // Remove event listeners if needed
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => {
        if (notification.parentNode) {
            notification.remove();
        }
    });
}

// Event listeners for cleanup
window.addEventListener('beforeunload', cleanup);
window.addEventListener('unload', cleanup);

// Error handling for uncaught errors
window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
    showNotification('An unexpected error occurred. Please refresh the page.', 'error');
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    showNotification('A network error occurred. Please try again.', 'error');
    event.preventDefault(); // Prevent the default console error
});