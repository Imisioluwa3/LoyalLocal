        // Sample data - In a real app, this would come from an API
        const sampleCustomerData = {
            "5551234567": {
                name: "Alex Johnson",
                businesses: {
                    "Downtown Hair Studio": {
                        type: "salon",
                        visits: 3,
                        visitsRequired: 5,
                        rewardDescription: "50% off next haircut",
                        lastVisit: "2024-05-20",
                        totalEarned: 1
                    },
                    "Joe's Barbershop": {
                        type: "barber",
                        visits: 8,
                        visitsRequired: 6,
                        rewardDescription: "Free beard trim",
                        lastVisit: "2024-05-22",
                        totalEarned: 2
                    },
                    "Corner Café": {
                        type: "cafe",
                        visits: 12,
                        visitsRequired: 10,
                        rewardDescription: "Free coffee and pastry",
                        lastVisit: "2024-05-23",
                        totalEarned: 3
                    }
                }
            },
            "5559876543": {
                name: "Sarah Mitchell",
                businesses: {
                    "Bella's Salon": {
                        type: "salon",
                        visits: 4,
                        visitsRequired: 6,
                        rewardDescription: "20% off any service",
                        lastVisit: "2024-05-21",
                        totalEarned: 0
                    },
                    "Pizza Palace": {
                        type: "restaurant",
                        visits: 7,
                        visitsRequired: 8,
                        rewardDescription: "Free large pizza",
                        lastVisit: "2024-05-24",
                        totalEarned: 1
                    }
                }
            }
        };

        // Phone number formatting
        document.getElementById('customerPhone').addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 6) {
                value = value.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
            } else if (value.length >= 3) {
                value = value.replace(/(\d{3})(\d{0,3})/, '($1) $2');
            }
            e.target.value = value;
        });

        // Enter key support
        document.getElementById('customerPhone').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                lookupRewards();
            }
        });

        function lookupRewards() {
            const phoneInput = document.getElementById('customerPhone').value;
            const phoneNumber = phoneInput.replace(/\D/g, '');
            
            if (phoneNumber.length !== 10) {
                alert('Please enter a valid 10-digit phone number');
                return;
            }

            // Animate button
            const btn = document.querySelector('.btn');
            const btnText = document.getElementById('btnText');
            btn.style.opacity = '0.7';
            btnText.textContent = 'Searching...';

            setTimeout(() => {
                const customerData = sampleCustomerData[phoneNumber];
                
                if (customerData) {
                    displayResults(customerData, phoneInput);
                } else {
                    showNoResults();
                }
                
                // Reset button
                btn.style.opacity = '1';
                btnText.textContent = 'Check My Rewards';
            }, 1000);
        }

        function displayResults(customerData, phoneNumber) {
            document.getElementById('lookupSection').style.display = 'none';
            document.getElementById('resultsSection').classList.add('active');

            // Update customer summary
            document.getElementById('welcomeMessage').textContent = 
                customerData.name ? `Welcome back, ${customerData.name}!` : 'Welcome back!';
            document.getElementById('phoneDisplay').textContent = `Phone: ${phoneNumber}`;

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

            // Generate loyalty cards
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

        // Auto-focus on phone input when page loads
        document.addEventListener('DOMContentLoaded', function() {
            document.getElementById('customerPhone').focus();
        });

        // Add some demo phone numbers for easy testing
        document.addEventListener('DOMContentLoaded', function() {
            const demoNumbers = Object.keys(sampleCustomerData);
            console.log('Demo phone numbers you can try:', demoNumbers.map(num => 
                num.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')));
        });