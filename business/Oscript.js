// Initialize Supabase
const SUPABASE_URL = 'https://mhwsjjumsiveahfckcwr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1od3NqanVtc2l2ZWFoZmNrY3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMTc4MTQsImV4cCI6MjA2MzU5MzgxNH0.5varGB23DXpfi1adlwejmYwLlTbbjCPfKGDm9rWEQBo';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true
    }
});

document.addEventListener('DOMContentLoaded', function() {
    
    if (typeof supabase === 'undefined') {
        console.error('Supabase not loaded! Check script order.');
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
                                loyalty_visits_required: 5, // Default value
                                loyalty_reward_description: '50% off next service', // Default value
                                sms_notifications_enabled: true // Default value
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
        }
    });
});

// Authentication Functions
async function register() {
    const businessName = document.getElementById('businessName').value;
    const businessType = document.getElementById('businessType').value;
    const businessEmail = document.getElementById('businessEmail').value;
    const businessPassword = document.getElementById('businessPassword').value;
    const businessAddress = document.getElementById('businessAddress').value;

    // Validate inputs
    if (!businessName || !businessType || !businessEmail || !businessPassword || !businessAddress) {
        showNotification('Please fill in all fields', 'error');
        return;
    }

    try {
        console.log('Starting registration process...');
        
        // 1. Sign up user
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

        // Check if email confirmation is required
        if (authData.user && !authData.user.email_confirmed_at && !authData.session) {
            showNotification('Please check your email and click the confirmation link to complete registration.', 'info');
            return;
        }

        // If user is immediately confirmed and signed in
        if (authData.session && authData.user) {
            console.log('User signed in, creating business record...');
            
            // 2. Insert business data
            const { error: businessError } = await supabase
                .from('businesses')
                .insert({
                    user_id: authData.user.id,
                    name: businessName,
                    type: businessType,
                    address: businessAddress,
                    loyalty_visits_required: 5, // Default value
                    loyalty_reward_description: '50% off next service', // Default value
                    sms_notifications_enabled: true // Default value
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
        showNotification(error.message || 'Registration failed. Please try again.', 'error');
    }
}

async function login() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    // Validate inputs
    if (!email || !password) {
        showNotification('Please enter both email and password', 'error');
        return;
    }

    // Show loading state
    const loginButton = event.target;
    const originalText = loginButton.textContent;
    loginButton.textContent = 'Logging in...';
    loginButton.disabled = true;

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
        
        // Handle specific error messages
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
        // Reset button state
        loginButton.textContent = originalText;
        loginButton.disabled = false;
    }
}

async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        // Reset UI
        document.getElementById('dashboardSection').classList.remove('active');
        document.getElementById('authSection').style.display = 'block';
        
        showNotification('Logged out successfully');
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Error logging out: ' + error.message, 'error');
    }
}

async function showDashboard() {
    try {
        console.log('Showing dashboard...');
        
        // Get current user
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

        // Get business data
        const { data: business, error: businessError } = await supabase
            .from('businesses')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (businessError) {
            console.error('Error fetching business:', businessError);
            if (businessError.code === 'PGRST116') {
                // No business record found - this shouldn't happen after auth flow
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

        // Update UI
        document.getElementById('authSection').style.display = 'none';
        document.getElementById('dashboardSection').classList.add('active');
        document.getElementById('businessNameDisplay').textContent = `Welcome, ${business.name}!`;
        
        // Load settings and stats
        loadSettings(business);
        updateStats(business.id);
        
        console.log('Dashboard loaded successfully');
    } catch (error) {
        console.error('Error showing dashboard:', error);
        showNotification('Error loading dashboard: ' + error.message, 'error');
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

        // Update UI
        document.getElementById('totalCustomers').textContent = totalCustomers || 0;
        document.getElementById('visitsToday').textContent = visitsToday || 0;
        document.getElementById('rewardsRedeemed').textContent = rewardsRedeemed || 0;
        
        console.log('Stats updated:', { totalCustomers, visitsToday, rewardsRedeemed });
    } catch (error) {
        console.error('Error updating stats:', error);
        showNotification('Error loading statistics: ' + error.message, 'error');
    }
}

// Customer Management
async function lookupCustomer() {
    const phone = document.getElementById('customerPhone').value.trim();
    if (!phone) return showNotification('Please enter a phone number', 'error');

    try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: business } = await supabase
            .from('businesses')
            .select('*')
            .eq('user_id', user.id)
            .single();

        const { data: visits, error } = await supabase
            .from('visits')
            .select('*')
            .eq('business_id', business.id)
            .eq('customer_phone_number', phone);

        if (error) throw error;

        if (visits.length > 0) {
            displayCustomer(visits, business);
        } else {
            showNewCustomerForm(phone);
        }
    } catch (error) {
        console.error('Error looking up customer:', error);
        showNotification('Error looking up customer: ' + error.message, 'error');
    }
}

