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
let currentBusinessesData = null; // Store current data for filtering/sorting

// Phone number validation and formatting using PhoneUtils
document.addEventListener('DOMContentLoaded', function() {
    // Load dark mode preference
    loadDarkModePreference();

    const phoneInput = document.getElementById('customerPhone');

    phoneInput.addEventListener('input', function(e) {
        clearTimeout(phoneInputTimeout);

        phoneInputTimeout = setTimeout(() => {
            // Use the PhoneUtils autoFormatPhoneInput function
            e.target.value = PhoneUtils.autoFormatPhoneInput(e.target.value);
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

    // Setup filter and sort event listeners
    setupFilterAndSortListeners();
});

// Setup filter and sort event listeners
function setupFilterAndSortListeners() {
    // Filter buttons
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('filter-btn')) {
            // Update active state
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');

            // Apply filter
            const filterType = e.target.getAttribute('data-filter');
            filterCards(filterType);
        }
    });

    // Sort select
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            sortCards(this.value);
        });
    }
}

// Phone number validation function - now uses PhoneUtils
function validatePhoneNumber(phoneInput) {
    return PhoneUtils.validatePhoneNumber(phoneInput);
}

// Show skeleton loading cards
function showSkeletonLoading() {
    const lookupSection = document.getElementById('lookupSection');
    const resultsSection = document.getElementById('resultsSection');
    const loyaltyCards = document.getElementById('loyaltyCards');
    const customerSummary = document.getElementById('customerSummary');
    const cardsControls = document.querySelector('.cards-controls');
    const activityTimeline = document.getElementById('activityTimeline');

    if (lookupSection) lookupSection.style.display = 'none';
    if (resultsSection) resultsSection.classList.add('active');
    if (customerSummary) customerSummary.style.display = 'none';
    if (cardsControls) cardsControls.style.display = 'none';
    if (activityTimeline) activityTimeline.style.display = 'none';

    // Create skeleton cards
    if (loyaltyCards) {
        const skeletonHTML = Array(3).fill(0).map(() => `
            <div class="skeleton-card">
                <div class="skeleton-header">
                    <div class="skeleton skeleton-icon"></div>
                    <div class="skeleton-text">
                        <div class="skeleton skeleton-title"></div>
                        <div class="skeleton skeleton-subtitle"></div>
                    </div>
                </div>
                <div class="skeleton skeleton-progress"></div>
                <div class="skeleton-stamps">
                    ${Array(6).fill('<div class="skeleton skeleton-stamp"></div>').join('')}
                </div>
                <div class="skeleton skeleton-footer"></div>
            </div>
        `).join('');

        loyaltyCards.innerHTML = skeletonHTML;
    }
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

    // Show skeleton loading
    showSkeletonLoading();

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

// Generate different phone number format variations for flexible matching - now uses PhoneUtils
function generatePhoneVariations(phoneNumber) {
    return PhoneUtils.generatePhoneVariations(phoneNumber);
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
                rewardValue: business.reward_value || 2000, // Monetary value of reward
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
    const customerSummary = document.getElementById('customerSummary');
    const cardsControls = document.querySelector('.cards-controls');

    if (!lookupSection || !resultsSection) {
        console.error('Required sections not found');
        return;
    }

    lookupSection.style.display = 'none';
    resultsSection.classList.add('active');

    // Show customer summary and controls (they were hidden during skeleton loading)
    if (customerSummary) customerSummary.style.display = 'block';
    if (cardsControls) cardsControls.style.display = 'flex';

    // Show activity timeline
    const activityTimeline = document.getElementById('activityTimeline');
    if (activityTimeline) activityTimeline.style.display = 'block';

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
    let valueSaved = 0;

    businesses.forEach(businessName => {
        const business = customerData.businesses[businessName];
        totalVisits += business.totalVisits;
        earnedRewards += business.totalEarned;
        availableRewards += business.availableRewards;

        // Calculate value saved using business-specific reward value
        const rewardValue = business.rewardValue || 2000;
        valueSaved += (business.totalEarned + business.availableRewards) * rewardValue;
    });

    // Update summary stats with null checks
    updateElementText('totalBusinesses', businesses.length);
    updateElementText('totalVisits', totalVisits);
    updateElementText('availableRewards', availableRewards);
    updateElementText('earnedRewards', earnedRewards);
    updateElementText('valueSaved', `₦${valueSaved.toLocaleString()}`);

    // Store current data for filtering/sorting
    currentBusinessesData = customerData.businesses;

    // Phase 2: Generate achievements and timeline
    const achievements = calculateAchievements(customerData);
    displayAchievements(achievements);
    generateTimeline(customerData);

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

    // Check if "almost there" (1-2 visits away from next reward)
    const visitsNeeded = visitsRequired - visitsForProgress;
    const isAlmostThere = !hasReward && visitsNeeded > 0 && visitsNeeded <= 2;

    // Add data attributes for filtering/sorting
    card.setAttribute('data-business-name', businessName);
    card.setAttribute('data-has-reward', hasReward ? 'true' : 'false');
    card.setAttribute('data-almost-there', isAlmostThere ? 'true' : 'false');
    card.setAttribute('data-progress', progress.toFixed(2));
    card.setAttribute('data-last-visit', data.lastVisit);
    card.setAttribute('data-total-visits', data.totalVisits);
    card.setAttribute('data-available-rewards', availableRewards);

    card.innerHTML = `
        ${isAlmostThere ? `<div class="almost-there-badge">⚡ ${visitsNeeded} more visit${visitsNeeded > 1 ? 's' : ''} to reward!</div>` : ''}
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

// Filter cards based on selected filter
function filterCards(filterType) {
    const cards = document.querySelectorAll('.loyalty-card');

    cards.forEach(card => {
        const hasReward = card.getAttribute('data-has-reward') === 'true';
        const isAlmostThere = card.getAttribute('data-almost-there') === 'true';

        let shouldShow = false;

        switch (filterType) {
            case 'all':
                shouldShow = true;
                break;
            case 'ready':
                shouldShow = hasReward;
                break;
            case 'almost':
                shouldShow = isAlmostThere;
                break;
            default:
                shouldShow = true;
        }

        if (shouldShow) {
            card.classList.remove('hidden');
        } else {
            card.classList.add('hidden');
        }
    });
}

// Sort cards based on selected criterion
function sortCards(sortType) {
    const container = document.getElementById('loyaltyCards');
    if (!container) return;

    const cards = Array.from(document.querySelectorAll('.loyalty-card'));

    cards.sort((a, b) => {
        switch (sortType) {
            case 'rewards': {
                const aRewards = parseInt(a.getAttribute('data-available-rewards')) || 0;
                const bRewards = parseInt(b.getAttribute('data-available-rewards')) || 0;
                return bRewards - aRewards; // Descending
            }
            case 'progress': {
                const aProgress = parseFloat(a.getAttribute('data-progress')) || 0;
                const bProgress = parseFloat(b.getAttribute('data-progress')) || 0;
                return bProgress - aProgress; // Descending
            }
            case 'recent': {
                const aDate = new Date(a.getAttribute('data-last-visit'));
                const bDate = new Date(b.getAttribute('data-last-visit'));
                return bDate - aDate; // Most recent first
            }
            case 'visits': {
                const aVisits = parseInt(a.getAttribute('data-total-visits')) || 0;
                const bVisits = parseInt(b.getAttribute('data-total-visits')) || 0;
                return bVisits - aVisits; // Descending
            }
            default:
                return 0;
        }
    });

    // Re-append cards in sorted order
    cards.forEach(card => container.appendChild(card));
}

/* ============================================
   PHASE 2: DARK MODE, ACHIEVEMENTS, TIMELINE
   ============================================ */

// Dark Mode Functions
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');

    // Update icon
    const themeIcon = document.querySelector('.theme-icon');
    if (themeIcon) {
        themeIcon.textContent = isDark ? '☀️' : '🌙';
    }

    // Save preference
    localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
}

function loadDarkModePreference() {
    const darkMode = localStorage.getItem('darkMode');
    if (darkMode === 'enabled') {
        document.body.classList.add('dark-mode');
        // Update icon if on results page
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            themeIcon.textContent = '☀️';
        }
    }
}

// Achievement Badges System
function calculateAchievements(customerData) {
    const achievements = [];
    const businesses = Object.keys(customerData.businesses);

    // Calculate total stats
    let totalVisits = 0;
    let totalRewards = 0;
    let hasRewardReady = false;

    businesses.forEach(businessName => {
        const business = customerData.businesses[businessName];
        totalVisits += business.totalVisits;
        totalRewards += business.totalEarned;
        if (business.availableRewards > 0) hasRewardReady = true;
    });

    // First Visit Achievement
    if (totalVisits === 1) {
        achievements.push({ icon: '🌟', text: 'First Visit' });
    }

    // VIP Status (10+ visits)
    if (totalVisits >= 10) {
        achievements.push({ icon: '💎', text: 'VIP Member' });
    }

    // Multi-Business Loyalty (3+ businesses)
    if (businesses.length >= 3) {
        achievements.push({ icon: '🎯', text: 'Multi-Loyalist' });
    }

    // Reward Collector (5+ rewards earned)
    if (totalRewards >= 5) {
        achievements.push({ icon: '🏆', text: 'Reward Collector' });
    }

    // Active Member (reward ready)
    if (hasRewardReady) {
        achievements.push({ icon: '🎉', text: 'Reward Ready!' });
    }

    // Super Loyal (30+ total visits)
    if (totalVisits >= 30) {
        achievements.push({ icon: '⭐', text: 'Super Loyal' });
    }

    return achievements;
}

function displayAchievements(achievements) {
    const container = document.getElementById('achievementBadges');
    if (!container) return;

    if (achievements.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'flex';
    container.innerHTML = achievements.map(achievement => `
        <div class="achievement-badge">
            <span class="badge-icon">${achievement.icon}</span>
            <span>${achievement.text}</span>
        </div>
    `).join('');
}

// Activity Timeline Generation
function generateTimeline(customerData) {
    const container = document.getElementById('timelineContent');
    if (!container) return;

    // Collect all visits from all businesses
    const allVisits = [];
    Object.entries(customerData.businesses).forEach(([businessName, business]) => {
        // Create visit entries (we don't have individual visit data, so we'll create summary)
        allVisits.push({
            businessName: businessName,
            lastVisit: business.lastVisit,
            totalVisits: business.totalVisits,
            totalEarned: business.totalEarned,
            availableRewards: business.availableRewards
        });
    });

    // Sort by most recent
    allVisits.sort((a, b) => new Date(b.lastVisit) - new Date(a.lastVisit));

    // Show only top 5 recent activities
    const recentVisits = allVisits.slice(0, 5);

    if (recentVisits.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No recent activity</p>';
        return;
    }

    container.innerHTML = recentVisits.map(visit => {
        const hasReward = visit.availableRewards > 0;
        return `
            <div class="timeline-item">
                <div class="timeline-date">${formatDate(visit.lastVisit)}</div>
                <div class="timeline-event">Visit #${visit.totalVisits}</div>
                <div class="timeline-business">${escapeHtml(visit.businessName)}</div>
                ${hasReward ? `<div class="timeline-reward">🎁 ${visit.availableRewards} Reward${visit.availableRewards > 1 ? 's' : ''} Available!</div>` : ''}
            </div>
        `;
    }).join('');
}

// Show no results page with improved error handling
function showNoResults() {
    const lookupSection = document.getElementById('lookupSection');
    const resultsSection = document.getElementById('resultsSection');
    const customerSummary = document.getElementById('customerSummary');
    const loyaltyCards = document.getElementById('loyaltyCards');
    const noResults = document.getElementById('noResults');
    const cardsControls = document.querySelector('.cards-controls');
    const activityTimeline = document.getElementById('activityTimeline');

    if (lookupSection) lookupSection.style.display = 'none';
    if (resultsSection) resultsSection.classList.add('active');
    if (customerSummary) customerSummary.style.display = 'none';
    if (loyaltyCards) loyaltyCards.style.display = 'none';
    if (noResults) noResults.style.display = 'block';
    if (cardsControls) cardsControls.style.display = 'none';
    if (activityTimeline) activityTimeline.style.display = 'none';
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