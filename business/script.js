const SUPABASE_URL = 'https://mhwsjjumsiveahfckcwr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1od3NqanVtc2l2ZWFoZmNrY3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMTc4MTQsImV4cCI6MjA2MzU5MzgxNH0.5varGB23DXpfi1adlwejmYwLlTbbjCPfKGDm9rWEQBo';
const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    loadFromStorage();
    updateStats();
});

// Authentication Functions
function switchTab(tab) {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');

    if (tab === 'login') {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registerForm').style.display = 'none';
    } else {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'block';
    }
}

function register() {
    const businessName = document.getElementById('businessName').value;
    const businessType = document.getElementById('businessType').value;
    const businessEmail = document.getElementById('businessEmail').value;
    const businessPassword = document.getElementById('businessPassword').value;
    const businessAddress = document.getElementById('businessAddress').value;

    if (!businessName || !businessType || !businessEmail || !businessPassword) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    // Create business account
    appState.currentBusiness = {
        name: businessName,
        type: businessType,
        email: businessEmail,
        address: businessAddress
    };

    saveToStorage();
    showDashboard();
    showNotification('Business registered successfully!');
}

function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showNotification('Please enter email and password', 'error');
        return;
    }

    // Simple demo login
    if (appState.currentBusiness || (email && password)) {
        if (!appState.currentBusiness) {
            appState.currentBusiness = {
                name: "Demo Business",
                type: "salon",
                email: email
            };
        }
        showDashboard();
        showNotification('Login successful!');
    } else {
        showNotification('Invalid credentials', 'error');
    }
}

function showDashboard() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('dashboardSection').classList.add('active');
    document.getElementById('businessNameDisplay').textContent = `Welcome, ${appState.currentBusiness.name}!`;
    updateStats();
}

// Navigation Functions
function showSection(section) {
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // Hide all sections
    document.getElementById('overviewSection').style.display = 'none';
    document.getElementById('customersSection').style.display = 'none';
    document.getElementById('settingsSection').style.display = 'none';

    // Show selected section
    document.getElementById(section + 'Section').style.display = 'block';
}

// Customer Management Functions
function lookupCustomer() {
    const phone = document.getElementById('customerPhone').value.trim();
    if (!phone) {
        showNotification('Please enter a phone number', 'error');
        return;
    }

    const customer = appState.customers[phone];
            
    if (customer) {
        displayCustomer(customer, phone);
    } else {
        showNewCustomerForm(phone);
    }
}

function displayCustomer(customer, phone) {
    document.getElementById('newCustomerForm').style.display = 'none';
    document.getElementById('customerDisplay').style.display = 'block';
            
    document.getElementById('customerName').textContent = customer.name || 'Customer';
    document.getElementById('customerPhoneDisplay').textContent = `Phone: ${phone}`;
    document.getElementById('visitCount').textContent = `Visits: ${customer.visits}`;
            
    const progress = (customer.visits / appState.settings.visitsRequired) * 100;
    document.getElementById('progressFill').style.width = `${Math.min(progress, 100)}%`;
    document.getElementById('progressText').textContent = 
        `${customer.visits} visits towards reward (${appState.settings.visitsRequired} required)`;

    // Check if reward is available
    if (customer.visits >= appState.settings.visitsRequired) {
        document.getElementById('rewardSection').style.display = 'block';
        document.getElementById('rewardDescription').textContent = 
            `Customer has earned: ${appState.settings.rewardDescription}`;
    } else {
        document.getElementById('rewardSection').style.display = 'none';
    }
}

function showNewCustomerForm(phone) {
    document.getElementById('customerDisplay').style.display = 'none';
    document.getElementById('newCustomerForm').style.display = 'block';
}

