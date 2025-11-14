// ===================================================================
// LOYALLOCAL - CUSTOMER PROFILE MODULE
// ===================================================================
// Handles individual customer profiles with full history, notes, and tags

let currentProfileCustomer = null;

// ===================================================================
// OPEN CUSTOMER PROFILE MODAL
// ===================================================================
async function viewCustomerProfile(phone) {
    // Find customer in the allCustomers array
    const customer = allCustomers.find(c => c.phone === phone);

    if (!customer) {
        showNotification('Customer not found', 'error');
        return;
    }

    currentProfileCustomer = customer;

    // Show modal
    document.getElementById('customerProfileModal').style.display = 'flex';

    // Load profile data
    await loadCustomerProfileData(phone);
}

// ===================================================================
// HELPER: Parse customer name from visits
// ===================================================================
function parseCustomerName(customerName) {
    if (!customerName || !customerName.trim()) {
        return { first_name: '', last_name: '' };
    }

    const nameParts = customerName.trim().split(/\s+/);

    if (nameParts.length === 1) {
        // Single name like "Moses" -> put in first_name
        return {
            first_name: nameParts[0],
            last_name: ''
        };
    } else {
        // Multiple parts like "Mose Oluwajoba" -> first word is first_name, rest is last_name
        return {
            first_name: nameParts[0],
            last_name: nameParts.slice(1).join(' ')
        };
    }
}

// ===================================================================
// LOAD PROFILE DATA
// ===================================================================
async function loadCustomerProfileData(phone) {
    try {
        // Fetch or create customer profile
        let { data: profile, error } = await supabase
            .from('customer_profiles')
            .select('*')
            .eq('business_id', currentBusiness.id)
            .eq('phone_number', phone)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        // If no profile exists, initialize empty one
        if (!profile) {
            profile = {
                phone_number: phone,
                first_name: '',
                last_name: '',
                email: '',
                birthday: null,
                anniversary: null,
                notes: '',
                preferences: {}
            };
        }

        // If profile has no name, try to get it from customer visits data
        if (!profile.first_name && !profile.last_name && currentProfileCustomer.name) {
            const parsedName = parseCustomerName(currentProfileCustomer.name);
            profile.first_name = parsedName.first_name;
            profile.last_name = parsedName.last_name;
        }

        // Populate sidebar info
        const customer = currentProfileCustomer;
        const daysSinceLastVisit = Math.floor((new Date() - new Date(customer.lastVisit)) / (1000 * 60 * 60 * 24));
        const status = getCustomerStatus(customer, daysSinceLastVisit);

        // Profile initials and name display
        let displayName = 'No name set';
        let initials = phone.slice(-2);

        if (profile.first_name || profile.last_name) {
            displayName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
            if (profile.first_name && profile.last_name) {
                initials = `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
            } else if (profile.first_name) {
                initials = profile.first_name.substring(0, 2).toUpperCase();
            } else if (profile.last_name) {
                initials = profile.last_name.substring(0, 2).toUpperCase();
            }
        }

        document.getElementById('profileInitials').textContent = initials;
        document.getElementById('profileName').textContent = displayName;
        document.getElementById('profilePhone').textContent = PhoneUtils.formatPhoneNumber(phone, 'display');
        document.getElementById('profileStatus').textContent = status.label;
        document.getElementById('profileStatus').className = `status-badge ${status.class}`;

        // Profile stats
        document.getElementById('profileTotalVisits').textContent = customer.totalVisits;
        document.getElementById('profileRedeemed').textContent = customer.redeemed;
        document.getElementById('profileDaysSince').textContent = daysSinceLastVisit;

        // Fill form fields (now with auto-populated name from visits if profile is empty)
        document.getElementById('profileFirstName').value = profile.first_name || '';
        document.getElementById('profileLastName').value = profile.last_name || '';
        document.getElementById('profileEmail').value = profile.email || '';
        document.getElementById('profileBirthday').value = profile.birthday || '';
        document.getElementById('profileAnniversary').value = profile.anniversary || '';
        document.getElementById('profileNotes').value = profile.notes || '';
        document.getElementById('profilePreferences').value =
            profile.preferences && Object.keys(profile.preferences).length > 0
                ? JSON.stringify(profile.preferences, null, 2)
                : '';

        // Load visit history
        loadVisitHistory(phone);

        // Load tags
        loadCustomerTags(phone);

    } catch (error) {
        console.error('Error loading profile:', error);
        showNotification('Error loading profile: ' + error.message, 'error');
    }
}

// ===================================================================
// SAVE PROFILE
// ===================================================================
async function saveCustomerProfile() {
    if (!currentProfileCustomer) return;

    const phone = currentProfileCustomer.phone;

    try {
        // Parse preferences JSON
        let preferences = {};
        const preferencesText = document.getElementById('profilePreferences').value.trim();
        if (preferencesText) {
            try {
                preferences = JSON.parse(preferencesText);
            } catch (e) {
                showNotification('Invalid JSON in preferences field', 'error');
                return;
            }
        }

        const profileData = {
            business_id: currentBusiness.id,
            phone_number: phone,
            first_name: document.getElementById('profileFirstName').value.trim(),
            last_name: document.getElementById('profileLastName').value.trim(),
            email: document.getElementById('profileEmail').value.trim(),
            birthday: document.getElementById('profileBirthday').value || null,
            anniversary: document.getElementById('profileAnniversary').value || null,
            notes: document.getElementById('profileNotes').value.trim(),
            preferences: preferences
        };

        // Upsert profile
        const { data, error } = await supabase
            .from('customer_profiles')
            .upsert(profileData, {
                onConflict: 'business_id,phone_number'
            });

        if (error) throw error;

        showNotification('Customer profile saved successfully!', 'success');

        // Reload customer list to reflect changes
        if (typeof loadCustomerList === 'function') {
            loadCustomerList();
        }

    } catch (error) {
        console.error('Error saving profile:', error);
        showNotification('Error saving profile: ' + error.message, 'error');
    }
}

// ===================================================================
// VISIT HISTORY
// ===================================================================
async function loadVisitHistory(phone) {
    try {
        const { data: visits, error } = await supabase
            .from('visits')
            .select('*')
            .eq('business_id', currentBusiness.id)
            .eq('customer_phone_number', phone)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const timeline = document.getElementById('visitTimeline');
        document.getElementById('visitHistoryCount').textContent = `${visits.length} visits total`;

        if (visits.length === 0) {
            timeline.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">No visit history yet.</p>';
            return;
        }

        timeline.innerHTML = visits.map((visit, index) => {
            const date = new Date(visit.created_at);
            const isRedeemed = visit.is_redeemed_for_reward;

            return `
                <div class="visit-item">
                    <div class="visit-marker ${isRedeemed ? 'redeemed' : ''}">
                        ${isRedeemed ? '🎁' : index + 1}
                    </div>
                    <div class="visit-content">
                        <div class="visit-date">
                            ${date.toLocaleDateString('en-US', {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                            })}
                            <span class="visit-time">${date.toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit'
                            })}</span>
                        </div>
                        ${isRedeemed ? '<div class="visit-reward">Reward Redeemed</div>' : ''}
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading visit history:', error);
        showNotification('Error loading visit history: ' + error.message, 'error');
    }
}

