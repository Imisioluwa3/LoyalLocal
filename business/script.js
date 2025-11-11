// Initialize Supabase
const SUPABASE_URL = 'https://mhwsjjumsiveahfckcwr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1od3NqanVtc2l2ZWFoZmNrY3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMTc4MTQsImV4cCI6MjA2MzU5MzgxNH0.5varGB23DXpfi1adlwejmYwLlTbbjCPfKGDm9rWEQBo';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true
    }
});

// Global state
let currentBusiness = null;

document.addEventListener('DOMContentLoaded', function() {
    
    if (typeof supabase === 'undefined') {
        console.error('Supabase not loaded! Check script order.');
        showNotification('System error: Database connection failed', 'error');
        return;
    }
    
    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            console.log('Existing session found, showing dashboard');
            showDashboard();
        }
    });

    // Auth state listener
    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event, session);
        
        if (event === 'SIGNED_IN' && session) {
            try {
                // Check if business record exists
                const { data: business, error } = await supabase
                    .from('businesses')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .single();

                if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
                    console.error('Error fetching business:', error);
                    throw error;
                }

                // If no business record exists, create it from user metadata
                if (!business && session.user.user_metadata) {
                    const metadata = session.user.user_metadata;
                    if (metadata.business_name) {
                        console.log('Creating business record from metadata...');
                        
                        const { error: businessError } = await supabase
                            .from('businesses')
                            .insert({
                                user_id: session.user.id,
                                name: metadata.business_name,
                                type: metadata.business_type,
                                address: metadata.business_address,
                                loyalty_visits_required: 5,
                                loyalty_reward_description: '50% off next service',
                                sms_notifications_enabled: true
                            });

                        if (businessError) {
                            console.error('Error creating business record:', businessError);
                            throw businessError;
                        }
                    }
                }
                
                showDashboard();
            } catch (error) {
                console.error('Error in auth state change:', error);
                showNotification('Error loading dashboard: ' + error.message, 'error');
            }
        } else if (event === 'SIGNED_OUT') {
            document.getElementById('dashboardSection').classList.remove('active');
            document.getElementById('authSection').style.display = 'block';
            currentBusiness = null;
        }
    });
});

// Enhanced Nigerian Phone Number Utility Functions - now using PhoneUtils
function normalizePhoneNumber(phone) {
    return PhoneUtils.normalizePhoneNumber(phone);
}

function formatPhoneNumber(phone, format) {
    return PhoneUtils.formatPhoneNumber(phone, format);
}

function validatePhoneNumber(phone) {
    const result = PhoneUtils.validatePhoneNumber(phone);
    return result.isValid;
}

function isValidNigerianPrefix(prefix) {
    return PhoneUtils.isValidNigerianPrefix(prefix);
}

function validateEmail(email) {
    return PhoneUtils.validateEmail(email);
}

function showLoading(elementId, show = true) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = show ? 'block' : 'none';
    }
}

function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
    
    if (!notification || !notificationText) {
        console.log('Notification:', message);
        return;
    }
    
    notificationText.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
}

// Tab Switching
function switchTab(tabName) {
    const tabs = document.querySelectorAll('.tab');
    const forms = document.querySelectorAll('#loginForm, #registerForm');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    forms.forEach(form => form.style.display = 'none');
    
    if (tabName === 'login') {
        document.querySelector('.tab').classList.add('active');
        document.getElementById('loginForm').style.display = 'block';
    } else {
        document.querySelectorAll('.tab')[1].classList.add('active');
        document.getElementById('registerForm').style.display = 'block';
    }
}

// Navigation
function showSection(sectionName) {
    const navBtns = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('#overviewSection, #customersSection, #settingsSection');
    
    navBtns.forEach(btn => btn.classList.remove('active'));
    sections.forEach(section => section.style.display = 'none');
    
    document.querySelector(`[onclick="showSection('${sectionName}')"]`).classList.add('active');
    document.getElementById(`${sectionName}Section`).style.display = 'block';
    
    if (sectionName === 'overview' && currentBusiness) {
        updateStats(currentBusiness.id);
    }
}

