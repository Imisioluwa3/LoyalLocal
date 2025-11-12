# LoyalLocal - Comprehensive Architecture Analysis

## Executive Summary

**LoyalLocal** is a phone-number-based loyalty rewards system designed for local businesses (salons, barbershops, eateries). It uses **Supabase** as the backend database, with a **frontend-only architecture** deployed on GitHub Pages. The system tracks customer visits via phone numbers and manages rewards based on customizable visit thresholds.

**Key Characteristic:** Frontend-driven, no dedicated backend server. All logic runs in the browser with Supabase handling authentication, authorization (RLS), and data persistence.

---

## 1. Project Structure

### Directory Layout
```
/LoyalLocal/
├── index.html                 # Homepage landing page
├── script.js                  # Homepage functionality
├── style.css                  # Global styles
├── config.example.js          # Configuration template
├── .env.example               # Environment variables template
├── utils/
│   └── phone.js              # Nigerian phone number utilities
├── business/                  # Business portal (managers)
│   ├── index.html
│   ├── script.js
│   └── style.css
├── customer/                  # Customer portal (loyalty tracking)
│   ├── index.html
│   ├── script.js
│   └── style.css
├── assets/
│   ├── favico.svg
│   └── images/
├── REAMD.md                   # Project README
├── SECURITY_SETUP.md          # RLS policy documentation
├── SECURITY_QUICK_START.md    # Quick security guide
├── HOSTING_OPTIONS.md         # Deployment options
└── SOCIAL_MEDIA_POSTS.md      # Marketing content
```

### Deployed Locations
- **Homepage:** https://imisioluwa3.github.io/LoyalLocal/
- **Business Portal:** https://imisioluwa3.github.io/LoyalLocal/business/
- **Customer Portal:** https://imisioluwa3.github.io/LoyalLocal/customer/

---

## 2. Frontend Architecture

### Technology Stack
- **Framework:** Vanilla JavaScript (No framework dependencies)
- **Styling:** CSS3 with flexbox and grid
- **Deployment:** GitHub Pages (static hosting)
- **Build Tool:** None (static files deployed directly)
- **Database Client:** Supabase JS SDK v2

### Frontend Modules

#### 2.1 Homepage (`/index.html`, `/script.js`)
**Purpose:** Marketing and landing page

**Features:**
- Hero section with CTA buttons
- Features showcase
- "How It Works" section
- Benefits listing
- Navigation with scroll-spy
- Mobile menu toggle
- Intersection observer for animations

**Key Functions:**
- `toggleMenu()` - Mobile navigation
- `updateActiveNavLink()` - Scroll spy navigation
- Smooth scroll for anchor links
- Auto-inject current year in footer

**No database interactions**

#### 2.2 Business Portal (`/business/index.html`, `/business/script.js`)
**Purpose:** Dashboard for business owners to manage loyalty programs

**Key Features:**
1. **Authentication Section**
   - Login form (email/password)
   - Registration form (business details)
   - Session persistence

2. **Dashboard Navigation**
   - Overview tab
   - Customers tab
   - Settings tab

3. **Overview Section**
   - Stats cards showing:
     - Total Customers (unique phone numbers)
     - Visits Today
     - Rewards Redeemed
     - Rewards Earned

4. **Customer Management**
   - Phone number lookup
   - Customer display with visit count
   - Progress bar visualization
   - Reward availability indicator
   - One-click visit logging
   - Reward redemption button
   - New customer form

5. **Settings Section**
   - Visits required for reward (1-50)
   - Reward description (customizable)
   - SMS notifications toggle

**Key Functions:**
- `register()` - Business registration
- `login()` - Authentication
- `logout()` - Session cleanup
- `showDashboard()` - Load business data
- `updateStats(businessId)` - Calculate metrics
- `lookupCustomer()` - Search customer by phone
- `displayCustomer(visits, business, phone)` - Show customer details
- `logVisit()` - Add visit record
- `redeemReward()` - Mark visits as redeemed
- `saveSettings()` - Update business configuration

**Database Tables Used:**
- `businesses` - Business profiles
- `visits` - Transaction log

#### 2.3 Customer Portal (`/customer/index.html`, `/customer/script.js`)
**Purpose:** Check loyalty rewards across all participating businesses

**Key Features:**
1. **Lookup Section**
   - Phone number input with auto-formatting
   - Search button with loading state

2. **Results Display**
   - Customer welcome message
   - Summary statistics:
     - Total Businesses enrolled with
     - Total Visits across all businesses
     - Available Rewards count
     - Total Rewards Earned
   - Loyalty cards for each business