// ===================================================================
// CUSTOMER TAGS MANAGEMENT
// ===================================================================
async function loadCustomerTags(phone) {
    try {
        // Fetch all tags for this business
        const { data: allTags, error: tagsError } = await supabase
            .from('customer_tags')
            .select('*')
            .eq('business_id', currentBusiness.id);

        if (tagsError) throw tagsError;

        // Fetch current tag assignments for this customer
        const { data: assignments, error: assignError } = await supabase
            .from('customer_tag_assignments')
            .select('tag_id')
            .eq('business_id', currentBusiness.id)
            .eq('phone_number', phone);

        if (assignError) throw assignError;

        const assignedTagIds = assignments ? assignments.map(a => a.tag_id) : [];

        // Display current tags
        const currentTagsDiv = document.getElementById('currentTags');
        const assignedTags = allTags ? allTags.filter(t => assignedTagIds.includes(t.id)) : [];

        if (assignedTags.length === 0) {
            currentTagsDiv.innerHTML = '<p style="color: #666;">No tags assigned yet.</p>';
        } else {
            currentTagsDiv.innerHTML = assignedTags.map(tag => `
                <div class="tag-item" style="background: ${tag.color}20; border: 1px solid ${tag.color};">
                    <span style="color: ${tag.color}; font-weight: 600;">${tag.name}</span>
                    <button class="tag-remove-btn" onclick="removeCustomerTag('${phone}', '${tag.id}')">&times;</button>
                </div>
            `).join('');
        }

        // Display available tags
        const availableTagsDiv = document.getElementById('availableTags');
        const availableTags = allTags ? allTags.filter(t => !assignedTagIds.includes(t.id)) : [];

        if (availableTags.length === 0) {
            availableTagsDiv.innerHTML = '<p style="color: #666;">All tags assigned or create new tags.</p>';
        } else {
            availableTagsDiv.innerHTML = availableTags.map(tag => `
                <button class="tag-option" style="background: ${tag.color}20; color: ${tag.color}; border: 1px solid ${tag.color};"
                        onclick="assignCustomerTag('${phone}', '${tag.id}')">
                    + ${tag.name}
                </button>
            `).join('');
        }

    } catch (error) {
        console.error('Error loading tags:', error);
        showNotification('Error loading tags: ' + error.message, 'error');
    }
}

