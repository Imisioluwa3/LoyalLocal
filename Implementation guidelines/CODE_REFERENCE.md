# LoyalLocal Codebase - Implementation Reference Guide

## Quick Reference: Key Code Sections

### 1. Database Schema Quick Reference

**Businesses Table:**
```sql
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  type TEXT,
  address TEXT,
  loyalty_visits_required INTEGER DEFAULT 5,
  loyalty_reward_description TEXT DEFAULT '50% off next service',
  sms_notifications_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX businesses_user_id_idx ON businesses(user_id);
```

**Visits Table:**
```sql
CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_phone_number TEXT NOT NULL,
  customer_name TEXT,
  is_redeemed_for_reward BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX visits_business_id_idx ON visits(business_id);
CREATE INDEX visits_customer_phone_idx ON visits(customer_phone_number);
CREATE INDEX visits_business_phone_idx ON visits(business_id, customer_phone_number);
```

---

### 2. Key JavaScript Functions - Quick Copy-Paste

#### Business Portal - Login (business/script.js)
```javascript
async function login() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !validateEmail(email)) {
        showNotification('Please enter valid email and password', 'error');
        return;
    }

    showLoading('loginLoading', true);
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;
        showNotification('Login successful!');
        showDashboard();
    } catch (error) {
        showNotification('Login failed: ' + error.message, 'error');
    } finally {
        showLoading('loginLoading', false);
    }
}
```

#### Log Visit (business/script.js)
```javascript
async function logVisit() {
    const phone = document.getElementById('customerPhone').value.trim();
    
    if (!phone || !validatePhoneNumber(phone)) {
        showNotification('Invalid phone number', 'error');
        return;
    }

    try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: business } = await supabase
            .from('businesses')
            .select('*')
            .eq('user_id', user.id)
            .single();

        const normalizedPhone = normalizePhoneNumber(phone);
        
        const { error } = await supabase.from('visits').insert({
            business_id: business.id,
            customer_phone_number: normalizedPhone,
            customer_name: 'Customer',
            is_redeemed_for_reward: false
        });

        if (error) throw error;
        showNotification('Visit logged successfully!');
        lookupCustomer();
        await updateStats(business.id);
    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
    }
}
```

#### Customer Portal - Lookup Rewards (customer/script.js)
```javascript
async function lookupRewards() {
    const phoneInput = document.getElementById('customerPhone');
    const validation = validatePhoneNumber(phoneInput.value);
    
    if (!validation.isValid) {
        showNotification(validation.message, 'error');
        return;
    }

    const btn = document.querySelector('.btn');
    btn.disabled = true;
    btn.textContent = 'Searching...';

    try {
        const phoneVariations = generatePhoneVariations(validation.phoneNumber);
        
        let visits = null;
        for (const phoneVariation of phoneVariations) {
            const { data, error } = await supabase
                .from('visits')
                .select(`*,
                    businesses:business_id (
                        name,
                        type,
                        loyalty_visits_required,
                        loyalty_reward_description
                    )
                `)
                .eq('customer_phone_number', phoneVariation)
                .order('created_at', { ascending: false });

            if (data && data.length > 0) {
                visits = data;
                break;
            }
        }

        if (!visits || visits.length === 0) {
            showNoResults();
        } else {
            const customerData = transformVisitData(visits, validation.phoneNumber);
            displayResults(customerData, phoneInput.value);
        }
    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Check My Rewards';
    }
}
```

#### Transform Visit Data (customer/script.js)
```javascript
function transformVisitData(visits, phoneNumber) {
    const businessesMap = {};
    
    visits.forEach(visit => {
        if (!visit.businesses || !visit.businesses.name) return;

        const business = visit.businesses;
        const businessName = business.name;
        
        if (!businessesMap[businessName]) {
            businessesMap[businessName] = {
                type: business.type || 'other',
                currentVisits: 0,
                totalVisits: 0,
                visitsRequired: business.loyalty_visits_required || 10,
                rewardDescription: business.loyalty_reward_description || 'Free service',
                lastVisit: visit.created_at,
                totalEarned: 0,
                availableRewards: 0
            };
        }
        
        const businessData = businessesMap[businessName];
        businessData.totalVisits++;
        
        if (visit.is_redeemed_for_reward) {
            businessData.totalEarned++;
        } else {
            businessData.currentVisits++;
        }
        
        businessData.availableRewards = Math.floor(
            businessData.currentVisits / businessData.visitsRequired
        );
    });

    return { businesses: businessesMap };
}
```