// Authentication Functions
async function register() {
    const businessName = document.getElementById('businessName').value.trim();
    const businessType = document.getElementById('businessType').value;
    const businessEmail = document.getElementById('businessEmail').value.trim();
    const businessPassword = document.getElementById('businessPassword').value;
    const businessAddress = document.getElementById('businessAddress').value.trim();

    // Clear previous errors
    document.querySelectorAll('.form-group').forEach(group => group.classList.remove('invalid'));

    // Validate inputs
    let hasErrors = false;
    
    if (!businessName) {
        document.getElementById('businessName').closest('.form-group').classList.add('invalid');
        hasErrors = true;
    }
    
    if (!businessType) {
        document.getElementById('businessType').closest('.form-group').classList.add('invalid');
        hasErrors = true;
    }
    
    if (!businessEmail || !validateEmail(businessEmail)) {
        document.getElementById('businessEmail').closest('.form-group').classList.add('invalid');
        hasErrors = true;
    }
    
    if (!businessPassword || businessPassword.length < 6) {
        document.getElementById('businessPassword').closest('.form-group').classList.add('invalid');
        hasErrors = true;
    }
    
    if (!businessAddress) {
        document.getElementById('businessAddress').closest('.form-group').classList.add('invalid');
        hasErrors = true;
    }

    if (hasErrors) {
        showNotification('Please fill in all fields correctly', 'error');
        return;
    }

    showLoading('registerLoading', true);

    try {
        console.log('Starting registration process...');
        
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: businessEmail,
            password: businessPassword,
            options: {
                data: {
                    business_name: businessName,
                    business_type: businessType,
                    business_address: businessAddress
                }
            }
        });

        if (authError) {
            console.error('Auth error:', authError);
            throw authError;
        }

        console.log('Auth data:', authData);

        if (authData.user && !authData.user.email_confirmed_at && !authData.session) {
            showNotification('Please check your email and click the confirmation link to complete registration.', 'success');
            return;
        }

        if (authData.session && authData.user) {
            console.log('User signed in, creating business record...');
            
            const { error: businessError } = await supabase
                .from('businesses')
                .insert({
                    user_id: authData.user.id,
                    name: businessName,
                    type: businessType,
                    address: businessAddress,
                    loyalty_visits_required: 5,
                    loyalty_reward_description: '50% off next service',
                    sms_notifications_enabled: true
                });

            if (businessError) {
                console.error('Business creation error:', businessError);
                throw businessError;
            }

            showNotification('Registration successful!');
            showDashboard();
        }

    } catch (error) {
        console.error('Registration error:', error);
        let errorMessage = 'Registration failed. Please try again.';
        
        if (error.message.includes('already registered')) {
            errorMessage = 'This email is already registered. Please use the login tab.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showNotification(errorMessage, 'error');
    } finally {
        showLoading('registerLoading', false);
    }
}

async function login() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    // Clear previous errors
    document.querySelectorAll('#loginForm .form-group').forEach(group => group.classList.remove('invalid'));

    // Validate inputs
    let hasErrors = false;
    
    if (!email || !validateEmail(email)) {
        document.getElementById('loginEmail').closest('.form-group').classList.add('invalid');
        hasErrors = true;
    }
    
    if (!password) {
        document.getElementById('loginPassword').closest('.form-group').classList.add('invalid');
        hasErrors = true;
    }

    if (hasErrors) {
        showNotification('Please enter valid email and password', 'error');
        return;
    }

    showLoading('loginLoading', true);

    try {
        console.log('Attempting login for:', email);
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            console.error('Login error:', error);
            throw error;
        }

        console.log('Login successful:', data);
        showNotification('Login successful!');
        showDashboard();

    } catch (error) {
        console.error('Login failed:', error);
        
        let errorMessage = 'Login failed. Please try again.';
        if (error.message.includes('Invalid login credentials')) {
            errorMessage = 'Invalid email or password. Please check your credentials.';
        } else if (error.message.includes('Email not confirmed')) {
            errorMessage = 'Please confirm your email address before logging in.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showNotification(errorMessage, 'error');
    } finally {
        showLoading('loginLoading', false);
    }
}

