const SUPABASE_URL = 'https://mhwsjjumsiveahfckcwr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1od3NqanVtc2l2ZWFoZmNrY3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMTc4MTQsImV4cCI6MjA2MzU5MzgxNH0.5varGB23DXpfi1adlwejmYwLlTbbjCPfKGDm9rWEQBo';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true
    }
});

document.getElementById('customerPhone').addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    
    // Format as +234 817 072 4872
    if (value.length > 3) {
        value = `+${value.substring(0, 3)} ${value.substring(3, 6)}`;
    }
    if (value.length > 7) {
        value = `${value.substring(0, 7)} ${value.substring(7, 10)}`;
    }
    if (value.length > 11) {
        value = `${value.substring(0, 11)} ${value.substring(11, 14)}`;
    }
    if (value.length > 15) {
        value = value.substring(0, 15); // Limit to +234 817 072 4872
    }
    
    e.target.value = value;
});

document.getElementById('customerPhone').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        lookupRewards();
    }
});

async function lookupRewards() {
    const phoneInput = document.getElementById('customerPhone').value;
    const phoneNumber = phoneInput.replace(/\D/g, '');
    if (phoneNumber.length < 11 || !phoneNumber.startsWith('234')) {
        showNotification('Please enter a valid Nigerian phone number (+234...)', 'error');
        return;
    }
    const btn = document.querySelector('.btn');
    const btnText = document.getElementById('btnText');
    btn.disabled = true;
    btnText.textContent = 'Searching...';
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
        if (error) throw error;
        if (visits.length === 0) {
            showNoResults();
        } else {
            const customerData = transformVisitData(visits, phoneNumber);
            displayResults(customerData, phoneInput);
        }
    } catch (error) {
        console.error('Lookup error:', error);
        showNotification(error.message || 'Error fetching rewards', 'error');
    } finally {
        btn.disabled = false;
        btnText.textContent = 'Check My Rewards';
    }
}

function transformVisitData(visits, phoneNumber) {
    const businessesMap = {};
    let customerName = '';
    
    visits.forEach(visit => {
        const business = visit.businesses;
        if (!businessesMap[business.name]) {
            businessesMap[business.name] = {
                type: business.type,
                visits: 0,
                visitsRequired: business.loyalty_visits_required,
                rewardDescription: business.loyalty_reward_description,
                lastVisit: visit.created_at,
                totalEarned: 0,
                isRedeemed: visit.is_redeemed_for_reward
            };
        }
        
        // Count visits (only count unredeemed visits toward current progress)
        if (!visit.is_redeemed_for_reward) {
            businessesMap[business.name].visits++;
        }
        
        // Count total rewards earned
        if (visit.is_redeemed_for_reward) {
            businessesMap[business.name].totalEarned++;
        }
        
        // Track most recent name provided
        if (visit.customer_name && !customerName) {
            customerName = visit.customer_name;
        }
        
        // Track most recent visit date
        const currentDate = new Date(visit.created_at);
        const storedDate = new Date(businessesMap[business.name].lastVisit);
        if (currentDate > storedDate) {
            businessesMap[business.name].lastVisit = visit.created_at;
        }
    });

    return {
        name: customerName,
        businesses: businessesMap
    };
}   

function displayResults(customerData, phoneNumber) {
    document.getElementById('lookupSection').style.display = 'none';
    document.getElementById('resultsSection').classList.add('active');

    // Formatting phone number
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    const formattedPhone = cleanNumber.length > 3 
        ? `+${cleanNumber.substring(0, 3)} ${cleanNumber.substring(3, 6)} ${cleanNumber.substring(6, 9)} ${cleanNumber.substring(9, 13)}`
        : phoneNumber;

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
        totalVisits += business.visits;
        earnedRewards += business.totalEarned || 0;
        if (business.visits >= business.visitsRequired) {
            availableRewards++;
        }
    });
    document.getElementById('totalBusinesses').textContent = businesses.length;
    document.getElementById('totalVisits').textContent = totalVisits;
    document.getElementById('availableRewards').textContent = availableRewards;
    document.getElementById('earnedRewards').textContent = earnedRewards;
    generateLoyaltyCards(customerData.businesses);
}

function generateLoyaltyCards(businesses) {
    const container = document.getElementById('loyaltyCards');
    container.innerHTML = '';
    Object.entries(businesses).forEach(([businessName, data]) => {
        const card = createLoyaltyCard(businessName, data);
        container.appendChild(card);
    });
}

function createLoyaltyCard(businessName, data) {
    const card = document.createElement('div');
    card.className = 'loyalty-card';
    const progress = Math.min((data.visits / data.visitsRequired) * 100, 100);
    const hasReward = data.visits >= data.visitsRequired;
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
                <div class="visits-count">${data.visits} visits</div>
                <div class="visits-needed">${data.visitsRequired} needed for reward</div>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
        </div>
        <div class="stamps-visual">
            ${generateStamps(data.visits, data.visitsRequired)}
        </div>
        ${hasReward ? `
            <div class="reward-available">
                <div class="reward-title">🎉 Reward Available!</div>
                <div class="reward-description">${data.rewardDescription}</div>
                <div class="reward-instructions">
                    Show this to the staff at ${businessName} to redeem your reward!
                </div>
            </div>
        ` : ''}
        <div class="last-visit">Last visit: ${formatDate(data.lastVisit)}</div>
    `;
    return card;
}

function generateStamps(visits, required) {
    let stamps = '';
    for (let i = 1; i <= required; i++) {
        const isFilled = i <= visits;
        stamps += `<div class="stamp ${isFilled ? 'filled' : 'empty'}">
            ${isFilled ? '✓' : i}
        </div>`;
    }
    return stamps;
}

function getBusinessIcon(type) {
    const icons = {
        'salon': '💇‍♀️',
        'barber': '💈',
        'cafe': '☕',
        'restaurant': '🍽️',
        'other': '🏪'
    };
    return icons[type] || icons.other;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
}

function showNoResults() {
    document.getElementById('lookupSection').style.display = 'none';
    document.getElementById('resultsSection').classList.add('active');
    document.getElementById('customerSummary').style.display = 'none';
    document.getElementById('loyaltyCards').style.display = 'none';
    document.getElementById('noResults').style.display = 'block';
}

function goBack() {
    document.getElementById('lookupSection').style.display = 'block';
    document.getElementById('resultsSection').classList.remove('active');
    document.getElementById('customerSummary').style.display = 'block';
    document.getElementById('loyaltyCards').style.display = 'block';
    document.getElementById('noResults').style.display = 'none';
    document.getElementById('customerPhone').value = '';
    document.getElementById('customerPhone').focus();
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    notification.classList.add('hide');
    setTimeout(() => {
        notification.remove();
    }, 4000);
}

// Auto-focus on phone input when page loads
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('customerPhone').focus();
});

// Add some demo phone numbers for easy testing
// document.addEventListener('DOMContentLoaded', function() {
//     const demoNumbers = Object.keys(sampleCustomerData);
//     console.log('Demo phone numbers you can try:', demoNumbers.map(num => 
//         num.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')));
// });