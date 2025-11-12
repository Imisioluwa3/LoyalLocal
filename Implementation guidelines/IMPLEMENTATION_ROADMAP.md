# LoyalLocal Implementation Roadmap

## Document Summary

This is a comprehensive guide for implementing new features in the LoyalLocal codebase. It provides:

1. Current architecture overview
2. Database schema documentation
3. Key function references with code
4. Files that need modification
5. Step-by-step implementation guides

---

## Quick Start: Adding a New Feature

### Template for New Features

1. **Create directory structure:**
   ```
   /feature-name/
   ├── index.html      (UI markup)
   ├── script.js       (Logic & API calls)
   └── style.css       (Styling)
   ```

2. **Copy basic template from existing feature** (e.g., `/business/`)

3. **Update main navigation** to link to new feature

4. **Implement Supabase queries** following patterns in business/customer scripts

5. **Test with sample data** in Supabase dashboard

---

## Key Absolute File Paths

```
/home/enoch/Desktop/Github\ repos/LoyalLocal/

Main Files:
- index.html           # Homepage
- script.js           # Homepage logic
- style.css           # Homepage styles
- config.example.js   # Configuration template

Business Portal:
- business/index.html
- business/script.js
- business/style.css

Customer Portal:
- customer/index.html
- customer/script.js
- customer/style.css

Utilities:
- utils/phone.js      # Phone number utilities

Assets:
- assets/favico.svg
- assets/images/

Documentation:
- REAMD.md
- SECURITY_SETUP.md
- SECURITY_QUICK_START.md
- HOSTING_OPTIONS.md
```

---

## Database Connection Details

**Supabase Project:**
- URL: https://mhwsjjumsiveahfckcwr.supabase.co
- Tables: businesses, visits
- Auth: Email/password with JWT

**Connection in Code:**
```javascript
const supabase = window.supabase.createClient(
    'https://mhwsjjumsiveahfckcwr.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1od3NqanVtc2l2ZWFoZmNrY3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMTc4MTQsImV4cCI6MjA2MzU5MzgxNH0.5varGB23DXpfi1adlwejmYwLlTbbjCPfKGDm9rWEQBo',
    { auth: { persistSession: true, autoRefreshToken: true } }
);
```

---

## Data Access Patterns

### 1. Get Current User's Business
```javascript
const { data: { user } } = await supabase.auth.getUser();
const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('user_id', user.id)
    .single();
```

### 2. Query Customer Visits
```javascript
const { data: visits } = await supabase
    .from('visits')
    .select('*')
    .eq('business_id', businessId)
    .eq('customer_phone_number', normalizedPhone);
```

### 3. Count Records
```javascript
const { count } = await supabase
    .from('visits')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId);
```

### 4. Aggregate Data
```javascript
// In JavaScript (no SQL aggregation in Supabase JS)
const { data: visits } = await supabase.from('visits').select('*');
const byCustomer = {};
visits.forEach(v => {
    byCustomer[v.customer_phone_number] = 
        (byCustomer[v.customer_phone_number] || 0) + 1;
});
```

---

## UI Component Patterns

### Stat Card
```html
<div class="stat-card">
    <span class="stat-number" id="metric">0</span>
    <div class="stat-label">Label</div>
</div>
```

### Form Group
```html
<div class="form-group">
    <label for="fieldId">Label</label>
    <input type="text" id="fieldId" placeholder="Placeholder">
    <div class="error-message">Error text</div>
</div>
```

### Loading State
```html
<div id="loadingState" class="loading-state" style="display: none;">
    <div class="loader"></div>
    <p>Loading...</p>
</div>
```

### Notification
```html
<div id="notification" class="notification">
    <span id="notificationText"></span>
</div>

<script>
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    setTimeout(() => notification.classList.remove('show'), 5000);
}
</script>
```

---

## Common Query Scenarios

### Scenario 1: Get Dashboard Metrics
```javascript
async function loadDashboard(businessId) {
    // Get stats
    const { data: visits } = await supabase
        .from('visits')
        .select('*')
        .eq('business_id', businessId);
    
    const uniqueCustomers = new Set(visits.map(v => v.customer_phone_number)).size;
    const todayVisits = visits.filter(v => {
        const date = new Date(v.created_at).toISOString().split('T')[0];
        const today = new Date().toISOString().split('T')[0];
        return date === today;
    }).length;
    const redeemed = visits.filter(v => v.is_redeemed_for_reward).length;
    
    return { uniqueCustomers, todayVisits, redeemed };
}
```

### Scenario 2: Add and Update Visit
```javascript
async function logVisitAndUpdate(businessId, phoneNumber, customerName) {
    // Add visit
    const { error: insertError } = await supabase
        .from('visits')
        .insert({
            business_id: businessId,
            customer_phone_number: phoneNumber,
            customer_name: customerName,
            is_redeemed_for_reward: false
        });
    
    if (insertError) throw insertError;
    
    // Refresh stats
    return loadDashboard(businessId);
}
```