async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        // Reset UI
        document.getElementById('dashboardSection').classList.remove('active');
        document.getElementById('authSection').style.display = 'block';
        
        // Clear any displayed customer data
        document.getElementById('customerDisplay').style.display = 'none';
        document.getElementById('newCustomerForm').style.display = 'none';
        document.getElementById('customerPhone').value = '';
        
        // Reset to overview section
        showSection('overview');
        
        currentBusiness = null;
        showNotification('Logged out successfully');
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Error logging out: ' + error.message, 'error');
    }
}

async function showDashboard() {
    try {
        console.log('Showing dashboard...');
        showLoading('dashboardLoading', true);
        
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
            console.error('Error getting user:', userError);
            throw userError;
        }
        
        if (!user) {
            console.error('No user found');
            throw new Error('No authenticated user found');
        }

        console.log('Current user:', user.id);

        const { data: business, error: businessError } = await supabase
            .from('businesses')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (businessError) {
            console.error('Error fetching business:', businessError);
            if (businessError.code === 'PGRST116') {
                showNotification('No business record found. Please contact support.', 'error');
                return;
            }
            throw businessError;
        }

        if (!business) {
            console.error('No business data returned');
            throw new Error('No business data found');
        }

        console.log('Business data:', business);
        currentBusiness = business;

        // Update UI
        document.getElementById('authSection').style.display = 'none';
        document.getElementById('dashboardSection').classList.add('active');
        document.getElementById('businessNameDisplay').textContent = `Welcome, ${business.name}!`;
        
        // Load settings and stats
        loadSettings(business);
        await updateStats(business.id);
        
        // Show overview section by default
        showSection('overview');
        
        console.log('Dashboard loaded successfully');
    } catch (error) {
        console.error('Error showing dashboard:', error);
        showNotification('Error loading dashboard: ' + error.message, 'error');
    } finally {
        showLoading('dashboardLoading', false);
    }
}

// Dashboard Functions
async function updateStats(businessId) {
    try {
        console.log('Updating stats for business:', businessId);
        
        // Total Customers (unique phone numbers)
        const { data: uniqueCustomers, error: customersError } = await supabase
            .from('visits')
            .select('customer_phone_number')
            .eq('business_id', businessId);

        if (customersError) throw customersError;

        const totalCustomers = new Set(uniqueCustomers?.map(v => v.customer_phone_number) || []).size;

        // Visits Today
        const today = new Date().toISOString().split('T')[0];
        const { count: visitsToday, error: visitsError } = await supabase
            .from('visits')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', businessId)
            .gte('created_at', today);

        if (visitsError) throw visitsError;

        // Rewards Redeemed
        const { count: rewardsRedeemed, error: rewardsError } = await supabase
            .from('visits')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', businessId)
            .eq('is_redeemed_for_reward', true);

        if (rewardsError) throw rewardsError;

        // Rewards Earned
        const { data: business } = await supabase
            .from('businesses')
            .select('loyalty_visits_required')
            .eq('id', businessId)
            .single();

        const { data: allVisits, error: allVisitsError } = await supabase
            .from('visits')
            .select('customer_phone_number, is_redeemed_for_reward')
            .eq('business_id', businessId);

        if (allVisitsError) throw allVisitsError;

        // Group visits by customer and count unredeemed visits
        const customerVisits = {};
        allVisits?.forEach(visit => {
            if (!customerVisits[visit.customer_phone_number]) {
                customerVisits[visit.customer_phone_number] = 0;
            }
            if (!visit.is_redeemed_for_reward) {
                customerVisits[visit.customer_phone_number]++;
            }
        });

        // Count customers with enough visits for a reward
        const rewardsEarned = Object.values(customerVisits).filter(
            visitCount => visitCount >= (business?.loyalty_visits_required || 5)
        ).length;

        // Update UI
        document.getElementById('totalCustomers').textContent = totalCustomers || 0;
        document.getElementById('visitsToday').textContent = visitsToday || 0;
        document.getElementById('rewardsRedeemed').textContent = rewardsRedeemed || 0;
        document.getElementById('rewardsEarned').textContent = rewardsEarned || 0;
        
        console.log('Stats updated:', { totalCustomers, visitsToday, rewardsRedeemed, rewardsEarned });
    } catch (error) {
        console.error('Error updating stats:', error);
        showNotification('Error loading statistics: ' + error.message, 'error');
    }
}

