// ===================================================================
// LOYALLOCAL - ADVANCED ANALYTICS MODULE
// ===================================================================
// This module handles all analytics, charts, and insights

// Global chart instances
let visitsTrendChart = null;
let customerRetentionChart = null;
let peakHoursChart = null;
let customerSegmentChart = null;
let dayOfWeekChart = null;
let redemptionChart = null;

// Current analytics data cache
let analyticsData = {
    visits: [],
    customers: {},
    dateRange: 30
};

// ===================================================================
// MAIN ANALYTICS LOADER
// ===================================================================
async function loadAnalytics() {
    if (!currentBusiness) {
        console.error('No business loaded');
        return;
    }

    const dateRange = document.getElementById('analyticsDateRange').value;
    analyticsData.dateRange = dateRange;

    // Show loading state
    document.getElementById('analyticsLoading').style.display = 'block';

    try {
        // Calculate date range
        const startDate = getStartDate(dateRange);

        // Fetch visits data
        const { data: visits, error } = await supabase
            .from('visits')
            .select('*')
            .eq('business_id', currentBusiness.id)
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: true });

        if (error) throw error;

        analyticsData.visits = visits || [];

        // Process and display analytics
        await processAnalyticsData();
        displayKeyMetrics();
        renderAllCharts();
        loadComparativeMetrics();
        loadGoals();

    } catch (error) {
        console.error('Error loading analytics:', error);
        showNotification('Error loading analytics: ' + error.message, 'error');
    } finally {
        document.getElementById('analyticsLoading').style.display = 'none';
    }
}

// ===================================================================
// DATA PROCESSING
// ===================================================================
async function processAnalyticsData() {
    const visits = analyticsData.visits;
    const customers = {};

    // Group visits by customer
    visits.forEach(visit => {
        if (!customers[visit.customer_phone_number]) {
            customers[visit.customer_phone_number] = {
                phone: visit.customer_phone_number,
                visits: [],
                totalVisits: 0,
                redeemed: 0,
                firstVisit: visit.created_at,
                lastVisit: visit.created_at
            };
        }

        customers[visit.customer_phone_number].visits.push(visit);
        customers[visit.customer_phone_number].totalVisits++;
        if (visit.is_redeemed_for_reward) {
            customers[visit.customer_phone_number].redeemed++;
        }

        // Update first and last visit dates
        if (new Date(visit.created_at) < new Date(customers[visit.customer_phone_number].firstVisit)) {
            customers[visit.customer_phone_number].firstVisit = visit.created_at;
        }
        if (new Date(visit.created_at) > new Date(customers[visit.customer_phone_number].lastVisit)) {
            customers[visit.customer_phone_number].lastVisit = visit.created_at;
        }
    });

    analyticsData.customers = customers;
}

// ===================================================================
// KEY METRICS DISPLAY
// ===================================================================
function displayKeyMetrics() {
    const visits = analyticsData.visits;
    const customers = analyticsData.customers;
    const customerArray = Object.values(customers);

    // Total visits
    document.getElementById('totalVisitsMetric').textContent = visits.length;

    // Unique customers
    document.getElementById('uniqueCustomersMetric').textContent = customerArray.length;

    // Returning customers percentage
    const returningCustomers = customerArray.filter(c => c.totalVisits > 1).length;
    const returningPercentage = customerArray.length > 0
        ? Math.round((returningCustomers / customerArray.length) * 100)
        : 0;
    document.getElementById('returningCustomersMetric').textContent = returningPercentage + '%';

    // Redemption rate
    const totalRedeemed = visits.filter(v => v.is_redeemed_for_reward).length;
    const eligibleForReward = Math.floor(visits.length / (currentBusiness.loyalty_visits_required || 5));
    const redemptionRate = eligibleForReward > 0
        ? Math.round((totalRedeemed / eligibleForReward) * 100)
        : 0;
    document.getElementById('redemptionRateMetric').textContent = redemptionRate + '%';

    // Average visits per customer
    const avgVisits = customerArray.length > 0
        ? (visits.length / customerArray.length).toFixed(1)
        : 0;
    document.getElementById('avgVisitsPerCustomer').textContent = avgVisits;

    // Peak day
    const peakDay = calculatePeakDay(visits);
    document.getElementById('peakDayMetric').textContent = peakDay.day;
    document.getElementById('peakDayTime').textContent = peakDay.time;
}

