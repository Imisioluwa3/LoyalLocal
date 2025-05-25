const SUPABASE_URL = 'https://mhwsjjumsiveahfckcwr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1od3NqanVtc2l2ZWFoZmNrY3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMTc4MTQsImV4cCI6MjA2MzU5MzgxNH0.5varGB23DXpfi1adlwejmYwLlTbbjCPfKGDm9rWEQBo';
const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // -------------------------------------------------------------------------
    // GLOBAL VARIABLES
    // -------------------------------------------------------------------------
    let currentBusiness = null;
    let businessSettings = {
        loyalty_visits_required: 5, // Default fallback
        loyalty_reward_description: 'Default Reward', // Default fallback
        sms_notifications_enabled: false
    };

    // -------------------------------------------------------------------------
    // UTILITY FUNCTIONS (Loading Indicators)
    // -------------------------------------------------------------------------
    function showLoading(message = 'Loading...') {
        let loader = document.getElementById('loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'loader';
            loader.style.position = 'fixed';
            loader.style.top = '0';
            loader.style.left = '0';
            loader.style.width = '100%';
            loader.style.height = '100%';
            loader.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
            loader.style.color = '#333';
            loader.style.display = 'flex';
            loader.style.flexDirection = 'column';
            loader.style.justifyContent = 'center';
            loader.style.alignItems = 'center';
            loader.style.zIndex = '10000';
            loader.style.fontSize = '1.2em';
            loader.innerHTML = `
                <div class="spinner" style="
                    border: 4px solid rgba(0,0,0,0.1);
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    border-left-color: #667eea;
                    animation: spin 1s ease infinite;
                    margin-bottom: 10px;">
                </div>
                <p id="loader-message">${message}</p>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;
            document.body.appendChild(loader);
        }
        document.getElementById('loader-message').textContent = message;
        loader.style.display = 'flex';
    }

    function hideLoading() {
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.display = 'none';
        }
    }


    // -------------------------------------------------------------------------
    // AUTHENTICATION & SESSION MANAGEMENT
    // -------------------------------------------------------------------------
    async function handleRegister(event) {
        event.preventDefault();
        const form = event.target;
        const email = form.email.value;
        const password = form.password.value;
        const businessName = form.businessName.value;
        const businessType = form.businessType.value;
        const businessAddress = form.businessAddress.value;

        if (!businessName || !businessType || !email || !password) {
            alert("Please fill in all required fields for registration.");
            return;
        }

        showLoading('Registering your business...');
        try {
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: email,
                password: password,
            });

            if (authError) throw authError;

            if (authData.user) {
                const { data: businessData, error: businessError } = await supabase
                    .from('businesses')
                    .insert([{
                        user_id: authData.user.id,
                        name: businessName,
                        type: businessType,
                        address: businessAddress,
                        loyalty_visits_required: 5, // Default
                        loyalty_reward_description: '10% Off Next Purchase' // Default
                    }])
                    .select()
                    .single();

                if (businessError) {
                    // Attempt to clean up the auth user if business creation fails
                    // This is a best-effort, might need more robust handling for production
                    console.warn("Business creation failed, attempting to clean up auth user...", businessError);
                    // await supabase.auth.api.deleteUser(authData.user.id); // This requires service_role key, not suitable for client-side
                    throw new Error(`Business Creation Error: ${businessError.message}. Please contact support if your account was created but business details were not saved.`);
                }
                alert('Registration successful! Please log in.');
                switchTab('login');
                form.reset();
            }
        } catch (error) {
            alert(`Registration Error: ${error.message}`);
            console.error("Registration Error:", error);
        } finally {
            hideLoading();
        }
    }

    async function handleLogin(event) {
        event.preventDefault();
        const form = event.target;
        const email = form.email.value;
        const password = form.password.value;

        if (!email || !password) {
            alert("Please enter email and password.");
            return;
        }

        showLoading('Logging in...');
        try {
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (authError) throw authError;

            if (authData.user) {
                const business = await fetchBusinessData(authData.user.id);
                if (business) {
                    updateUIForLoggedInState();
                    form.reset();
                } else {
                    await supabase.auth.signOut(); // Log them out if no business record
                    alert('Business data not found for this account. Please ensure you have registered your business or contact support.');
                }
            }
        } catch (error) {
            alert(`Login Error: ${error.message}`);
            console.error("Login Error:", error);
        } finally {
            hideLoading();
        }
    }

    async function fetchBusinessData(userId) {
        showLoading('Fetching business details...');
        try {
            const { data, error } = await supabase
                .from('businesses')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 means 0 rows, which is handled
                throw error;
            }
            if (data) {
                currentBusiness = data;
                businessSettings = {
                    loyalty_visits_required: currentBusiness.loyalty_visits_required,
                    loyalty_reward_description: currentBusiness.loyalty_reward_description,
                    sms_notifications_enabled: currentBusiness.sms_notifications_enabled
                };
                // Populate settings form if visible (or defer to tab switch)
                document.getElementById('visitsRequired').value = businessSettings.loyalty_visits_required;
                document.getElementById('rewardDescription').value = businessSettings.loyalty_reward_description;
                document.getElementById('enableSms').checked = businessSettings.sms_notifications_enabled;
                return data;
            }
            return null; // No business data found
        } catch (error) {
            console.error('Error fetching business data:', error);
            alert(`Error fetching business details: ${error.message}`);
            return null;
        } finally {
            hideLoading();
        }
    }

    async function handleLogout() {
        showLoading('Logging out...');
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            currentBusiness = null;
            businessSettings = { loyalty_visits_required: 5, loyalty_reward_description: 'Default Reward', sms_notifications_enabled: false };
            updateUIForLoggedOutState();
        } catch (error) {
            alert(`Logout Error: ${error.message}`);
            console.error("Logout Error:", error);
        } finally {
            hideLoading();
        }
    }

    async function checkUserSession() {
        showLoading('Checking session...');
        try {
            const { data: { session }, error } = await supabase.auth.getSession();

            if (error) throw error;

            if (session && session.user) {
                const business = await fetchBusinessData(session.user.id);
                if (business) {
                    updateUIForLoggedInState();
                } else {
                    // User is authenticated but no business record
                    await supabase.auth.signOut();
                    updateUIForLoggedOutState();
                    // alert("Could not find business details. Please log in again or register.");
                }
            } else {
                updateUIForLoggedOutState();
            }
        } catch (error) {
            console.error('Error checking session:', error);
            updateUIForLoggedOutState(); // Fallback to logged out state
        } finally {
            hideLoading();
        }
    }

    // Listen for auth state changes (e.g. token refresh, logout from another tab)
    supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth event:', event, session);
        if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
            currentBusiness = null;
            updateUIForLoggedOutState();
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
            if (session && session.user && !currentBusiness) { // If not already loaded
                 fetchBusinessData(session.user.id).then(business => {
                    if (business) updateUIForLoggedInState();
                    else updateUIForLoggedOutState(); // If fetch fails or no business
                 });
            } else if (!session) { // No session, ensure logged out state
                updateUIForLoggedOutState();
            }
        }
    });

    // -------------------------------------------------------------------------
    // LOYALTY PROGRAM SETTINGS
    // -------------------------------------------------------------------------
    async function handleSaveSettings(event) {
        event.preventDefault();
        if (!currentBusiness) {
            alert('Error: No business is currently logged in. Please log in again.');
            return;
        }

        const visitsRequired = document.getElementById('visitsRequired').value;
        const rewardDescription = document.getElementById('rewardDescription').value;
        const enableSms = document.getElementById('enableSms').checked;

        showLoading('Saving settings...');
        try {
            const { data, error } = await supabase
                .from('businesses')
                .update({
                    loyalty_visits_required: parseInt(visitsRequired),
                    loyalty_reward_description: rewardDescription,
                    sms_notifications_enabled: enableSms
                })
                .eq('id', currentBusiness.id)
                .select()
                .single();

            if (error) throw error;

            if (data) {
                currentBusiness = data; // Update currentBusiness with new settings
                businessSettings = {
                    loyalty_visits_required: data.loyalty_visits_required,
                    loyalty_reward_description: data.loyalty_reward_description,
                    sms_notifications_enabled: data.sms_notifications_enabled
                };
                alert('Settings saved successfully!');
            }
        } catch (error) {
            alert(`Error saving settings: ${error.message}`);
            console.error("Error saving settings:", error);
        } finally {
            hideLoading();
        }
    }

    // -------------------------------------------------------------------------
    // CUSTOMER & VISIT MANAGEMENT
    // -------------------------------------------------------------------------
    async function handleLookupCustomer(event) {
        event.preventDefault();
        if (!currentBusiness) {
            alert('Error: No business is currently logged in. Please log in again.');
            return;
        }

        const phoneNumber = document.getElementById('lookupPhone').value.trim();
        if (!phoneNumber) {
            alert('Please enter a customer phone number.');
            return;
        }

        showLoading('Looking up customer...');
        const customerDisplay = document.getElementById('customerDetailsDisplay');
        customerDisplay.innerHTML = ''; // Clear previous results

        try {
            // Fetch all visits for this customer at this business to correctly calculate progress
            const { data: visits, error: visitsError } = await supabase
                .from('visits')
                .select('id, customer_name, created_at, is_redeemed_for_reward')
                .eq('business_id', currentBusiness.id)
                .eq('customer_phone_number', phoneNumber)
                .order('created_at', { ascending: false }); // Get all visits, newest first

            if (visitsError) throw visitsError;

            const customerNameFromVisits = visits.length > 0 ? (visits.find(v => v.customer_name)?.customer_name || 'N/A') : 'N/A';
            const unredeemedVisits = visits.filter(v => !v.is_redeemed_for_reward);
            const visitCount = unredeemedVisits.length; // Current stamps towards next reward

            if (visits.length === 0) { // Truly new customer or no visits logged yet
                customerDisplay.innerHTML = `
                    <p>New customer or no visits logged yet for ${phoneNumber}.</p>
                    <form id="addCustomerForm" class="lookup-form">
                        <input type="hidden" name="phone" value="${phoneNumber}">
                        <label for="newCustomerName">Name (Optional):</label>
                        <input type="text" id="newCustomerName" name="customerName" placeholder="E.g., Jane Doe">
                        <button type="submit" class="button">Add Customer & Log First Visit</button>
                    </form>
                `;
                document.getElementById('addCustomerForm').addEventListener('submit', (e) => handleAddCustomerAndLogVisit(e, phoneNumber));
            } else {
                const progress = Math.min((visitCount / businessSettings.loyalty_visits_required) * 100, 100);
                let rewardSection = '';
                if (visitCount >= businessSettings.loyalty_visits_required) {
                    rewardSection = `
                        <div class="reward-available">
                            <h4>🎉 Reward Available! 🎉</h4>
                            <p><strong>Reward:</strong> ${businessSettings.loyalty_reward_description}</p>
                            <button onclick="handleRedeemReward('${phoneNumber}')" class="button primary-button">Redeem Reward</button>
                        </div>
                    `;
                }

                customerDisplay.innerHTML = `
                    <h4>Customer: ${customerNameFromVisits} (${phoneNumber})</h4>
                    <p>Current Stamps: ${visitCount} / ${businessSettings.loyalty_visits_required} (Visits needed for reward)</p>
                    <div class="progress-bar-container"><div class="progress-bar" style="width: ${progress}%;"></div></div>
                    <button onclick="handleLogVisit('${phoneNumber}', '${customerNameFromVisits === 'N/A' ? '' : customerNameFromVisits}')" class="button">Log Another Visit</button>
                    ${rewardSection}
                    <h5>Visit History (Last 5 total):</h5>
                    <ul class="visit-history-list">
                        ${visits.slice(0, 5).map(v => `<li>${new Date(v.created_at).toLocaleDateString()} - ${v.is_redeemed_for_reward ? '<span class="redeemed-tag">Redeemed</span>' : '<span class="valid-tag">Valid Stamp</span>'}</li>`).join('')}
                    </ul>
                `;
            }
        } catch (error) {
            alert(`Error looking up customer: ${error.message}`);
            console.error("Error looking up customer:", error);
            customerDisplay.innerHTML = `<p class="error-message">Could not fetch customer details.</p>`;
        } finally {
            hideLoading();
        }
    }

    async function handleAddCustomerAndLogVisit(event, phoneNumber) {
        event.preventDefault(); // Prevent default form submission
        const customerNameInput = event.target.elements.customerName;
        const customerName = customerNameInput ? customerNameInput.value.trim() || null : null;
        await logVisitToSupabase(phoneNumber, customerName);
    }

    async function handleLogVisit(phoneNumber, customerName) {
        await logVisitToSupabase(phoneNumber, customerName || null);
    }

    async function logVisitToSupabase(phoneNumber, customerName) {
        if (!currentBusiness) {
            alert('Error: No business is currently logged in.');
            return;
        }

        showLoading('Logging visit...');
        try {
            const { error } = await supabase
                .from('visits')
                .insert([{
                    business_id: currentBusiness.id,
                    customer_phone_number: phoneNumber,
                    customer_name: customerName
                    // is_redeemed_for_reward defaults to false in DB schema
                }]);

            if (error) throw error;

            alert('Visit logged successfully!');
            // Refresh customer details in the UI
            document.getElementById('lookupPhone').value = phoneNumber;
            document.getElementById('lookupCustomerForm').dispatchEvent(new Event('submit', { bubbles: true }));
            updateOverviewStats(); // Refresh overview stats as a visit was logged
        } catch (error) {
            alert(`Error logging visit: ${error.message}`);
            console.error("Error logging visit:", error);
        } finally {
            hideLoading();
        }
    }

    async function handleRedeemReward(phoneNumber) {
        if (!currentBusiness) {
            alert('Error: No business is currently logged in.');
            return;
        }
        if (!confirm(`Are you sure you want to redeem a reward for ${phoneNumber}? This will use ${businessSettings.loyalty_visits_required} stamps.`)) {
            return;
        }

        showLoading('Redeeming reward...');
        try {
            // 1. Fetch the oldest, unredeemed visits that make up one reward cycle
            const { data: visitsToRedeem, error: fetchError } = await supabase
                .from('visits')
                .select('id')
                .eq('business_id', currentBusiness.id)
                .eq('customer_phone_number', phoneNumber)
                .eq('is_redeemed_for_reward', false)
                .order('created_at', { ascending: true }) // Oldest first
                .limit(businessSettings.loyalty_visits_required);

            if (fetchError) throw fetchError;
            if (!visitsToRedeem || visitsToRedeem.length < businessSettings.loyalty_visits_required) {
                throw new Error('Not enough unredeemed visits to claim a reward.');
            }

            // 2. Mark these specific visits as redeemed
            const visitIdsToUpdate = visitsToRedeem.map(v => v.id);
            const { error: updateError } = await supabase
                .from('visits')
                .update({ is_redeemed_for_reward: true })
                .in('id', visitIdsToUpdate);

            if (updateError) throw updateError;

            alert('Reward redeemed successfully!');
            // Refresh customer details in UI
            document.getElementById('lookupPhone').value = phoneNumber;
            document.getElementById('lookupCustomerForm').dispatchEvent(new Event('submit', { bubbles: true }));
            updateOverviewStats(); // Refresh overview stats
        } catch (error) {
            alert(`Error redeeming reward: ${error.message}`);
            console.error("Error redeeming reward:", error);
        } finally {
            hideLoading();
        }
    }

    // -------------------------------------------------------------------------
    // OVERVIEW STATISTICS
    // -------------------------------------------------------------------------
    async function updateOverviewStats() {
        if (!currentBusiness) {
            document.getElementById('totalCustomers').textContent = 'N/A';
            document.getElementById('visitsToday').textContent = 'N/A';
            document.getElementById('rewardsRedeemed').textContent = 'N/A';
            document.getElementById('rewardsEarned').textContent = 'N/A';
            return;
        }
        showLoading('Updating dashboard stats...');

        try {
            // Total unique customers (using RPC)
            // IMPORTANT: Ensure the SQL function 'get_distinct_customers_for_business' is created in Supabase.
            const { data: customersData, error: customersError } = await supabase
                .rpc('get_distinct_customers_for_business', { p_business_id: currentBusiness.id });
            if (customersError) console.warn("Error fetching total customers:", customersError.message);
            document.getElementById('totalCustomers').textContent = customersData?.[0]?.customer_count || 0;

            // Visits today
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);

            const { count: visitsTodayCount, error: visitsTodayError } = await supabase
                .from('visits')
                .select('*', { count: 'exact', head: true })
                .eq('business_id', currentBusiness.id)
                .gte('created_at', todayStart.toISOString())
                .lte('created_at', todayEnd.toISOString());
            if (visitsTodayError) console.warn("Error fetching visits today:", visitsTodayError.message);
            document.getElementById('visitsToday').textContent = visitsTodayCount || 0;

            // Rewards Redeemed (count of visits marked as redeemed, divided by visits_required)
            const { count: totalRedeemedStamps, error: redeemedError } = await supabase
                .from('visits')
                .select('*', { count: 'exact', head: true })
                .eq('business_id', currentBusiness.id)
                .eq('is_redeemed_for_reward', true);
            if (redeemedError) console.warn("Error fetching redeemed visits:", redeemedError.message);
            const rewardsRedeemedCount = totalRedeemedStamps ? Math.floor(totalRedeemedStamps / businessSettings.loyalty_visits_required) : 0;
            document.getElementById('rewardsRedeemed').textContent = rewardsRedeemedCount;

            // Rewards Earned but not yet redeemed (count of unredeemed visits, divided by visits_required)
            const { count: totalUnredeemedStamps, error: unredeemedErr } = await supabase
                .from('visits')
                .select('*', { count: 'exact', head: true })
                .eq('business_id', currentBusiness.id)
                .eq('is_redeemed_for_reward', false);
            if (unredeemedErr) console.warn("Error fetching unredeemed visits:", unredeemedErr.message);
            const rewardsEarnedNotClaimed = totalUnredeemedStamps ? Math.floor(totalUnredeemedStamps / businessSettings.loyalty_visits_required) : 0;
            document.getElementById('rewardsEarned').textContent = rewardsEarnedNotClaimed;

        } catch (error) {
            console.error("Error updating overview stats:", error);
            // Set stats to N/A or error message on failure
            document.getElementById('totalCustomers').textContent = 'Error';
            document.getElementById('visitsToday').textContent = 'Error';
            document.getElementById('rewardsRedeemed').textContent = 'Error';
            document.getElementById('rewardsEarned').textContent = 'Error';
        } finally {
            hideLoading();
        }
    }

    // -------------------------------------------------------------------------
    // UI UPDATE AND INITIALIZATION FUNCTIONS
    // -------------------------------------------------------------------------
    function updateUIForLoggedInState() {
        document.getElementById('authForms').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        if (currentBusiness) {
            document.getElementById('loggedInUser').textContent = `Logged in as: ${currentBusiness.name}`;
            // Populate settings form with potentially updated values
            document.getElementById('visitsRequired').value = businessSettings.loyalty_visits_required;
            document.getElementById('rewardDescription').value = businessSettings.loyalty_reward_description;
            document.getElementById('enableSms').checked = businessSettings.sms_notifications_enabled;
            updateOverviewStats(); // Fetch and display dashboard stats
        }
        document.getElementById('logoutButton').style.display = 'inline-block';
        document.getElementById('businessNavLinks').style.display = 'flex'; // Or 'block' based on your CSS
        document.getElementById('publicNavLinks').style.display = 'none';
        switchTab('overview'); // Default to overview tab after login
    }

    function updateUIForLoggedOutState() {
        document.getElementById('authForms').style.display = 'block';
        document.getElementById('dashboard').style.display = 'none';
        document.getElementById('loggedInUser').textContent = '';
        document.getElementById('logoutButton').style.display = 'none';
        document.getElementById('businessNavLinks').style.display = 'none';
        document.getElementById('publicNavLinks').style.display = 'flex'; // Or 'block'
        switchTab('login'); // Default to login tab when logged out
        // Clear forms
        document.getElementById('registerForm').reset();
        document.getElementById('loginForm').reset();
        document.getElementById('lookupCustomerForm').reset();
        document.getElementById('customerDetailsDisplay').innerHTML = '';
        // Clear stats
        document.getElementById('totalCustomers').textContent = '0';
        document.getElementById('visitsToday').textContent = '0';
        document.getElementById('rewardsRedeemed').textContent = '0';
        document.getElementById('rewardsEarned').textContent = '0';

    }

    function switchTab(tabId) {
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));

        const activeTabContent = document.getElementById(tabId);
        const activeButton = document.querySelector(`.tab-button[data-tab="${tabId}"]`);

        if (activeTabContent) activeTabContent.classList.add('active');
        if (activeButton) activeButton.classList.add('active');

        // If switching to settings tab and logged in, ensure form is populated
        if (tabId === 'settings' && currentBusiness) {
            document.getElementById('visitsRequired').value = businessSettings.loyalty_visits_required;
            document.getElementById('rewardDescription').value = businessSettings.loyalty_reward_description;
            document.getElementById('enableSms').checked = businessSettings.sms_notifications_enabled;
        }
        // If switching to overview tab and logged in, refresh stats
        if (tabId === 'overview' && currentBusiness) {
            updateOverviewStats();
        }
    }

    // -------------------------------------------------------------------------
    // DOM EVENT LISTENERS
    // -------------------------------------------------------------------------
    document.addEventListener('DOMContentLoaded', () => {
        // Auth form listeners
        document.getElementById('registerForm').addEventListener('submit', handleRegister);
        document.getElementById('loginForm').addEventListener('submit', handleLogin);
        document.getElementById('logoutButton').addEventListener('click', handleLogout);

        // Settings form listener
        document.getElementById('settingsForm').addEventListener('submit', handleSaveSettings);

        // Customer lookup form listener
        document.getElementById('lookupCustomerForm').addEventListener('submit', handleLookupCustomer);

        // Tab switching logic
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => {
                switchTab(button.dataset.tab);
            });
        });

        // Public nav links (for showing login/register tabs)
        document.getElementById('showLoginTab').addEventListener('click', (e) => { e.preventDefault(); switchTab('login'); });
        document.getElementById('showRegisterTab').addEventListener('click', (e) => { e.preventDefault(); switchTab('register'); });

        // Initial check for user session
        checkUserSession();
    });