// Customer Management
async function lookupCustomer() {
    const phone = document.getElementById('customerPhone').value.trim();
    
    // Hide previous error
    document.querySelector('.phone-error').style.display = 'none';
    
    if (!phone) {
        document.querySelector('.phone-error').textContent = 'Please enter a phone number';
        document.querySelector('.phone-error').style.display = 'block';
        return;
    }

    if (!validatePhoneNumber(phone)) {
        document.querySelector('.phone-error').textContent = 'Please enter a valid Nigerian phone number (e.g., 08012345678)';
        document.querySelector('.phone-error').style.display = 'block';
        return;
    }

    showLoading('customerLoading', true);

    try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: business } = await supabase
            .from('businesses')
            .select('*')
            .eq('user_id', user.id)
            .single();

        const normalizedPhone = normalizePhoneNumber(phone);
        const { data: visits, error } = await supabase
            .from('visits')
            .select('*')
            .eq('business_id', business.id)
            .eq('customer_phone_number', normalizedPhone)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (visits.length > 0) {
            displayCustomer(visits, business, normalizedPhone);
        } else {
            showNewCustomerForm(normalizedPhone);
        }
    } catch (error) {
        console.error('Error looking up customer:', error);
        showNotification('Error looking up customer: ' + error.message, 'error');
    } finally {
        showLoading('customerLoading', false);
    }
}

function displayCustomer(visits, business, phone) {
    const visitCount = visits.filter(v => !v.is_redeemed_for_reward).length;
    const requiredVisits = business.loyalty_visits_required;
    const customerName = visits[0]?.customer_name || 'Customer';
    
    document.getElementById('customerName').textContent = customerName;
    document.getElementById('customerPhoneDisplay').textContent = `Phone: ${formatPhoneNumber(phone)}`;
    document.getElementById('visitCount').textContent = `Visits: ${visitCount}`;
    document.getElementById('progressText').textContent = 
        `${visitCount} of ${requiredVisits} visits towards reward`;
    document.getElementById('progressFill').style.width = 
        `${Math.min((visitCount / requiredVisits) * 100, 100)}%`;
    
    document.getElementById('customerDisplay').style.display = 'block';
    document.getElementById('newCustomerForm').style.display = 'none';
    
    if (visitCount >= requiredVisits) {
        document.getElementById('rewardSection').style.display = 'block';
        document.getElementById('rewardDescription').textContent = business.loyalty_reward_description;
    } else {
        document.getElementById('rewardSection').style.display = 'none';
    }
}

function showNewCustomerForm(phone) {
    document.getElementById('customerDisplay').style.display = 'none';
    document.getElementById('newCustomerForm').style.display = 'block';
    
    // Clear previous name input
    document.getElementById('newCustomerName').value = '';
}