3. **Loyalty Card**
   - Business name and type with icon
   - Progress bar and stamp visualization
   - Visits remaining for next reward
   - Reward description and redemption instructions
   - Last visit date
   - Total statistics

4. **No-Results Page**
   - Shows when phone not found in system

**Key Functions:**
- `lookupRewards()` - Search customer data
- `generatePhoneVariations(phoneNumber)` - Multiple format matching
- `transformVisitData(visits, phoneNumber)` - Process raw data
- `displayResults(customerData, phoneNumber)` - Render results
- `generateLoyaltyCards(businesses)` - Create card UI
- `createLoyaltyCard(businessName, data)` - Individual card element
- `goBack()` - Return to search
- `showNotification(message, type)` - User feedback

**Database Tables Used:**
- `visits` - Read-only for customer lookup
- `businesses` - Read-only for business metadata

---

## 3. Database Schema (Supabase PostgreSQL)

### Table: `businesses`
**Purpose:** Store business information and loyalty program settings

**Columns:**
```sql
id                             UUID          PRIMARY KEY (auto)
user_id                        UUID          FOREIGN KEY (auth.users)
name                           TEXT          NOT NULL (e.g., "Sarah's Salon")
type                           TEXT          (e.g., "salon", "barber", "restaurant")
address                        TEXT          Business physical location
loyalty_visits_required        INTEGER       Default: 5 (visits needed for reward)
loyalty_reward_description     TEXT          Default: "50% off next service"
sms_notifications_enabled      BOOLEAN       Default: true
created_at                     TIMESTAMPTZ   Auto-set
updated_at                     TIMESTAMPTZ   Auto-update on changes
```

**Key Relationships:**
- `user_id` → Links to Supabase auth.users table
- One business per authenticated user (currently)

**Sample Data:**
```
{
  id: "123e4567-e89b-12d3-a456-426614174000",
  user_id: "user-uuid-12345",
  name: "Sarah's Hair Salon",
  type: "salon",
  address: "123 Main St, Lagos, NG",
  loyalty_visits_required: 5,
  loyalty_reward_description: "Free hair wash and treatment",
  sms_notifications_enabled: true,
  created_at: "2024-11-01T10:30:00Z",
  updated_at: "2024-11-11T15:45:00Z"
}
```

### Table: `visits`
**Purpose:** Log customer visits and track reward progress

**Columns:**
```sql
id                        UUID          PRIMARY KEY (auto)
business_id               UUID          FOREIGN KEY (businesses.id)
customer_phone_number     TEXT          Normalized phone (+234XXXXXXXXXX)
customer_name             TEXT          Optional customer name
is_redeemed_for_reward    BOOLEAN       true = used for reward redemption
created_at                TIMESTAMPTZ   Visit timestamp
```

**Key Relationships:**
- `business_id` → Links to businesses table
- Many visits per business
- Many visits per customer (same phone, different businesses)

**Sample Data:**
```
{
  id: "visit-uuid-456",
  business_id: "123e4567-e89b-12d3-a456-426614174000",
  customer_phone_number: "+2348012345678",
  customer_name: "John Doe",
  is_redeemed_for_reward: false,
  created_at: "2024-11-12T10:00:00Z"
}
```

**Important Notes:**
- Phone numbers stored in normalized format: +234XXXXXXXXXX (13 digits)
- Supports flexible matching via `generatePhoneVariations()`
- `is_redeemed_for_reward` tracks reward consumption:
  - `false` = Visit counts toward next reward
  - `true` = Visit was used to redeem a reward
- No explicit customer table; customers identified by phone number

### Row Level Security (RLS) Policies

**On `visits` table:**
```sql
-- Public can read all visits (customer portal)
Policy: "Public read visits"
  SELECT: true

-- Only business owners can INSERT/UPDATE/DELETE their own visits
Policy: "Business owners modify visits"
  INSERT/UPDATE/DELETE: business_id IN (
    SELECT id FROM businesses WHERE user_id = auth.uid()
  )
```

**On `businesses` table:**
```sql
-- Public can read business info (for customer portal)
Policy: "Public read businesses"
  SELECT: true

-- Only owners can modify their business
Policy: "Owners modify business"
  UPDATE/INSERT/DELETE: user_id = auth.uid()
```

---

## 4. Authentication & Authorization

### Authentication Flow (Supabase Auth)

**Technology:** Supabase Authentication (JWT-based)