async function assignCustomerTag(phone, tagId) {
    try {
        const { data, error } = await supabase
            .from('customer_tag_assignments')
            .insert({
                business_id: currentBusiness.id,
                phone_number: phone,
                tag_id: tagId
            });

        if (error) throw error;

        showNotification('Tag assigned successfully!', 'success');
        loadCustomerTags(phone);

        // Reload customer list to reflect changes
        if (typeof loadCustomerList === 'function') {
            loadCustomerList();
        }

    } catch (error) {
        console.error('Error assigning tag:', error);
        showNotification('Error assigning tag: ' + error.message, 'error');
    }
}

async function removeCustomerTag(phone, tagId) {
    try {
        const { data, error } = await supabase
            .from('customer_tag_assignments')
            .delete()
            .eq('business_id', currentBusiness.id)
            .eq('phone_number', phone)
            .eq('tag_id', tagId);

        if (error) throw error;

        showNotification('Tag removed successfully!', 'success');
        loadCustomerTags(phone);

        // Reload customer list to reflect changes
        if (typeof loadCustomerList === 'function') {
            loadCustomerList();
        }

    } catch (error) {
        console.error('Error removing tag:', error);
        showNotification('Error removing tag: ' + error.message, 'error');
    }
}

function showCreateTagModal() {
    const tagName = prompt('Enter tag name:');
    if (!tagName) return;

    const tagColor = prompt('Enter tag color (hex code, e.g., #3b82f6):') || '#3b82f6';

    createNewTag(tagName, tagColor);
}

async function createNewTag(name, color) {
    try {
        const { data, error } = await supabase
            .from('customer_tags')
            .insert({
                business_id: currentBusiness.id,
                name: name.trim(),
                color: color,
                description: ''
            });

        if (error) throw error;

        showNotification('Tag created successfully!', 'success');

        if (currentProfileCustomer) {
            loadCustomerTags(currentProfileCustomer.phone);
        }

    } catch (error) {
        console.error('Error creating tag:', error);
        showNotification('Error creating tag: ' + error.message, 'error');
    }
}

// ===================================================================
// PROFILE ACTIONS
// ===================================================================
async function logVisitFromProfile() {
    if (!currentProfileCustomer) return;

    try {
        const { data, error } = await supabase
            .from('visits')
            .insert({
                business_id: currentBusiness.id,
                customer_phone_number: currentProfileCustomer.phone
            });

        if (error) throw error;

        showNotification('Visit logged successfully!', 'success');

        // Reload profile data
        await loadCustomerProfileData(currentProfileCustomer.phone);

        // Reload customer list
        if (typeof loadCustomerList === 'function') {
            loadCustomerList();
        }

    } catch (error) {
        console.error('Error logging visit:', error);
        showNotification('Error logging visit: ' + error.message, 'error');
    }
}

async function deleteCustomerProfile() {
    if (!currentProfileCustomer) return;

    const confirm = window.confirm(
        `Are you sure you want to delete all data for this customer?\n\n` +
        `This will permanently delete:\n` +
        `- Customer profile\n` +
        `- All visit history (${currentProfileCustomer.totalVisits} visits)\n` +
        `- All tag assignments\n\n` +
        `This action cannot be undone.`
    );

    if (!confirm) return;

    try {
        const phone = currentProfileCustomer.phone;

        // Delete profile
        const { error: profileError } = await supabase
            .from('customer_profiles')
            .delete()
            .eq('business_id', currentBusiness.id)
            .eq('phone_number', phone);

        if (profileError) throw profileError;

        // Delete tag assignments
        const { error: tagError } = await supabase
            .from('customer_tag_assignments')
            .delete()
            .eq('business_id', currentBusiness.id)
            .eq('phone_number', phone);

        if (tagError) throw tagError;

        // Delete visits
        const { error: visitsError } = await supabase
            .from('visits')
            .delete()
            .eq('business_id', currentBusiness.id)
            .eq('customer_phone_number', phone);

        if (visitsError) throw visitsError;

        showNotification('Customer deleted successfully!', 'success');

        // Close modal and reload list
        closeCustomerProfileModal();

        if (typeof loadCustomerList === 'function') {
            loadCustomerList();
        }

    } catch (error) {
        console.error('Error deleting customer:', error);
        showNotification('Error deleting customer: ' + error.message, 'error');
    }
}

// ===================================================================
// MODAL CONTROLS
// ===================================================================
function closeCustomerProfileModal() {
    document.getElementById('customerProfileModal').style.display = 'none';
    currentProfileCustomer = null;
}

function switchProfileTab(tabName) {
    // Update tab buttons
    const tabs = document.querySelectorAll('.profile-tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');

    // Show/hide tab content
    document.getElementById('detailsTab').style.display = tabName === 'details' ? 'block' : 'none';
    document.getElementById('historyTab').style.display = tabName === 'history' ? 'block' : 'none';
    document.getElementById('tagsTab').style.display = tabName === 'tags' ? 'block' : 'none';
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    const modal = document.getElementById('customerProfileModal');
    if (event.target === modal) {
        closeCustomerProfileModal();
    }
});
