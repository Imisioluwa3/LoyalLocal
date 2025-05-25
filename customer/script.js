const SUPABASE_URL = 'https://mhwsjjumsiveahfckcwr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1od3NqanVtc2l2ZWFoZmNrY3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMTc4MTQsImV4cCI6MjA2MzU5MzgxNH0.5varGB23DXpfi1adlwejmYwLlTbbjCPfKGDm9rWEQBo';
const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // -------------------------------------------------------------------------
    // UTILITY FUNCTIONS (Loading Indicators)
    // -------------------------------------------------------------------------
    function showLoading(message = 'Loading...') {
        let loader = document.getElementById('loader-customer'); // Use a different ID to avoid conflicts if on same page
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'loader-customer';
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
                    border-left-color: #764ba2; /* Customer page theme color */
                    animation: spin 1s ease infinite;
                    margin-bottom: 10px;">
                </div>
                <p id="loader-customer-message">${message}</p>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;
            document.body.appendChild(loader);
        }
        document.getElementById('loader-customer-message').textContent = message;
        loader.style.display = 'flex';
    }

    function hideLoading() {
        const loader = document.getElementById('loader-customer');
        if (loader) {
            loader.style.display = 'none';
        }
    }

    // -------------------------------------------------------------------------
    // CUSTOMER REWARDS LOOKUP
    // -------------------------------------------------------------------------
    async function handleCheckRewards(event) {
        event.preventDefault();
        const phoneNumberInput = document.getElementById('customerPhoneLookup');
        const phoneNumber = phoneNumberInput.value.trim();

        if (!phoneNumber) {
            alert('Please enter your phone number.');
            return;
        }
        // Basic phone number validation (can be improved)
        if (!/^\+?[0-9\s\-()]{7,20}$/.test(phoneNumber)) {
            alert('Please enter a valid phone number format.');
            return;
        }


        showLoading('Checking your rewards status...');
        const rewardsDisplay = document.getElementById('rewardsDisplay');
        const customerSummaryDisplay = document.getElementById('customerSummary');
        rewardsDisplay.innerHTML = ''; // Clear previous results
        customerSummaryDisplay.innerHTML = ''; // Clear previous summary

        try {
            // Fetch all visits for this phone number, joining with business details
            // This query relies on RLS allowing 'anon' or 'authenticated' users to read visits
            // and related business data (name, loyalty rules).
            const { data: allVisits, error: visitsError } = await supabase
                .from('visits')
                .select(`
                    id,
                    customer_name,
                    created_at,
                    is_redeemed_for_reward,
                    business_id,
                    businesses (
                        id,
                        name,
                        type,
                        loyalty_visits_required,
                        loyalty_reward_description
                    )
                `)
                .eq('customer_phone_number', phoneNumber)
                .order('created_at', { foreignTable: 'visits', ascending: false }); // Order visits by date

            if (visitsError) throw visitsError;

            if (!allVisits || allVisits.length === 0) {
                rewardsDisplay.innerHTML = '<p class="no-results">No loyalty programs found for this phone number. Visit a participating LoyalLocal business to start earning rewards!</p>';
                hideLoading();
                return;
            }

            // Group visits by business to display separate cards
            const rewardsByBusiness = allVisits.reduce((acc, visit) => {
                if (!visit.businesses) { // Skip if business data somehow missing (RLS issue?)
                    console.warn("Skipping visit due to missing business data:", visit);
                    return acc;
                }
                const bizId = visit.businesses.id;
                if (!acc[bizId]) {
                    acc[bizId] = {
                        businessInfo: visit.businesses, // Contains name, type, loyalty_rules
                        visits: [],
                        customerName: visit.customer_name || 'Valued Customer' // Use provided name or default
                    };
                }
                acc[bizId].visits.push({
                    created_at: visit.created_at,
                    is_redeemed_for_reward: visit.is_redeemed_for_reward
                });
                // Try to get the most recent non-null customer name for this business
                if (visit.customer_name && acc[bizId].customerName === 'Valued Customer') {
                     acc[bizId].customerName = visit.customer_name;
                }
                return acc;
            }, {});


            let rewardsHtml = '';
            let totalActivePrograms = 0;
            let totalAvailableRewardsToClaim = 0;
            let overallCustomerName = "Valued Customer"; // Fallback

            // Determine overall customer name from the groups
            const customerNames = Object.values(rewardsByBusiness).map(data => data.customerName).filter(name => name !== 'Valued Customer');
            if (customerNames.length > 0) {
                overallCustomerName = customerNames[0]; // Pick the first non-default name
            }


            for (const bizId in rewardsByBusiness) {
                totalActivePrograms++;
                const data = rewardsByBusiness[bizId];
                const bizInfo = data.businessInfo;

                // Filter out redeemed visits for current stamp count
                const unredeemedVisits = data.visits.filter(v => !v.is_redeemed_for_reward);
                const currentStamps = unredeemedVisits.length;
                const visitsNeeded = bizInfo.loyalty_visits_required || 5; // Fallback if somehow null
                const progress = Math.min((currentStamps / visitsNeeded) * 100, 100);
                const rewardAvailable = currentStamps >= visitsNeeded;

                if (rewardAvailable) {
                    totalAvailableRewardsToClaim++;
                }

                rewardsHtml += `
                    <div class="loyalty-card">
                        <div class="card-header">
                            <h3>${bizInfo.name}</h3>
                            <span class="business-type-customer">${bizInfo.type || 'Local Business'}</span>
                        </div>
                        <div class="card-body">
                            <p class="progress-text">Your Progress: <strong>${currentStamps} / ${visitsNeeded}</strong> stamps</p>
                            <div class="progress-bar-container-customer">
                                <div class="progress-bar-customer" style="width: ${progress}%;"></div>
                            </div>
                            <div class="stamps-visual-customer">
                                ${Array.from({ length: visitsNeeded }, (_, i) =>
                                    `<span class="stamp-customer ${i < currentStamps ? 'filled' : ''}"></span>`
                                ).join('')}
                            </div>
                `;
                if (rewardAvailable) {
                    rewardsHtml += `
                        <div class="reward-available-customer">
                            <p class="reward-title">🎉 Reward Available! 🎉</p>
                            <p class="reward-description-customer">${bizInfo.loyalty_reward_description || 'A Special Reward'}</p>
                            <p class="redeem-instruction"><small>Redeem this on your next visit to ${bizInfo.name}!</small></p>
                        </div>
                    `;
                }
                const lastVisitDate = data.visits.length > 0 ? new Date(data.visits[0].created_at).toLocaleDateString() : 'N/A';
                rewardsHtml += `<p class="last-visit-customer"><small>Last activity: ${lastVisitDate}</small></p></div></div>`;
            }


            if (totalActivePrograms === 0) { // Should have been caught by allVisits.length check, but good failsafe
                 rewardsDisplay.innerHTML = '<p class="no-results">No loyalty programs found for this phone number.</p>';
            } else {
                customerSummaryDisplay.innerHTML = `
                    <h3>Hi ${overallCustomerName}!</h3>
                    <p><strong>Phone Number:</strong> ${phoneNumber}</p>
                    <p><strong>You're part of loyalty programs at:</strong> ${totalActivePrograms} ${totalActivePrograms === 1 ? 'business' : 'businesses'}.</p>
                    <p><strong>Rewards ready to claim:</strong> <span class="highlight-stat">${totalAvailableRewardsToClaim}</span></p>
                `;
                rewardsDisplay.innerHTML = rewardsHtml;
            }

        } catch (error) {
            console.error('Error fetching rewards:', error);
            rewardsDisplay.innerHTML = `<p class="error-message">Oops! We couldn't fetch your rewards status right now (Error: ${error.message}). Please try again later.</p>`;
            customerSummaryDisplay.innerHTML = ''; // Clear summary on error
        } finally {
            hideLoading();
            phoneNumberInput.value = ''; // Clear the input after search
        }
    }

    // -------------------------------------------------------------------------
    // DOM EVENT LISTENERS
    // -------------------------------------------------------------------------
    document.addEventListener('DOMContentLoaded', () => {
        const lookupForm = document.getElementById('customerLookupForm');
        if (lookupForm) {
            lookupForm.addEventListener('submit', handleCheckRewards);
        } else {
            console.error("Customer lookup form not found!");
        }
    });