async function addNewCustomer() {
    const phone = document.getElementById('customerPhone').value.trim();
    const name = document.getElementById('newCustomerName').value.trim() || 'Customer';
    
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
        
        // Add first visit
        const { error } = await supabase
            .from('visits')
            .insert({
                business_id: business.id,
                customer_phone_number: normalizedPhone,
                customer_name: name,
                is_redeemed_for_reward: false
            });

        if (error) throw error;

        showNotification(`New customer ${name} added with their first visit!`);
        
        // Refresh customer display
        lookupCustomer();
        
        // Update stats
        await updateStats(business.id);
        
    } catch (error) {
        console.error('Error adding new customer:', error);
        showNotification('Error adding customer: ' + error.message, 'error');
    }
}

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
        
        // Get customer name from existing visits
        const { data: existingVisits } = await supabase
            .from('visits')
            .select('customer_name')
            .eq('business_id', business.id)
            .eq('customer_phone_number', normalizedPhone)
            .limit(1);

        const customerName = existingVisits?.[0]?.customer_name || 'Customer';
        
        // Add new visit
        const { error } = await supabase
            .from('visits')
            .insert({
                business_id: business.id,
                customer_phone_number: normalizedPhone,
                customer_name: customerName,
                is_redeemed_for_reward: false
            });

        if (error) throw error;

        showNotification('Visit logged successfully!');
        
        // Refresh customer display
        lookupCustomer();
        
        // Update stats
        await updateStats(business.id);
        
    } catch (error) {
        console.error('Error logging visit:', error);
        showNotification('Error logging visit: ' + error.message, 'error');
    }
}

async function redeemReward() {
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
        
        // Get unredeemed visits
        const { data: visits, error: visitsError } = await supabase
            .from('visits')
            .select('*')
            .eq('business_id', business.id)
            .eq('customer_phone_number', normalizedPhone)
            .eq('is_redeemed_for_reward', false)
            .order('created_at', { ascending: true })
            .limit(business.loyalty_visits_required);

        if (visitsError) throw visitsError;

        if (visits.length < business.loyalty_visits_required) {
            showNotification('Not enough visits for reward', 'error');
            return;
        }

        // Mark the required number of visits as redeemed
        const visitIds = visits.slice(0, business.loyalty_visits_required).map(v => v.id);
        
        const { error: updateError } = await supabase
            .from('visits')
            .update({ is_redeemed_for_reward: true })
            .in('id', visitIds);

        if (updateError) throw updateError;

        showNotification('Reward redeemed successfully!');
        
        // Refresh customer display
        lookupCustomer();
        
        // Update stats
        await updateStats(business.id);
        
    } catch (error) {
        console.error('Error redeeming reward:', error);
        showNotification('Error redeeming reward: ' + error.message, 'error');
    }
}

// Settings Functions
function loadSettings(business) {
    document.getElementById('visitsRequired').value = business.loyalty_visits_required || 5;
    document.getElementById('rewardDescription').value = business.loyalty_reward_description || '50% off next service';
    document.getElementById('smsNotifications').checked = business.sms_notifications_enabled !== false;
}

async function saveSettings() {
    const visitsRequired = parseInt(document.getElementById('visitsRequired').value);
    const rewardDescription = document.getElementById('rewardDescription').value.trim();
    const smsNotifications = document.getElementById('smsNotifications').checked;

    if (!visitsRequired || visitsRequired < 1 || visitsRequired > 50) {
        showNotification('Please enter a valid number of visits required (1-50)', 'error');
        return;
    }

    if (!rewardDescription) {
        showNotification('Please enter a reward description', 'error');
        return;
    }

    showLoading('settingsLoading', true);

    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        
        const { error } = await supabase
            .from('businesses')
            .update({
                loyalty_visits_required: visitsRequired,
                loyalty_reward_description: rewardDescription,
                sms_notifications_enabled: smsNotifications,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);

        if (error) throw error;

        // Update current business in memory
        if (currentBusiness) {
            currentBusiness.loyalty_visits_required = visitsRequired;
            currentBusiness.loyalty_reward_description = rewardDescription;
            currentBusiness.sms_notifications_enabled = smsNotifications;
        }

        showNotification('Settings saved successfully!');
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('Error saving settings: ' + error.message, 'error');
    } finally {
        showLoading('settingsLoading', false);
    }
}