**Business Portal Login/Register:**
```javascript
// Registration
supabase.auth.signUp({
  email: "business@example.com",
  password: "secure_password",
  options: {
    data: {  // User metadata
      business_name: "Sarah's Salon",
      business_type: "salon",
      business_address: "123 Main St"
    }
  }
})

// Login
supabase.auth.signInWithPassword({
  email: "business@example.com",
  password: "password"
})

// Check session
supabase.auth.getSession()

// Listen to auth changes
supabase.auth.onAuthStateChange((event, session) => {
  // Handle auth state changes
})
```

**Customer Portal:**
- No authentication required
- Anonymous access to search rewards
- Uses RLS policies for data isolation

### Authorization (Row Level Security)

**Business Data Protection:**
- Businesses can only see/edit their own profile
- Each business only sees its own visits
- RLS policies enforce at database level

**Customer Data:**
- Customers can view their own rewards (via phone lookup)
- No authentication needed for customer portal
- Phone number serves as identifier

---

## 5. API Endpoints (Supabase Realtime)

### Business Portal Endpoints

#### Authentication Endpoints
```javascript
// Sign up a new business
POST /auth/v1/signup
Payload: { email, password, user_metadata }

// Login
POST /auth/v1/token
Payload: { email, password }

// Get current user
GET /auth/v1/user

// Logout
POST /auth/v1/logout
```

#### Business Profile Endpoints
```javascript
// Get business profile
GET /rest/v1/businesses?user_id=eq.{user_id}

// Create business (auto-created on signup)
POST /rest/v1/businesses
Payload: { user_id, name, type, address, loyalty_visits_required, etc }

// Update business settings
PATCH /rest/v1/businesses?user_id=eq.{user_id}
Payload: { loyalty_visits_required, loyalty_reward_description, sms_notifications_enabled }
```

#### Customer/Visits Endpoints
```javascript
// Get customer visits for lookup
GET /rest/v1/visits?customer_phone_number=eq.{phone}&business_id=eq.{id}

// Get all customers (unique phone numbers)
GET /rest/v1/visits?select=customer_phone_number&business_id=eq.{id}

// Get visits for today
GET /rest/v1/visits?business_id=eq.{id}&created_at=gte.{today_date}

// Log a new visit
POST /rest/v1/visits
Payload: { business_id, customer_phone_number, customer_name, is_redeemed_for_reward }

// Redeem rewards (update visits)
PATCH /rest/v1/visits?id=in.({visit_ids})
Payload: { is_redeemed_for_reward: true }
```

### Customer Portal Endpoints

```javascript
// Search customer rewards
GET /rest/v1/visits?customer_phone_number=eq.{phone}
  + JOIN businesses on business_id

// Flexible phone matching
GET /rest/v1/visits?customer_phone_number=like.%{phone_suffix}
```

---

## 6. Current Features & Implementation Status

### Core Features (Implemented)

#### Business Management
- Business registration and login
- Profile setup (name, type, address)
- Dashboard with key metrics
- Customer lookup by phone
- Visit logging (one-click)
- Reward redemption tracking
- Configurable loyalty program
  - Visits required for reward (1-50)
  - Custom reward description
  - SMS notifications toggle

#### Customer Management
- Phone-based customer identification
- Auto-create customer on first visit
- Optional customer name collection
- Visit history tracking
- Progress visualization

#### Analytics (Basic)
- Total customers count
- Visits today
- Rewards redeemed count
- Rewards earned count
- Last visit date
- Total visits per business

#### Phone Number Handling
- Nigerian phone number validation
- Multiple format support (08x, +234x, 234x, etc)
- Auto-formatting on input
- Flexible matching for legacy data
- SMS-ready format (+234XXXXXXXXXX)

### Advanced Features (Not Yet Implemented)

- Points-based loyalty (currently stamp-based only)
- SMS notifications (infrastructure ready, not implemented)
- Multi-location business support
- POS system integrations
- Birthday/special occasion rewards
- Bulk customer management
- Advanced analytics dashboard
- Customer profiles with history
- Bulk operations (import/export)
- Referral rewards
- Tiered loyalty programs
- Real-time notifications
- Customer segmentation

---

## 7. Tech Stack Summary

### Frontend
| Technology | Purpose | Version |
|------------|---------|---------|
| HTML5 | Markup | Current |
| CSS3 | Styling | Current |
| JavaScript (ES6+) | Logic | Current |
| Supabase JS SDK | Database client | v2 |
| Intersection Observer API | Animations | Native browser |

### Backend
| Technology | Purpose | Details |
|------------|---------|---------|
| Supabase | Database + Auth | PostgreSQL + PostgREST |
| PostgreSQL | Data storage | RLS policies enabled |
| Supabase Auth | User authentication | JWT tokens |
| PostgREST | API generation | Auto-generated REST API |