#### Phone Validation (utils/phone.js)
```javascript
function validatePhoneNumber(phone) {
    const digits = phone.replace(/\D/g, '');

    let prefix;
    if (digits.length === 11 && digits.startsWith('0')) {
        prefix = digits.substring(1, 4);
    } else if (digits.length === 10 && !digits.startsWith('0')) {
        prefix = digits.substring(0, 3);
    } else if (digits.length === 13 && digits.startsWith('234')) {
        prefix = digits.substring(3, 6);
    } else {
        return {
            isValid: false,
            message: 'Phone number must be 10-11 digits'
        };
    }

    if (!isValidNigerianPrefix(prefix)) {
        return {
            isValid: false,
            message: 'Invalid Nigerian phone number prefix'
        };
    }

    return {
        isValid: true,
        phoneNumber: normalizePhoneNumber(phone)
    };
}

function normalizePhoneNumber(phone) {
    const digits = phone.replace(/\D/g, '');
    
    if (digits.length === 11 && digits.startsWith('0')) {
        return `+234${digits.substring(1)}`;
    } else if (digits.length === 10) {
        return `+234${digits}`;
    } else if (digits.length === 13 && digits.startsWith('234')) {
        return `+${digits}`;
    }
    return phone;
}
```

---

### 3. HTML Structure Examples

#### Business Dashboard Stats (business/index.html)
```html
<div id="overviewSection">
    <div class="stats-grid">
        <div class="stat-card">
            <span class="stat-number" id="totalCustomers">0</span>
            <div class="stat-label">Total Customers</div>
        </div>
        <div class="stat-card">
            <span class="stat-number" id="visitsToday">0</span>
            <div class="stat-label">Visits Today</div>
        </div>
        <div class="stat-card">
            <span class="stat-number" id="rewardsRedeemed">0</span>
            <div class="stat-label">Rewards Redeemed</div>
        </div>
        <div class="stat-card">
            <span class="stat-number" id="rewardsEarned">0</span>
            <div class="stat-label">Rewards Earned</div>
        </div>
    </div>
</div>
```

#### Customer Loyalty Card (customer/index.html)
```html
<div id="loyaltyCards"></div>

<script>
function createLoyaltyCard(businessName, data) {
    const card = document.createElement('div');
    card.className = 'loyalty-card';
    
    const visitsRequired = data.visitsRequired || 10;
    const currentVisits = data.currentVisits || 0;
    const progress = Math.min((currentVisits / visitsRequired) * 100, 100);
    const hasReward = data.availableRewards > 0;
    
    card.innerHTML = `
        <div class="business-header">
            <h3>${businessName}</h3>
            <div class="business-type">${data.type}</div>
        </div>
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
        <p>${currentVisits} of ${visitsRequired} visits</p>
        ${hasReward ? `<div class="reward-available">🎉 ${data.availableRewards} Reward Available!</div>` : ''}
    `;
    
    return card;
}
</script>
```

---

### 4. Database Query Patterns

#### Get Business Stats
```javascript
async function updateStats(businessId) {
    // Total unique customers
    const { data: uniqueCustomers } = await supabase
        .from('visits')
        .select('customer_phone_number')
        .eq('business_id', businessId);
    const totalCustomers = new Set(
        uniqueCustomers?.map(v => v.customer_phone_number) || []
    ).size;

    // Visits today
    const today = new Date().toISOString().split('T')[0];
    const { count: visitsToday } = await supabase
        .from('visits')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .gte('created_at', today);

    // Rewards redeemed
    const { count: rewardsRedeemed } = await supabase
        .from('visits')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('is_redeemed_for_reward', true);

    document.getElementById('totalCustomers').textContent = totalCustomers || 0;
    document.getElementById('visitsToday').textContent = visitsToday || 0;
    document.getElementById('rewardsRedeemed').textContent = rewardsRedeemed || 0;
}
```