### Scenario 3: Mark Visits as Redeemed
```javascript
async function redeemVisits(visitIds) {
    const { error } = await supabase
        .from('visits')
        .update({ is_redeemed_for_reward: true })
        .in('id', visitIds);
    
    if (error) throw error;
}
```

### Scenario 4: Search Across Formats
```javascript
async function findCustomerByPhone(phone, businessId) {
    const variations = [
        phone,
        normalizePhoneNumber(phone),
        formatPhoneNumber(phone)
    ];
    
    for (const variation of variations) {
        const { data } = await supabase
            .from('visits')
            .select('*')
            .eq('business_id', businessId)
            .eq('customer_phone_number', variation);
        
        if (data && data.length > 0) {
            return data;
        }
    }
    return null;
}
```

---

## CSS Classes Reference

### Layout
- `.container` - Max width wrapper
- `.stats-grid` - Responsive grid
- `.form-group` - Form field container
- `.auth-container` - Auth section
- `.dashboard` - Main dashboard layout
- `.nav-btn` - Navigation buttons

### States
- `.active` - Active tab/button
- `.loading-state` - Loading spinner
- `.show` - Visible notification
- `.error` - Error state
- `.success` - Success state

### Components
- `.stat-card` - Metric card
- `.loyalty-card` - Customer loyalty display
- `.progress-bar` - Progress indicator
- `.btn` - Button style
- `.notification` - Toast notification

---

## Function Naming Conventions

### Async Database Functions
```javascript
// Pattern: action + resource
async function getCustomerVisits() { }
async function logNewVisit() { }
async function updateBusinessSettings() { }
async function deleteVisitRecord() { }
```

### UI Functions
```javascript
// Pattern: show/hide + component
function showDashboard() { }
function hideDashboard() { }
function displayCustomer(data) { }
function createLoyaltyCard(data) { }
```

### Validation Functions
```javascript
// Pattern: validate + field
function validateEmail(email) { }
function validatePhoneNumber(phone) { }
function validatePassword(password) { }
```

### Utility Functions
```javascript
// Pattern: action + type
function normalizePhoneNumber(phone) { }
function formatPhoneNumber(phone) { }
function generatePhoneVariations(phone) { }
```

---

## Testing Checklist for New Features

- [ ] Feature loads without console errors
- [ ] All database queries execute successfully
- [ ] User authentication working (if needed)
- [ ] Form validation working
- [ ] Error handling displays messages
- [ ] Loading states display correctly
- [ ] Data displays correctly on screen
- [ ] Responsive design works on mobile
- [ ] Phone number formatting works for all formats
- [ ] Supabase RLS policies allow access

---

## Deployment Checklist

Before pushing to production (GitHub Pages):

- [ ] No hardcoded test data
- [ ] All error messages are user-friendly
- [ ] Loading states prevent double-submission
- [ ] Sensitive credentials in config (not hardcoded)
- [ ] All external resources load successfully
- [ ] Mobile responsive layout tested
- [ ] Performance acceptable (< 3s load time)
- [ ] No console errors in Chrome DevTools
- [ ] Form validation works
- [ ] Database indexes created for performance

---

## Troubleshooting Guide

### Issue: "Cannot read property 'from' of undefined"
**Solution:** Supabase SDK not loaded. Add script tag:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

### Issue: "RLS policy violation"
**Solution:** Check RLS policies in Supabase. Ensure:
- User is authenticated for protected operations
- business_id belongs to current user
- Visit records match business ownership

### Issue: "Phone number not found in database"
**Solution:** Try flexible matching:
```javascript
const variations = generatePhoneVariations(phone);
for (const v of variations) {
    const result = await query with v;
    if (result) return result;
}
```

### Issue: "CORS error from Supabase"
**Solution:** Check domain restrictions in Supabase dashboard:
- Go to Settings → API
- Add your domain to allowed list

### Issue: "Session not persisting after refresh"
**Solution:** Ensure auth config has:
```javascript
auth: {
    persistSession: true,
    autoRefreshToken: true
}
```

---

## Performance Optimization Tips

1. **Batch database queries** when possible
2. **Cache customer data** in variables to avoid repeated queries
3. **Lazy load** loyalty cards instead of rendering all at once
4. **Use DocumentFragment** for bulk DOM insertions
5. **Debounce** input fields with 100ms delay
6. **Limit query results** with `.limit()` when possible

---

## Security Reminders

1. Never hardcode authentication credentials
2. Always validate phone numbers before DB queries
3. Trust Supabase RLS policies for data isolation
4. Sanitize user input before displaying
5. Use HTTPS (GitHub Pages provides this)
6. Don't store sensitive data in localStorage

---

## Resources

- Supabase Docs: https://supabase.com/docs
- PostgREST API: https://postgrest.org/en/stable/
- JavaScript MDN: https://developer.mozilla.org/en-US/docs/Web/JavaScript/
- CSS Grid: https://css-tricks.com/snippets/css/complete-guide-grid/

