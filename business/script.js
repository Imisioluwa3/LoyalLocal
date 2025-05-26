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
        if (session) showDashboard();
    });

    // Auth state listener
    // supabase.auth.onAuthStateChange(async (event, session) => {
    // if (event === 'SIGNED_IN' && session) {
    //     // Check if business record exists
    //     const { data: business } = await supabase
    //         .from('businesses')
    //         .select('*')
    //         .eq('user_id', session.user.id)
    //         .single();

    //     // If no business record exists, create it from user metadata
    //     if (!business && session.user.user_metadata) {
    //         const metadata = session.user.user_metadata;
    //         if (metadata.business_name) {
    //             await createBusinessRecord(
    //                 session.user,
    //                 metadata.business_name,
    //                 metadata.business_type,
    //                 metadata.business_address
    //             );
    //         }
    //     }
        
    //     showDashboard();
    // } else if (event === 'SIGNED_OUT') {
    //     document.getElementById('dashboardSection').classList.remove('active');
    //     document.getElementById('authSection').style.display = 'block';
    // }

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
                                address: metadata.business_address
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
// async function register() {
//     const businessName = document.getElementById('businessName').value;
//     const businessType = document.getElementById('businessType').value;
//     const businessEmail = document.getElementById('businessEmail').value;
//     const businessPassword = document.getElementById('businessPassword').value;
//     const businessAddress = document.getElementById('businessAddress').value;

//     try {
//         // Create auth user
//         const { data: authData, error: authError } = await supabase.auth.signUp({
//             email: businessEmail,
//             password: businessPassword
//         });

//         if (authError) throw authError;

//         // Create business record
//         const { error } = await supabase.from('businesses').insert([{
//             user_id: authData.user.id,
//             name: businessName,
//             type: businessType,
//             address: businessAddress
//         }]);

//         if (error) throw error;
        
//         showNotification('Business registered successfully!');
//         showDashboard();
//     } catch (error) {
//         showNotification(error.message, 'error');
//     }
// }

// async function register() {
//     const businessName = document.getElementById('businessName').value;
//     const businessType = document.getElementById('businessType').value;
//     const businessEmail = document.getElementById('businessEmail').value;
//     const businessPassword = document.getElementById('businessPassword').value;
//     const businessAddress = document.getElementById('businessAddress').value;

//     try {
//         // 1. Sign up user
//         const { data: { user }, error: authError } = await supabase.auth.signUp({
//             email: businessEmail,
//             password: businessPassword,
//             options: {
//                 data: {
//                     business_name: businessName,
//                     business_type: businessType,
//                     business_address: businessAddress
//                 }
//             }
//         });

//         if (authError) throw authError;

//         // Check if email confirmation is required
//         if (data.user && !data.user.email_confirmed_at && !data.session) {
//             showNotification('Please check your email and click the confirmation link to complete registration.', 'info');
//             return;
//         }

//         // If user is immediately confirmed and signed in
//         if (data.session) {
//             await createBusinessRecord(data.user, businessName, businessType, businessAddress);
//             showNotification('Registration successful!');
//             showDashboard();
//         }

//         // // 2. Insert business data (with user's UID)
//         // const { error: businessError } = await supabase
//         // .from('businesses')
//         // .insert({
//         //     user_id: user.id,
//         //     name: businessName,
//         //     type: businessType,
//         //     address: businessAddress
//         // });

//         // if (businessError) throw businessError;

//         // showNotification('Registration successful!');
//         // showDashboard();

//     } catch (error) {
//         console.error('Registration error:', error);
//         showNotification(error.message || 'Registration failed. Please try again.', 'error');
//     }
// }


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
                    address: businessAddress
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

async function createBusinessRecord(user, businessName, businessType, businessAddress) {
    const { error: businessError } = await supabase
        .from('businesses')
        .insert({
            user_id: user.id,
            name: businessName,
            type: businessType,
            address: businessAddress
        });

    if (businessError) throw businessError;
}