function addNewCustomer() {
    const phone = document.getElementById('customerPhone').value.trim();
    const name = document.getElementById('newCustomerName').value.trim();
            
    appState.customers[phone] = {
        name: name || 'Customer',
        visits: 1,
        joinDate: new Date().toISOString(),
        lastVisit: new Date().toISOString()
    };

    appState.stats.totalCustomers++;
    appState.stats.visitsToday++;
            
    saveToStorage();
    updateStats();
    displayCustomer(appState.customers[phone], phone);
            
    showNotification(`Welcome ${name || 'new customer'}! First visit logged.`);
    document.getElementById('newCustomerName').value = '';

    // Simulate SMS notification
    if (appState.settings.smsNotifications) {
        setTimeout(() => {
            showNotification(`SMS sent: "Welcome to ${appState.currentBusiness.name}'s loyalty program!"`);
        }, 1000);
    }
}

function logVisit() {
    const phone = document.getElementById('customerPhone').value.trim();
    const customer = appState.customers[phone];
            
    if (customer) {
        customer.visits++;
        customer.lastVisit = new Date().toISOString();
        appState.stats.visitsToday++;
                
        saveToStorage();
        updateStats();
        displayCustomer(customer, phone);
                
        showNotification('Visit logged successfully!');

        // Check if reward was earned
        if (customer.visits === appState.settings.visitsRequired) {
            appState.stats.rewardsEarned++;
            updateStats();
            setTimeout(() => {
                showNotification('🎉 Customer earned a reward!');
                if (appState.settings.smsNotifications) {
                    setTimeout(() => {
                        showNotification(`SMS sent: "You've earned ${appState.settings.rewardDescription} at ${appState.currentBusiness.name}!"`);
                    }, 1000);
                }
            }, 500);
        }
    }
}

function redeemReward() {
    const phone = document.getElementById('customerPhone').value.trim();
    const customer = appState.customers[phone];
            
    if (customer && customer.visits >= appState.settings.visitsRequired) {
        customer.visits = 0; // Reset visit count
        appState.stats.rewardsRedeemed++;
                
        saveToStorage();
        updateStats();
        displayCustomer(customer, phone);
                
        showNotification('Reward redeemed successfully!');
                
        if (appState.settings.smsNotifications) {
            setTimeout(() => {
                showNotification(`SMS sent: "Your ${appState.settings.rewardDescription} has been redeemed. Thank you!"`);
            }, 1000);
        }
    }
}

// Settings Functions
function saveSettings() {
    appState.settings.visitsRequired = parseInt(document.getElementById('visitsRequired').value);
    appState.settings.rewardDescription = document.getElementById('rewardDescription').value;
    appState.settings.smsNotifications = document.getElementById('smsNotifications').checked;
            
    saveToStorage();
    showNotification('Settings saved successfully!');
}

// Load settings into form
function loadSettings() {
    document.getElementById('visitsRequired').value = appState.settings.visitsRequired;
    document.getElementById('rewardDescription').value = appState.settings.rewardDescription;
    document.getElementById('smsNotifications').checked = appState.settings.smsNotifications;
}

// Utility Functions
function updateStats() {
    document.getElementById('totalCustomers').textContent = appState.stats.totalCustomers;
    document.getElementById('visitsToday').textContent = appState.stats.visitsToday;
    document.getElementById('rewardsRedeemed').textContent = appState.stats.rewardsRedeemed;
    document.getElementById('rewardsEarned').textContent = appState.stats.rewardsEarned;
}

function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
            
    notificationText.textContent = message;
    notification.style.background = type === 'error' ? '#dc3545' : '#28a745';
    notification.classList.add('show');
            
    setTimeout(() => {
        notification.classList.remove('show');
    }, 4000);
}

function saveToStorage() {
    const data = JSON.stringify(appState);
    // In a real implementation, this would be sent to a backend API
    console.log('Saving to backend:', data);
}

function loadFromStorage() {
    // In a real implementation, this would load from a backend API
    // For demo purposes, we'll initialize with some sample data
    loadSettings();
}

// Initialize settings form when settings section is shown
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
});
    