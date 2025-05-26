// Configuration - Move to environment variables in production
const SUPABASE_URL = 'https://mhwsjjumsiveahfckcwr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1od3NqanVtc2l2ZWFoZmNrY3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMTc4MTQsImV4cCI6MjA2MzU5MzgxNH0.5varGB23DXpfi1adlwejmYwLlTbbjCPfKGDm9rWEQBo';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true
    }
});

// Global variables for cleanup and optimization
let phoneInputTimeout;
let notificationTimeout;
let isOnline = navigator.onLine;

// Phone number validation and formatting
document.getElementById('customerPhone').addEventListener('input', function(e) {
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
document.getElementById('customerPhone').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        lookupRewards();
    }
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
async function lookupRewards() {
    // Check internet connection
    if (!isOnline) {
        showNotification('No internet connection. Please check your network.', 'error');
        return;
    }

    const phoneInput = document.getElementById('customerPhone').value;
    const validation = validatePhoneNumber(phoneInput);
    
    if (!validation.isValid) {
        showNotification(validation.message, 'error');
        return;
    }

    const btn = document.querySelector('.btn');
    const btnText = document.getElementById('btnText');
    const phoneNumber = validation.phoneNumber;
    
    // Show loading state
    btn.disabled = true;
    btnText.textContent = 'Searching...';
    btn.classList.add('loading');

    try {
        const { data: visits, error } = await supabase
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
            .eq('customer_phone_number', phoneNumber)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase error:', error);
            throw new Error(getErrorMessage(error));
        }

        if (visits.length === 0) {
            showNoResults();
        } else {
            const customerData = transformVisitData(visits, phoneNumber);
            displayResults(customerData, phoneInput);
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

// Helper function to translate error codes to user-friendly messages
function getErrorMessage(error) {
    switch (error.code) {
        case 'PGRST116':
            return 'Service temporarily unavailable. Please try again later.';
        case 'PGRST301':
            return 'Unable to connect to the database. Please check your connection.';
        case '42P01':
            return 'Data temporarily unavailable. Please try again later.';
        default:
            return error.message || 'An unexpected error occurred. Please try again.';
    }
}

// Fixed data processing logic
function transformVisitData(visits, phoneNumber) {
    const businessesMap = {};
    let customerName = '';
    let mostRecentNameDate = null;
    
    visits.forEach(visit => {
        const business = visit.businesses;
        const businessName = business.name;
        
        if (!businessesMap[businessName]) {
            businessesMap[businessName] = {
                type: business.type,
                currentVisits: 0, // Visits counting toward next reward
                totalVisits: 0,   // All visits ever made
                visitsRequired: business.loyalty_visits_required,
                rewardDescription: business.loyalty_reward_description,
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
        const visitDate = new Date(visit.created_at);
        if (visit.customer_name && (!mostRecentNameDate || visitDate > mostRecentNameDate)) {
            customerName = visit.customer_name;
            mostRecentNameDate = visitDate;
        }
        
        // Track most recent visit date
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

// Display results with corrected data processing
function displayResults(customerData, phoneNumber) {
    document.getElementById('lookupSection').style.display = 'none';
    document.getElementById('resultsSection').classList.add('active');

    // Format phone number for display
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    const formattedPhone = `+${cleanNumber.substring(0, 3)} ${cleanNumber.substring(3, 6)} ${cleanNumber.substring(6, 9)} ${cleanNumber.substring(9)}`;

    // Update customer summary
    document.getElementById('welcomeMessage').textContent = 
        customerData.name ? `Welcome back, ${customerData.name}!` : 'Welcome back!';
    document.getElementById('phoneDisplay').textContent = `Phone: ${formattedPhone.trim()}`;

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

    document.getElementById('totalBusinesses').textContent = businesses.length;
    document.getElementById('totalVisits').textContent = totalVisits;
    document.getElementById('availableRewards').textContent = availableRewards;
    document.getElementById('earnedRewards').textContent = earnedRewards;

    generateLoyaltyCards(customerData.businesses);
}

// Optimized loyalty card generation
function generateLoyaltyCards(businesses) {
    const container = document.getElementById('loyaltyCards');
    
    // Use DocumentFragment for efficient DOM updates
    const fragment = document.createDocumentFragment();
    
    Object.entries(businesses).forEach(([businessName, data]) => {
        const card = createLoyaltyCard(businessName, data);
        fragment.appendChild(card);
    });
    
    // Clear container and append all cards at once
    container.innerHTML = '';
    container.appendChild(fragment);
}

// Create loyalty card with updated logic
function createLoyaltyCard(businessName, data) {
    const card = document.createElement('div');
    card.className = 'loyalty-card';
    
    // Calculate progress based on current visits toward next reward
    const visitsForProgress = data.currentVisits % data.visitsRequired;
    const progress = Math.min((visitsForProgress / data.visitsRequired) * 100, 100);
    const hasReward = data.availableRewards > 0;
    const businessIcon = getBusinessIcon(data.type);
    
    card.innerHTML = `
        <div class="business-header">
            <div class="business-icon">${businessIcon}</div>
            <div class="business-info">
                <h3>${businessName}</h3>
                <div class="business-type">${data.type}</div>
            </div>
        </div>
        <div class="progress-section">
            <div class="progress-header">
                <div class="visits-count">${visitsForProgress} visits</div>
                <div class="visits-needed">${data.visitsRequired} needed for reward</div>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
        </div>
        <div class="stamps-visual">
            ${generateStamps(visitsForProgress, data.visitsRequired)}
        </div>
        ${hasReward ? `
            <div class="reward-available">
                <div class="reward-title">🎉 ${data.availableRewards} Reward${data.availableRewards > 1 ? 's' : ''} Available!</div>
                <div class="reward-description">${data.rewardDescription}</div>
                <div class="reward-instructions">
                    Show this to the staff at ${businessName} to redeem your reward${data.availableRewards > 1 ? 's' : ''}!
                </div>
            </div>
        ` : ''}
        <div class="card-footer">
            <div class="last-visit">Last visit: ${formatDate(data.lastVisit)}</div>
            <div class="total-stats">Total visits: ${data.totalVisits} | Rewards earned: ${data.totalEarned}</div>
        </div>
    `;
    return card;
}

// Generate stamp visualization
function generateStamps(visits, required) {
    let stamps = '';
    for (let i = 1; i <= required; i++) {
        const isFilled = i <= visits;
        stamps += `<div class="stamp ${isFilled ? 'filled' : 'empty'}" aria-label="${isFilled ? 'Visit completed' : `Visit ${i} needed`}">
            ${isFilled ? '✓' : i}
        </div>`;
    }
    return stamps;
}

// Business icon mapping with lazy loading
function getBusinessIcon(type) {
    const iconMap = new Map([
        ['salon', '💇‍♀️'],
        ['barber', '💈'],
        ['cafe', '☕'],
        ['restaurant', '🍽️'],
        ['other', '🏪']
    ]);
    
    return iconMap.get(type) || iconMap.get('other');
}

// Improved date formatting
function formatDate(dateString) {
    const date = new Date(dateString);
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
}

// Show no results page
function showNoResults() {
    document.getElementById('lookupSection').style.display = 'none';
    document.getElementById('resultsSection').classList.add('active');
    document.getElementById('customerSummary').style.display = 'none';
    document.getElementById('loyaltyCards').style.display = 'none';
    document.getElementById('noResults').style.display = 'block';
}

// Navigation back to search
function goBack() {
    document.getElementById('lookupSection').style.display = 'block';
    document.getElementById('resultsSection').classList.remove('active');
    document.getElementById('customerSummary').style.display = 'block';
    document.getElementById('loyaltyCards').style.display = 'block';
    document.getElementById('noResults').style.display = 'none';
    document.getElementById('customerPhone').value = '';
    document.getElementById('customerPhone').focus();
}

// Optimized notification system
function showNotification(message, type = 'success') {
    // Clear existing notification timeout
    clearTimeout(notificationTimeout);
    
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
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

// Connection monitoring
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
    clearTimeout(phoneInputTimeout);
    clearTimeout(notificationTimeout);
}

// Event listeners for cleanup and initialization
window.addEventListener('beforeunload', cleanup);

// Auto-focus on phone input when page loads
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('customerPhone').focus();
    
    // Add keyboard navigation support
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const resultsSection = document.getElementById('resultsSection');
            if (resultsSection.classList.contains('active')) {
                goBack();
            }
        }
    });
});

// Optional: Add demo numbers for testing (comment out in production)
// document.addEventListener('DOMContentLoaded', function() {
//     console.log('Demo phone numbers you can try:');
//     console.log('+234 801 234 5678');
//     console.log('+234 817 072 4872');
// });