// async function login() {
//     const email = document.getElementById('loginEmail').value;
//     const password = document.getElementById('loginPassword').value;

//     try {
//         const { data, error } = await supabase.auth.signInWithPassword({
//             email: email,
//             password: password
//         });

//         if (error) throw error;
        
//         showNotification('Login successful!');
//         showDashboard();
//     } catch (error) {
//         showNotification(error.message, 'error');
//     }
// }


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
        // Get business data
        const { data: { user } } = await supabase.auth.getUser();
        const { data: business, error } = await supabase
            .from('businesses')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (error) throw error;

        // Update UI
        document.getElementById('authSection').style.display = 'none';
        document.getElementById('dashboardSection').classList.add('active');
        document.getElementById('businessNameDisplay').textContent = `Welcome, ${business.name}!`;
        
        // Load settings and stats
        loadSettings(business);
        updateStats(business.id);
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Dashboard Functions
async function updateStats(businessId) {
    try {
        // Total Customers
        const { count: totalCustomers } = await supabase
            .from('visits')
            .select('customer_phone_number', { count: 'exact', head: true })
            .eq('business_id', businessId);

        // Visits Today
        const today = new Date().toISOString().split('T')[0];
        const { count: visitsToday } = await supabase
            .from('visits')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', businessId)
            .gte('created_at', today);

        // Rewards Redeemed
        const { count: rewardsRedeemed } = await supabase
            .from('visits')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', businessId)
            .eq('is_redeemed_for_reward', true);

        // Update UI
        document.getElementById('totalCustomers').textContent = totalCustomers || 0;
        document.getElementById('visitsToday').textContent = visitsToday || 0;
        document.getElementById('rewardsRedeemed').textContent = rewardsRedeemed || 0;
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Customer Management
async function lookupCustomer() {
    const phone = document.getElementById('customerPhone').value.trim();
    if (!phone) return showNotification('Please enter a phone number', 'error');

    try {
        const { data: business } = await supabase.from('businesses').select('*').single();
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
        showNotification(error.message, 'error');
    }
}

async function displayCustomer(visits, business) {
    const visitCount = visits.filter(v => !v.is_redeemed_for_reward).length;
    const requiredVisits = business.loyalty_visits_required;
    
    document.getElementById('visitCount').textContent = `Visits: ${visitCount}`;
    document.getElementById('progressFill').style.width = 
        `${Math.min((visitCount / requiredVisits) * 100, 100)}%`;
    
    if (visitCount >= requiredVisits) {
        document.getElementById('rewardSection').style.display = 'block';
    }
}

async function logVisit() {
    const phone = document.getElementById('customerPhone').value.trim();
    try {
        const { data: business } = await supabase.from('businesses').select('*').single();
        const { error } = await supabase.from('visits').insert([{
            business_id: business.id,
            customer_phone_number: phone,
            customer_name: document.getElementById('newCustomerName').value || null
        }]);

        if (error) throw error;
        
        updateStats(business.id);
        showNotification('Visit logged successfully!');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Settings Functions
async function loadSettings(business) {
    document.getElementById('visitsRequired').value = business.loyalty_visits_required;
    document.getElementById('rewardDescription').value = business.loyalty_reward_description;
    document.getElementById('smsNotifications').checked = business.sms_notifications_enabled;
}

async function saveSettings() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
            .from('businesses')
            .update({
                loyalty_visits_required: document.getElementById('visitsRequired').value,
                loyalty_reward_description: document.getElementById('rewardDescription').value,
                sms_notifications_enabled: document.getElementById('smsNotifications').checked
            })
            .eq('user_id', user.id);

        if (error) throw error;
        showNotification('Settings saved successfully!');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// UI Functions
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.style.backgroundColor = type === 'error' ? '#dc3545' : '#28a745';
    notification.classList.add('show');

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