function displayCustomer(visits, business) {
    const visitCount = visits.filter(v => !v.is_redeemed_for_reward).length;
    const requiredVisits = business.loyalty_visits_required;
    
    document.getElementById('visitCount').textContent = `Visits: ${visitCount}`;
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
    document.getElementById('customerPhone').value = phone;
}

async function addNewCustomer() {
    const phone = document.getElementById('customerPhone').value.trim();
    const name = document.getElementById('newCustomerName').value.trim();
    
    try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: business } = await supabase
            .from('businesses')
            .select('*')
            .eq('user_id', user.id)
            .single();

        const { error } = await supabase.from('visits').insert([{
            business_id: business.id,
            customer_phone_number: phone,
            customer_name: name || null
        }]);

        if (error) throw error;
        
        updateStats(business.id);
        showNotification('New customer added and first visit logged!');
        
        // Clear form
        document.getElementById('newCustomerName').value = '';
        document.getElementById('customerPhone').value = '';
        document.getElementById('newCustomerForm').style.display = 'none';
        
    } catch (error) {
        console.error('Error adding customer:', error);
        showNotification('Error adding customer: ' + error.message, 'error');
    }
}

async function logVisit() {
    const phone = document.getElementById('customerPhone').value.trim();
    try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: business } = await supabase
            .from('businesses')
            .select('*')
            .eq('user_id', user.id)
            .single();

        const { error } = await supabase.from('visits').insert([{
            business_id: business.id,
            customer_phone_number: phone,
            customer_name: document.getElementById('newCustomerName').value || null
        }]);

        if (error) throw error;
        
        updateStats(business.id);
        showNotification('Visit logged successfully!');
        
        // Refresh customer display
        lookupCustomer();
    } catch (error) {
        console.error('Error logging visit:', error);
        showNotification('Error logging visit: ' + error.message, 'error');
    }
}

async function redeemReward() {
    const phone = document.getElementById('customerPhone').value.trim();
    try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: business } = await supabase
            .from('businesses')
            .select('*')
            .eq('user_id', user.id)
            .single();

        // Get unredeemed visits
        const { data: visits } = await supabase
            .from('visits')
            .select('*')
            .eq('business_id', business.id)
            .eq('customer_phone_number', phone)
            .eq('is_redeemed_for_reward', false)
            .limit(business.loyalty_visits_required);

        // Mark visits as redeemed
        const visitIds = visits.slice(0, business.loyalty_visits_required).map(v => v.id);
        const { error } = await supabase
            .from('visits')
            .update({ is_redeemed_for_reward: true })
            .in('id', visitIds);

        if (error) throw error;
        
        updateStats(business.id);
        showNotification('Reward redeemed successfully!');
        
        // Refresh customer display
        lookupCustomer();
    } catch (error) {
        console.error('Error redeeming reward:', error);
        showNotification('Error redeeming reward: ' + error.message, 'error');
    }
}

// Settings Functions
async function loadSettings(business) {
    document.getElementById('visitsRequired').value = business.loyalty_visits_required || 5;
    document.getElementById('rewardDescription').value = business.loyalty_reward_description || '50% off next service';
    document.getElementById('smsNotifications').checked = business.sms_notifications_enabled !== false;
}

async function saveSettings() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
            .from('businesses')
            .update({
                loyalty_visits_required: parseInt(document.getElementById('visitsRequired').value),
                loyalty_reward_description: document.getElementById('rewardDescription').value,
                sms_notifications_enabled: document.getElementById('smsNotifications').checked
            })
            .eq('user_id', user.id);

        if (error) throw error;
        showNotification('Settings saved successfully!');
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('Error saving settings: ' + error.message, 'error');
    }
}

// UI Functions
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;

    setTimeout(() => {
        notification.classList.remove('show');
    }, 4000);
}

// Navigation and Helper Functions
function switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');

    document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
}

function showSection(section) {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    ['overview', 'customers', 'settings'].forEach(s => 
        document.getElementById(`${s}Section`).style.display = s === section ? 'block' : 'none'
    );
}