### Infrastructure
| Component | Provider | Details |
|-----------|----------|---------|
| Hosting | GitHub Pages | Static files only |
| Database | Supabase Cloud | PostgreSQL |
| Authentication | Supabase Auth | Email/password |
| Storage | Database | No file storage |

### Development Tools
| Tool | Purpose |
|------|---------|
| Git | Version control |
| GitHub | Repository hosting |
| VS Code | Code editor |

---

## 8. Data Flow Diagrams

### Business Portal - Login/Registration Flow
```
User Input (email, password, business details)
          ↓
    Validation (client-side)
          ↓
    Supabase Auth.signUp/signIn
          ↓
    JWT Token returned
          ↓
    Check/Create business record in DB
          ↓
    Load dashboard & stats
          ↓
    Display business portal
```

### Visit Logging Flow
```
Staff enters phone number
          ↓
    Validation (format check, prefix validation)
          ↓
    Normalize phone (+234 format)
          ↓
    Query visits table for customer
          ↓
    If exists:
      - Show customer details
      - Display progress
      - Show reward if earned
    If new:
      - Show new customer form
          ↓
    Staff clicks "Log Visit"
          ↓
    INSERT into visits table
          ↓
    Update stats
          ↓
    Refresh customer display
```

### Customer Portal - Lookup Flow
```
Customer enters phone number
          ↓
    Auto-format input
          ↓
    Click "Check My Rewards"
          ↓
    Validate phone number
          ↓
    Generate phone variations (flexible matching)
          ↓
    Query visits table with JOIN to businesses
          ↓
    Transform data (group by business, count visits)
          ↓
    Generate loyalty cards
          ↓
    Display results
```

---

## 9. Key Files & Their Responsibilities

### Critical Files for Implementation

| File | Lines | Purpose | Key Functions |
|------|-------|---------|---------------|
| `/business/script.js` | ~900 | Business portal logic | register, login, lookupCustomer, logVisit, redeemReward, saveSettings |
| `/customer/script.js` | ~1000 | Customer portal logic | lookupRewards, transformVisitData, displayResults, createLoyaltyCard |
| `/utils/phone.js` | ~350 | Phone utilities | validatePhoneNumber, normalizePhoneNumber, formatPhoneNumber, generatePhoneVariations |
| `/business/index.html` | ~150 | Business UI | Form inputs, dashboard structure |
| `/customer/index.html` | ~80 | Customer UI | Lookup form, results display |
| `/config.example.js` | ~45 | Configuration | Supabase credentials |

### CSS Files

| File | Purpose |
|------|---------|
| `/style.css` | Homepage styling |
| `/business/style.css` | Business portal styles (gradients, cards, forms) |
| `/customer/style.css` | Customer portal styles (loyalty cards, progress bars) |

---

## 10. Database Query Patterns

### Common Queries Used

```javascript
// 1. Get business profile
supabase
  .from('businesses')
  .select('*')
  .eq('user_id', user.id)
  .single()

// 2. Get customer visits
supabase
  .from('visits')
  .select('*')
  .eq('business_id', businessId)
  .eq('customer_phone_number', normalizedPhone)

// 3. Count unique customers
supabase
  .from('visits')
  .select('customer_phone_number')
  .eq('business_id', businessId)

// 4. Get visits today
supabase
  .from('visits')
  .select('*', { count: 'exact' })
  .eq('business_id', businessId)
  .gte('created_at', today_date)

// 5. Find visits for reward
supabase
  .from('visits')
  .select('*')
  .eq('business_id', businessId)
  .eq('customer_phone_number', phone)
  .eq('is_redeemed_for_reward', false)
  .limit(visitsRequired)

// 6. Redeem rewards
supabase
  .from('visits')
  .update({ is_redeemed_for_reward: true })
  .in('id', visitIds)
```

---

## 11. Existing Analytics Implementation

### Current Analytics Features (Minimal)

**Metrics Tracked:**
1. Total Customers (unique phone numbers)
2. Visits Today
3. Rewards Redeemed (visits marked as redeemed)
4. Rewards Earned (customers with enough unredeemed visits)

**Calculation Logic:**
```javascript
// Unique customers
const totalCustomers = new Set(visits.map(v => v.customer_phone_number)).size

// Visits today
query with gte('created_at', today)

// Rewards redeemed
count where is_redeemed_for_reward = true

// Rewards earned
group visits by customer
count customers with unredeemed visits >= visitsRequired
```

**Limitations:**
- No date range filtering
- No historical trends
- No charts or visualizations
- No customer segmentation
- No revenue estimates
- No cohort analysis