#### Look Up Customer
```javascript
async function lookupCustomer() {
    const phone = document.getElementById('customerPhone').value.trim();
    const normalizedPhone = normalizePhoneNumber(phone);
    
    const { data: business } = await supabase
        .from('businesses')
        .select('*')
        .eq('user_id', user.id)
        .single();

    const { data: visits } = await supabase
        .from('visits')
        .select('*')
        .eq('business_id', business.id)
        .eq('customer_phone_number', normalizedPhone)
        .order('created_at', { ascending: false });

    if (visits.length > 0) {
        displayCustomer(visits, business, normalizedPhone);
    } else {
        showNewCustomerForm(normalizedPhone);
    }
}
```

#### Redeem Reward
```javascript
async function redeemReward() {
    const phone = normalizePhoneNumber(customerPhone);
    
    // Get unredeemed visits needed for reward
    const { data: visits } = await supabase
        .from('visits')
        .select('*')
        .eq('business_id', business.id)
        .eq('customer_phone_number', phone)
        .eq('is_redeemed_for_reward', false)
        .order('created_at', { ascending: true })
        .limit(business.loyalty_visits_required);

    if (visits.length >= business.loyalty_visits_required) {
        const visitIds = visits
            .slice(0, business.loyalty_visits_required)
            .map(v => v.id);
        
        await supabase
            .from('visits')
            .update({ is_redeemed_for_reward: true })
            .in('id', visitIds);
    }
}
```

---

### 5. CSS Utility Classes

#### Flex Grid Layout
```css
.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin: 20px 0;
}

.stat-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 20px;
    border-radius: 12px;
    text-align: center;
    color: white;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
```

#### Progress Bar
```css
.progress-bar {
    width: 100%;
    height: 8px;
    background: #e1e5e9;
    border-radius: 4px;
    overflow: hidden;
    margin: 10px 0;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
    transition: width 0.3s ease;
}
```

---

### 6. Form Validation Patterns

#### Email Validation
```javascript
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
```

#### Error Display
```javascript
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
    
    notificationText.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
}
```

---

### 7. Configuration Template

#### config.example.js
```javascript
export const config = {
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseAnonKey: 'your-anon-key-here',
  supabaseAuthConfig: {
    persistSession: true,
    autoRefreshToken: true
  }
};

// Usage in scripts:
import { config } from './config.js';
const supabase = window.supabase.createClient(
  config.supabaseUrl,
  config.supabaseAnonKey,
  { auth: config.supabaseAuthConfig }
);
```

---

### 8. Supabase Initialization

```javascript
// Initialize Supabase client
const SUPABASE_URL = 'https://mhwsjjumsiveahfckcwr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true
        }
    }
);

// Check and restore session
document.addEventListener('DOMContentLoaded', function() {
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            showDashboard();
        }
    });

    // Listen for auth changes
    supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth changed:', event);
        if (event === 'SIGNED_IN') {
            showDashboard();
        } else if (event === 'SIGNED_OUT') {
            showAuthForm();
        }
    });
});
```

---

## File Modification Guide for New Features

### Adding Analytics Dashboard
1. Create `/analytics/` directory
2. Copy structure from `/business/` (html, script, css)
3. Add new query functions to fetch time-series data
4. Include Chart.js library
5. Create aggregation functions for metrics

### Adding Customer Profiles
1. Create `/customer-profile/` directory
2. Use phone number as lookup key
3. Create customer detail view template
4. Add visit history timeline
5. Implement customer communication panel

### Adding Bulk Operations
1. Create `/bulk-operations/` directory
2. Add CSV parser utility
3. Create form for file upload
4. Implement batch insert/update logic
5. Create progress tracking UI

