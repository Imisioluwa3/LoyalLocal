// ===================================================================
// LOYALLOCAL - CUSTOMER MANAGEMENT MODULE
// ===================================================================
// This module handles customer list, profiles, tags, and bulk operations

// Customer data cache
let allCustomers = [];
let filteredCustomers = [];
let currentPage = 1;
const customersPerPage = 20;
let selectedCustomers = new Set();

// ===================================================================
// VIEW SWITCHING
// ===================================================================
function switchCustomerView(view) {
    const tabs = document.querySelectorAll('.customer-tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');

    document.getElementById('quickLookupView').style.display = view === 'quick' ? 'block' : 'none';
    document.getElementById('customerListView').style.display = view === 'list' ? 'block' : 'none';

    if (view === 'list') {
        loadCustomerList();
    }
}

// ===================================================================
// LOAD CUSTOMER LIST
// ===================================================================
async function loadCustomerList() {
    if (!currentBusiness) {
        console.error('No business loaded');
        return;
    }

    document.getElementById('customerListLoading').style.display = 'block';

    try {
        // Fetch all visits for this business
        const { data: visits, error } = await supabase
            .from('visits')
            .select('*')
            .eq('business_id', currentBusiness.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Group by customer phone number
        const customerMap = {};

        visits.forEach(visit => {
            if (!customerMap[visit.customer_phone_number]) {
                customerMap[visit.customer_phone_number] = {
                    phone: visit.customer_phone_number,
                    visits: [],
                    totalVisits: 0,
                    redeemed: 0,
                    firstVisit: visit.created_at,
                    lastVisit: visit.created_at
                };
            }

            customerMap[visit.customer_phone_number].visits.push(visit);
            customerMap[visit.customer_phone_number].totalVisits++;
            if (visit.is_redeemed_for_reward) {
                customerMap[visit.customer_phone_number].redeemed++;
            }

            // Update first and last visit dates
            if (new Date(visit.created_at) < new Date(customerMap[visit.customer_phone_number].firstVisit)) {
                customerMap[visit.customer_phone_number].firstVisit = visit.created_at;
            }
            if (new Date(visit.created_at) > new Date(customerMap[visit.customer_phone_number].lastVisit)) {
                customerMap[visit.customer_phone_number].lastVisit = visit.created_at;
            }
        });

        // Fetch customer profiles
        const { data: profiles, error: profileError } = await supabase
            .from('customer_profiles')
            .select('*')
            .eq('business_id', currentBusiness.id);

        if (profileError && profileError.code !== 'PGRST116') {
            console.error('Error fetching profiles:', profileError);
        }

        // Merge profile data with customer data
        if (profiles) {
            profiles.forEach(profile => {
                if (customerMap[profile.phone_number]) {
                    customerMap[profile.phone_number].profile = profile;
                    customerMap[profile.phone_number].name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
                }
            });
        }

        // Fetch customer tags
        const { data: tagAssignments, error: tagError } = await supabase
            .from('customer_tag_assignments')
            .select(`
                phone_number,
                customer_tags (
                    id,
                    name,
                    color
                )
            `)
            .eq('business_id', currentBusiness.id);

        if (tagError && tagError.code !== 'PGRST116') {
            console.error('Error fetching tags:', tagError);
        }

        // Merge tag data
        if (tagAssignments) {
            tagAssignments.forEach(assignment => {
                if (customerMap[assignment.phone_number]) {
                    if (!customerMap[assignment.phone_number].tags) {
                        customerMap[assignment.phone_number].tags = [];
                    }
                    customerMap[assignment.phone_number].tags.push(assignment.customer_tags);
                }
            });
        }

        allCustomers = Object.values(customerMap);
        filteredCustomers = [...allCustomers];

        // Check for inactive customers
        checkInactiveCustomers();

        // Display customers
        sortCustomers();

    } catch (error) {
        console.error('Error loading customer list:', error);
        showNotification('Error loading customers: ' + error.message, 'error');
    } finally {
        document.getElementById('customerListLoading').style.display = 'none';
    }
}

// ===================================================================
// FILTER & SORT
// ===================================================================
function filterCustomers() {
    const searchTerm = document.getElementById('customerSearch').value.toLowerCase();
    const segment = document.getElementById('segmentFilter').value;

    filteredCustomers = allCustomers.filter(customer => {
        // Search filter
        const matchesSearch = !searchTerm ||
            customer.phone.includes(searchTerm) ||
            (customer.name && customer.name.toLowerCase().includes(searchTerm));

        // Segment filter
        let matchesSegment = true;
        if (segment !== 'all') {
            const daysSinceLastVisit = Math.floor((new Date() - new Date(customer.lastVisit)) / (1000 * 60 * 60 * 24));

            switch (segment) {
                case 'vip':
                    matchesSegment = customer.totalVisits >= 10;
                    break;
                case 'regular':
                    matchesSegment = customer.totalVisits >= 3 && customer.totalVisits < 10;
                    break;
                case 'new':
                    matchesSegment = customer.totalVisits < 3;
                    break;
                case 'inactive':
                    matchesSegment = daysSinceLastVisit >= 60;
                    break;
            }
        }

        return matchesSearch && matchesSegment;
    });

    currentPage = 1;
    sortCustomers();
}

function sortCustomers() {
    const sortBy = document.getElementById('sortBy').value;

    filteredCustomers.sort((a, b) => {
        switch (sortBy) {
            case 'lastVisit':
                return new Date(b.lastVisit) - new Date(a.lastVisit);
            case 'totalVisits':
                return b.totalVisits - a.totalVisits;
            case 'name':
                const nameA = a.name || a.phone;
                const nameB = b.name || b.phone;
                return nameA.localeCompare(nameB);
            case 'firstVisit':
                return new Date(a.firstVisit) - new Date(b.firstVisit);
            default:
                return 0;
        }
    });

    renderCustomerTable();
}

// ===================================================================
// RENDER TABLE
// ===================================================================
function renderCustomerTable() {
    const tbody = document.getElementById('customerTableBody');
    const start = (currentPage - 1) * customersPerPage;
    const end = start + customersPerPage;
    const pageCustomers = filteredCustomers.slice(start, end);

    if (pageCustomers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #666;">
                    No customers found. ${filteredCustomers.length === 0 ? 'Try adjusting your filters.' : ''}
                </td>
            </tr>
        `;
        updatePagination();
        return;
    }

    tbody.innerHTML = pageCustomers.map(customer => {
        const daysSinceLastVisit = Math.floor((new Date() - new Date(customer.lastVisit)) / (1000 * 60 * 60 * 24));
        const status = getCustomerStatus(customer, daysSinceLastVisit);
        const formattedPhone = PhoneUtils.formatPhoneNumber(customer.phone, 'display');
        const displayName = customer.name || 'No name';

        return `
            <tr>
                <td><input type="checkbox" class="customer-checkbox" data-phone="${customer.phone}" onchange="toggleCustomerSelection('${customer.phone}')"></td>
                <td>
                    <div class="customer-cell">
                        <strong>${displayName}</strong>
                        ${daysSinceLastVisit >= 60 ? '<span class="inactive-badge">Inactive</span>' : ''}
                    </div>
                </td>
                <td>${formattedPhone}</td>
                <td><strong>${customer.totalVisits}</strong></td>
                <td>${formatDate(customer.lastVisit)}<br><small style="color: #666;">${daysSinceLastVisit} days ago</small></td>
                <td><span class="status-badge ${status.class}">${status.label}</span></td>
                <td>
                    <div class="tags-cell">
                        ${customer.tags ? customer.tags.map(tag =>
                            `<span class="tag-badge" style="background: ${tag.color}20; color: ${tag.color};">${tag.name}</span>`
                        ).join('') : '—'}
                    </div>
                </td>
                <td>
                    <button class="btn-icon" onclick="viewCustomerProfile('${customer.phone}')" title="View Profile">👤</button>
                    <button class="btn-icon" onclick="quickLogVisit('${customer.phone}')" title="Log Visit">➕</button>
                </td>
            </tr>
        `;
    }).join('');

    updatePagination();
}

// ===================================================================
// PAGINATION
// ===================================================================
function updatePagination() {
    const totalPages = Math.ceil(filteredCustomers.length / customersPerPage);
    document.getElementById('paginationInfo').textContent = `Page ${currentPage} of ${totalPages || 1}`;
    document.getElementById('prevPageBtn').disabled = currentPage === 1;
    document.getElementById('nextPageBtn').disabled = currentPage >= totalPages;
}

function nextPage() {
    const totalPages = Math.ceil(filteredCustomers.length / customersPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderCustomerTable();
    }
}

function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        renderCustomerTable();
    }
}

// ===================================================================
// CUSTOMER SELECTION
// ===================================================================
function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('.customer-checkbox');

    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
        if (selectAllCheckbox.checked) {
            selectedCustomers.add(checkbox.dataset.phone);
        } else {
            selectedCustomers.delete(checkbox.dataset.phone);
        }
    });
}

function toggleCustomerSelection(phone) {
    if (selectedCustomers.has(phone)) {
        selectedCustomers.delete(phone);
    } else {
        selectedCustomers.add(phone);
    }
}

// ===================================================================
// BULK ACTIONS
// ===================================================================
function exportCustomersCSV() {
    const customersToExport = selectedCustomers.size > 0
        ? allCustomers.filter(c => selectedCustomers.has(c.phone))
        : filteredCustomers;

    if (customersToExport.length === 0) {
        showNotification('No customers to export', 'error');
        return;
    }

    // Create CSV content
    const headers = ['Name', 'Phone', 'Total Visits', 'First Visit', 'Last Visit', 'Days Since Last Visit', 'Rewards Redeemed', 'Status', 'Tags'];
    const rows = customersToExport.map(customer => {
        const daysSinceLastVisit = Math.floor((new Date() - new Date(customer.lastVisit)) / (1000 * 60 * 60 * 24));
        const status = getCustomerStatus(customer, daysSinceLastVisit);
        const tags = customer.tags ? customer.tags.map(t => t.name).join('; ') : '';

        return [
            customer.name || 'No name',
            customer.phone,
            customer.totalVisits,
            new Date(customer.firstVisit).toLocaleDateString(),
            new Date(customer.lastVisit).toLocaleDateString(),
            daysSinceLastVisit,
            customer.redeemed,
            status.label,
            tags
        ];
    });

    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `loyallocal_customers_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification(`Exported ${customersToExport.length} customers to CSV`, 'success');
}

function showBulkSMSModal() {
    const count = selectedCustomers.size > 0 ? selectedCustomers.size : filteredCustomers.length;
    showNotification(`Bulk SMS feature coming soon! Would send to ${count} customers.`, 'info');
}

// ===================================================================
// INACTIVE CUSTOMER ALERTS
// ===================================================================
function checkInactiveCustomers() {
    const now = new Date();
    const inactiveThresholds = [30, 60, 90];

    const inactive30 = allCustomers.filter(c => {
        const daysSince = Math.floor((now - new Date(c.lastVisit)) / (1000 * 60 * 60 * 24));
        return daysSince >= 30 && daysSince < 60;
    }).length;

    const inactive60 = allCustomers.filter(c => {
        const daysSince = Math.floor((now - new Date(c.lastVisit)) / (1000 * 60 * 60 * 24));
        return daysSince >= 60 && daysSince < 90;
    }).length;

    const inactive90 = allCustomers.filter(c => {
        const daysSince = Math.floor((now - new Date(c.lastVisit)) / (1000 * 60 * 60 * 24));
        return daysSince >= 90;
    }).length;

    const totalInactive = inactive60 + inactive90;

    if (totalInactive > 0) {
        document.getElementById('inactiveAlert').style.display = 'flex';
        document.getElementById('inactiveCount').textContent =
            `${totalInactive} customers haven't visited in 60+ days (${inactive60} at 60-89 days, ${inactive90} at 90+ days)`;
    }
}

function showReEngagementModal() {
    const inactiveCustomers = allCustomers.filter(c => {
        const daysSince = Math.floor((new Date() - new Date(c.lastVisit)) / (1000 * 60 * 60 * 24));
        return daysSince >= 60;
    });

    const suggestions = generateReEngagementSuggestions(inactiveCustomers);

    // For now, show notification. Later can implement a modal.
    showNotification(`Re-engagement suggestions:\n${suggestions.join('\n')}`, 'info');
}

function generateReEngagementSuggestions(inactiveCustomers) {
    const businessName = currentBusiness.name || 'your business';
    const rewardDesc = currentBusiness.loyalty_reward_description || 'a special reward';

    return [
        `📱 Send personalized SMS: "Hi! We miss you at ${businessName}! Come back and get ${rewardDesc}"`,
        `🎁 Offer special comeback deal: "Welcome back discount - 20% off your next visit!"`,
        `💌 Personal outreach: Call top VIP customers who've gone inactive`,
        `📧 Email campaign: Send monthly newsletter with updates and special offers`,
        `🎯 Target by segment: Different messages for VIP vs. regular customers`
    ];
}

// ===================================================================
// CUSTOMER PROFILE VIEW
// ===================================================================
async function viewCustomerProfile(phone) {
    // Find customer data
    const customer = allCustomers.find(c => c.phone === phone);

    if (!customer) {
        showNotification('Customer not found', 'error');
        return;
    }

    // Use the proper profile modal
    if (typeof viewCustomerProfile !== 'undefined' && window.viewCustomerProfile) {
        window.viewCustomerProfile(phone);
    } else {
        // Fallback to simple alert
        const profileInfo = `
Customer Profile:
Name: ${customer.name || 'No name'}
Phone: ${PhoneUtils.formatPhoneNumber(customer.phone, 'display')}
Total Visits: ${customer.totalVisits}
First Visit: ${formatDate(customer.firstVisit)}
Last Visit: ${formatDate(customer.lastVisit)}
Rewards Redeemed: ${customer.redeemed}
Tags: ${customer.tags ? customer.tags.map(t => t.name).join(', ') : 'None'}
    `.trim();

        alert(profileInfo);
    }
}

async function quickLogVisit(phone) {
    try {
        const { data, error } = await supabase
            .from('visits')
            .insert({
                business_id: currentBusiness.id,
                phone_number: phone
            });

        if (error) throw error;

        showNotification('Visit logged successfully!', 'success');
        loadCustomerList(); // Refresh the list
    } catch (error) {
        console.error('Error logging visit:', error);
        showNotification('Error logging visit: ' + error.message, 'error');
    }
}

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================
function getCustomerStatus(customer, daysSinceLastVisit) {
    if (daysSinceLastVisit >= 90) {
        return { label: 'At Risk', class: 'status-risk' };
    } else if (daysSinceLastVisit >= 60) {
        return { label: 'Inactive', class: 'status-inactive' };
    } else if (customer.totalVisits >= 10) {
        return { label: 'VIP', class: 'status-vip' };
    } else if (customer.totalVisits >= 3) {
        return { label: 'Regular', class: 'status-regular' };
    } else {
        return { label: 'New', class: 'status-new' };
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}