// ===================================================================
// CHART RENDERING
// ===================================================================
function renderAllCharts() {
    renderVisitsTrendChart('daily');
    renderCustomerRetentionChart();
    renderPeakHoursChart();
    renderCustomerSegmentChart();
    renderDayOfWeekChart();
    renderRedemptionChart();
}

// Visits Trend Chart (Line Chart)
function renderVisitsTrendChart(groupBy = 'daily') {
    const canvas = document.getElementById('visitsTrendChart');
    const ctx = canvas.getContext('2d');

    // Destroy existing chart
    if (visitsTrendChart) {
        visitsTrendChart.destroy();
    }

    const chartData = aggregateVisitsByTime(analyticsData.visits, groupBy);

    visitsTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Visits',
                data: chartData.values,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

// Customer Retention Chart (Doughnut)
function renderCustomerRetentionChart() {
    const canvas = document.getElementById('customerRetentionChart');
    const ctx = canvas.getContext('2d');

    if (customerRetentionChart) {
        customerRetentionChart.destroy();
    }

    const customers = Object.values(analyticsData.customers);
    const newCustomers = customers.filter(c => c.totalVisits === 1).length;
    const returningCustomers = customers.filter(c => c.totalVisits > 1).length;

    customerRetentionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['New Customers', 'Returning Customers'],
            datasets: [{
                data: [newCustomers, returningCustomers],
                backgroundColor: ['#10b981', '#3b82f6'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Peak Hours Chart (Bar Chart)
function renderPeakHoursChart() {
    const canvas = document.getElementById('peakHoursChart');
    const ctx = canvas.getContext('2d');

    if (peakHoursChart) {
        peakHoursChart.destroy();
    }

    const hourlyData = aggregateVisitsByHour(analyticsData.visits);

    peakHoursChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: hourlyData.labels,
            datasets: [{
                label: 'Visits',
                data: hourlyData.values,
                backgroundColor: '#8b5cf6',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

// Customer Segment Chart (Pie Chart)
function renderCustomerSegmentChart() {
    const canvas = document.getElementById('customerSegmentChart');
    const ctx = canvas.getContext('2d');

    if (customerSegmentChart) {
        customerSegmentChart.destroy();
    }

    const customers = Object.values(analyticsData.customers);
    const vip = customers.filter(c => c.totalVisits >= 10).length;
    const regular = customers.filter(c => c.totalVisits >= 3 && c.totalVisits < 10).length;
    const onetime = customers.filter(c => c.totalVisits < 3).length;

    // Update segment stats
    document.getElementById('vipCount').textContent = vip;
    document.getElementById('regularCount').textContent = regular;
    document.getElementById('onetimeCount').textContent = onetime;

    customerSegmentChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['VIP (10+)', 'Regular (3-9)', 'One-time (<3)'],
            datasets: [{
                data: [vip, regular, onetime],
                backgroundColor: ['#8b5cf6', '#3b82f6', '#10b981'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Day of Week Chart (Bar Chart)
function renderDayOfWeekChart() {
    const canvas = document.getElementById('dayOfWeekChart');
    const ctx = canvas.getContext('2d');

    if (dayOfWeekChart) {
        dayOfWeekChart.destroy();
    }

    const dowData = aggregateVisitsByDayOfWeek(analyticsData.visits);

    dayOfWeekChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            datasets: [{
                label: 'Visits',
                data: dowData,
                backgroundColor: '#10b981',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

// Redemption Chart (Line Chart)
function renderRedemptionChart() {
    const canvas = document.getElementById('redemptionChart');
    const ctx = canvas.getContext('2d');

    if (redemptionChart) {
        redemptionChart.destroy();
    }

    const redemptionData = aggregateRedemptionsByTime(analyticsData.visits);

    redemptionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: redemptionData.labels,
            datasets: [{
                label: 'Rewards Redeemed',
                data: redemptionData.values,
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

// ===================================================================
// DATA AGGREGATION HELPERS
// ===================================================================
function aggregateVisitsByTime(visits, groupBy) {
    const dataMap = {};

    visits.forEach(visit => {
        const date = new Date(visit.created_at);
        let key;

        if (groupBy === 'daily') {
            key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } else if (groupBy === 'weekly') {
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            key = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } else if (groupBy === 'monthly') {
            key = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        }

        dataMap[key] = (dataMap[key] || 0) + 1;
    });

    return {
        labels: Object.keys(dataMap),
        values: Object.values(dataMap)
    };
}

function aggregateVisitsByHour(visits) {
    const hours = Array(24).fill(0);

    visits.forEach(visit => {
        const hour = new Date(visit.created_at).getHours();
        hours[hour]++;
    });

    // Only show hours with data (6 AM to 10 PM typically)
    const activeHours = [];
    const activeCounts = [];

    for (let i = 6; i <= 22; i++) {
        activeHours.push(`${i % 12 || 12}${i < 12 ? 'AM' : 'PM'}`);
        activeCounts.push(hours[i]);
    }

    return {
        labels: activeHours,
        values: activeCounts
    };
}

function aggregateVisitsByDayOfWeek(visits) {
    const days = Array(7).fill(0);

    visits.forEach(visit => {
        const day = new Date(visit.created_at).getDay();
        days[day]++;
    });

    return days;
}

function aggregateRedemptionsByTime(visits) {
    const dataMap = {};

    visits.filter(v => v.is_redeemed_for_reward).forEach(visit => {
        const date = new Date(visit.created_at);
        const key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dataMap[key] = (dataMap[key] || 0) + 1;
    });

    return {
        labels: Object.keys(dataMap),
        values: Object.values(dataMap)
    };
}

// ===================================================================
// COMPARATIVE METRICS
// ===================================================================
async function loadComparativeMetrics() {
    try {
        // Week over Week
        const thisWeek = await getVisitCount(7);
        const lastWeek = await getVisitCount(14, 7);
        const wowChange = calculatePercentageChange(lastWeek, thisWeek);
        document.getElementById('wowVisits').innerHTML = formatChangeValue(wowChange);

        // Month over Month
        const thisMonth = await getVisitCount(30);
        const lastMonth = await getVisitCount(60, 30);
        const momChange = calculatePercentageChange(lastMonth, thisMonth);
        document.getElementById('momVisits').innerHTML = formatChangeValue(momChange);

        // Year to Date
        const ytdStart = new Date(new Date().getFullYear(), 0, 1);
        const { data: ytdVisits } = await supabase
            .from('visits')
            .select('id', { count: 'exact', head: true })
            .eq('business_id', currentBusiness.id)
            .gte('created_at', ytdStart.toISOString());

        const ytdCount = ytdVisits?.length || 0;
        document.getElementById('ytdVisits').textContent = ytdCount;

        const daysSinceYearStart = Math.floor((new Date() - ytdStart) / (1000 * 60 * 60 * 24));
        const ytdAvg = daysSinceYearStart > 0 ? (ytdCount / daysSinceYearStart).toFixed(1) : 0;
        document.getElementById('ytdAvg').textContent = ytdAvg;

    } catch (error) {
        console.error('Error loading comparative metrics:', error);
    }
}

async function getVisitCount(days, offset = 0) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - offset);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
        .from('visits')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', currentBusiness.id)
        .gte('created_at', startDate.toISOString())
        .lt('created_at', endDate.toISOString());

    if (error) {
        console.error('Error getting visit count:', error);
        return 0;
    }

    return data?.length || 0;
}

function calculatePercentageChange(oldValue, newValue) {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return ((newValue - oldValue) / oldValue) * 100;
}

function formatChangeValue(change) {
    const sign = change >= 0 ? '+' : '';
    const color = change >= 0 ? '#10b981' : '#ef4444';
    const arrow = change >= 0 ? '↑' : '↓';
    return `<span style="color: ${color}; font-weight: bold;">${arrow} ${sign}${change.toFixed(1)}%</span>`;
}

// ===================================================================
// REVENUE IMPACT CALCULATOR
// ===================================================================
function calculateRevenueImpact() {
    const avgTransaction = parseFloat(document.getElementById('avgTransactionValue').value) || 0;
    const rewardCost = parseFloat(document.getElementById('rewardCost').value) || 0;

    if (avgTransaction === 0) {
        showNotification('Please enter average transaction value', 'error');
        return;
    }

    const totalVisits = analyticsData.visits.length;
    const totalRedemptions = analyticsData.visits.filter(v => v.is_redeemed_for_reward).length;

    const totalRevenue = totalVisits * avgTransaction;
    const programCost = totalRedemptions * rewardCost;
    const netBenefit = totalRevenue - programCost;
    const roi = programCost > 0 ? ((netBenefit / programCost) * 100) : 0;

    // Format as Nigerian Naira
    document.getElementById('totalRevenue').textContent = '₦' + totalRevenue.toLocaleString();
    document.getElementById('programCost').textContent = '₦' + programCost.toLocaleString();
    document.getElementById('netBenefit').textContent = '₦' + netBenefit.toLocaleString();
    document.getElementById('roiPercentage').textContent = roi.toFixed(1) + '%';

    document.getElementById('revenueResults').style.display = 'block';
}

// ===================================================================
// GOAL TRACKING
// ===================================================================
async function loadGoals() {
    try {
        const { data: goals, error } = await supabase
            .from('business_goals')
            .select('*')
            .eq('business_id', currentBusiness.id)
            .eq('status', 'active')
            .order('period_start', { ascending: false });

        if (error) throw error;

        const goalsContainer = document.getElementById('goalsList');

        if (!goals || goals.length === 0) {
            goalsContainer.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">No active goals. Click "Set New Goal" to create one.</p>';
            return;
        }

        goalsContainer.innerHTML = goals.map(goal => {
            const progress = goal.target_value > 0 ? (goal.current_value / goal.target_value) * 100 : 0;
            return `
                <div class="goal-card">
                    <div class="goal-info">
                        <div class="goal-title">${formatGoalType(goal.goal_type)}</div>
                        <div class="goal-period">${new Date(goal.period_start).toLocaleDateString()} - ${new Date(goal.period_end).toLocaleDateString()}</div>
                    </div>
                    <div class="goal-progress">
                        <div class="goal-stats">
                            <span>${goal.current_value} / ${goal.target_value}</span>
                            <span>${progress.toFixed(0)}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${Math.min(progress, 100)}%;"></div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading goals:', error);
    }
}

function formatGoalType(type) {
    const typeMap = {
        'monthly_visits': 'Monthly Visits Goal',
        'new_customers': 'New Customers Goal',
        'revenue': 'Revenue Goal'
    };
    return typeMap[type] || type;
}

function showGoalModal() {
    // TODO: Implement goal creation modal
    showNotification('Goal creation feature coming soon!', 'info');
}

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================
function getStartDate(rangeValue) {
    const now = new Date();

    if (rangeValue === 'all') {
        return new Date(0); // Beginning of time
    }

    const days = parseInt(rangeValue);
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - days);
    return startDate;
}

function calculatePeakDay(visits) {
    const dayCount = {};
    const hourCount = {};

    visits.forEach(visit => {
        const date = new Date(visit.created_at);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const hour = date.getHours();

        dayCount[dayName] = (dayCount[dayName] || 0) + 1;
        hourCount[hour] = (hourCount[hour] || 0) + 1;
    });

    const peakDay = Object.keys(dayCount).reduce((a, b) =>
        dayCount[a] > dayCount[b] ? a : b, 'N/A');

    const peakHour = Object.keys(hourCount).reduce((a, b) =>
        hourCount[a] > hourCount[b] ? a : b, null);

    const peakTime = peakHour
        ? `${peakHour % 12 || 12}${parseInt(peakHour) < 12 ? 'AM' : 'PM'}`
        : 'N/A';

    return {
        day: peakDay,
        time: `Peak: ${peakTime}`
    };
}

function updateVisitsChart(groupBy) {
    // Update button states
    document.querySelectorAll('.chart-controls .chart-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Re-render chart
    renderVisitsTrendChart(groupBy);
}