---

## 12. Areas Requiring New Implementation

### For Advanced Analytics Dashboard
1. **Time-series data**: Daily/weekly/monthly visit trends
2. **Charts**: Line graphs, bar charts, pie charts (need chart library)
3. **Filters**: Date range, business type, time of day
4. **Export**: CSV/PDF reports
5. **Predictions**: Forecasting repeat visit rates
6. **Cohort analysis**: Customer lifetime value tracking

### For Customer Management Features
1. **Customer profiles**: Dedicated customer detail page
2. **History timeline**: All visits and rewards in chronological order
3. **Customer segmentation**: At-risk, loyal, one-time, etc.
4. **Communication**: Bulk messaging templates
5. **Customer tags**: For targeting

### For Bulk Operations
1. **Import**: CSV upload for existing customers
2. **Export**: Customer data export
3. **Bulk actions**: Update multiple customers, bulk reward
4. **Batch operations**: Scheduled visits, automated rewards

### Database Schema Additions Needed
1. New table for `customer_profiles` (optional)
2. New table for `analytics_snapshots` (daily metrics cache)
3. New table for `customer_segments` or tags
4. New table for `bulk_operations` or jobs
5. Audit logging table (for compliance)

---

## 13. Security Considerations

### Current Security Measures
- JWT-based authentication
- Row Level Security (RLS) on all tables
- Domain restrictions available in Supabase
- Rate limiting (Supabase default)
- Password hashing (Supabase auth)
- Email verification (optional)

### Security Gaps
- No audit logging implemented
- No activity logs for compliance
- Limited rate limiting on customer portal
- No IP-based access control
- No 2FA support

### Recommendations
- Implement audit logging on all data changes
- Add API rate limiting per business
- Consider adding 2FA for business portal
- Regular security audits
- Monitor Supabase logs

---

## 14. Performance Characteristics

### Current Performance
- Small dataset (one business = ~100-1000 customers typically)
- Simple queries (mostly equality matches on indexed columns)
- No N+1 query problems (single queries with joins)
- Frontend rendering of cards (O(n) where n = # of businesses)

### Performance Bottlenecks
- Large phone number lookups (LIKE queries scan full table)
- Multiple API calls in sequence (not parallel)
- No query result caching
- CSV exports not batched

### Scalability Considerations
- Supabase free tier: 500MB database, 1000 concurrent connections
- Current approach scales to ~50,000 customers per business
- Needs optimization for >100,000 customers

---

## 15. Migration Path for New Features

### Recommended Implementation Order

#### Phase 1: Foundation (Week 1-2)
1. Create new `/analytics/` directory
2. Add chart library (Chart.js or Recharts)
3. Create analytics data aggregation functions
4. Add time-series data tables to database

#### Phase 2: Customer Management (Week 2-3)
1. Create `/customers/` portal page
2. Add customer detail view
3. Implement customer profile data
4. Add customer communication features

#### Phase 3: Bulk Operations (Week 3-4)
1. Create bulk operations UI
2. Implement CSV import/export
3. Add batch processing queue
4. Create job tracking system

#### Phase 4: Polish & Optimization (Week 4+)
1. Performance optimization
2. Advanced filtering
3. Report generation
4. Mobile optimization

---

## 16. Absolute File Paths (for reference)

```
/home/enoch/Desktop/Github repos/LoyalLocal/
├── index.html
├── script.js
├── style.css
├── config.example.js
├── .env.example
├── REAMD.md
├── SECURITY_SETUP.md
├── SECURITY_QUICK_START.md
├── HOSTING_OPTIONS.md
├── SOCIAL_MEDIA_POSTS.md
├── utils/phone.js
├── business/
│   ├── index.html
│   ├── script.js
│   └── style.css
├── customer/
│   ├── index.html
│   ├── script.js
│   └── style.css
└── assets/
    ├── favico.svg
    └── images/
```

---

## 17. Next Steps for Development

1. **Create Analytics Dashboard**
   - Add `/analytics/` directory
   - Implement date range filtering
   - Create chart components
   - Add metric calculations

2. **Enhanced Customer Management**
   - Create customer detail page
   - Add communication templates
   - Implement customer profiles
   - Add history tracking

3. **Bulk Operations**
   - Create bulk upload UI
   - Implement CSV parsing
   - Add export functionality
   - Create job queue system

4. **Database Enhancements**
   - Add customer segments table
   - Implement analytics snapshot table
   - Add audit logging table
   - Create indices for performance

5. **Testing & Documentation**
   - Unit tests for utilities
   - Integration tests for APIs
   - API documentation
   - User guides

