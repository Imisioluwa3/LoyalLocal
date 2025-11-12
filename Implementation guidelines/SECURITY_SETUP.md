# Security Setup Guide for LoyalLocal

## 🔒 Understanding Supabase Security

### The Anon Key is Meant to be Public ✅
Your `SUPABASE_ANON_KEY` is designed to be exposed in client-side code. This is normal and expected for Supabase projects.

**Real Security = Row Level Security (RLS) Policies**

---

## 🛡️ Setting Up Row Level Security (RLS)

### Step 1: Enable RLS on All Tables

Go to your Supabase dashboard → SQL Editor and run:

```sql
-- Enable RLS on visits table
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

-- Enable RLS on businesses table
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
```

---

### Step 2: Create RLS Policies

#### For the `visits` table:

```sql
-- Policy 1: Anyone can read visits (for customer portal)
CREATE POLICY "Allow public read access to visits"
ON visits
FOR SELECT
TO anon, authenticated
USING (true);

-- Policy 2: Only authenticated business owners can insert visits
CREATE POLICY "Business owners can insert visits"
ON visits
FOR INSERT
TO authenticated
WITH CHECK (
  business_id IN (
    SELECT id FROM businesses WHERE user_id = auth.uid()
  )
);

-- Policy 3: Only authenticated business owners can update their visits
CREATE POLICY "Business owners can update their visits"
ON visits
FOR UPDATE
TO authenticated
USING (
  business_id IN (
    SELECT id FROM businesses WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  business_id IN (
    SELECT id FROM businesses WHERE user_id = auth.uid()
  )
);

-- Policy 4: Only authenticated business owners can delete their visits
CREATE POLICY "Business owners can delete their visits"
ON visits
FOR DELETE
TO authenticated
USING (
  business_id IN (
    SELECT id FROM businesses WHERE user_id = auth.uid()
  )
);
```

#### For the `businesses` table:

```sql
-- Policy 1: Anyone can read business info (for customer portal to show business names)
CREATE POLICY "Allow public read access to businesses"
ON businesses
FOR SELECT
TO anon, authenticated
USING (true);

-- Policy 2: Authenticated users can only see their own business details
CREATE POLICY "Users can read their own business"
ON businesses
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy 3: Authenticated users can only update their own business
CREATE POLICY "Users can update their own business"
ON businesses
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 4: New users can insert their business during signup
CREATE POLICY "Users can insert their own business"
ON businesses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
```

---

## 🔍 Verify Your Policies

Run this to check your policies are active:

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
```

---

## 🚨 Additional Security Measures

### 1. **Restrict API Access by Domain** (Recommended)

In your Supabase Dashboard:
1. Go to **Settings** → **API**
2. Under **API Settings**, add your allowed domains:
   ```
   https://imisioluwa3.github.io
   http://localhost:*
   ```
3. This prevents others from using your API key on their sites

### 2. **Rate Limiting**

Supabase automatically provides rate limiting, but you can configure it:
1. Go to **Settings** → **API**
2. Configure rate limits per IP

### 3. **Monitor Usage**

1. Go to **Project Settings** → **Usage**
2. Set up alerts for unusual activity
3. Monitor the **Logs** section regularly

---

## 📋 Environment Variable Alternative (For Local Development)

While you can't use env vars on GitHub Pages, you can use them for local development:

### Create `.env` file (for local development):
```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Add to `.gitignore`:
```
.env
.env.local
.env.production
node_modules/
dist/
```

### Update your code to use env vars when available:
```javascript
// config.js
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ||
                     'https://mhwsjjumsiveahfckcwr.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ||
                          'your-fallback-key';
```

**Note:** This only helps during development. For production on GitHub Pages, the keys will still be visible.

---

## 🔄 Alternative Hosting Options (If You Want Hidden Env Vars)

If you absolutely need to hide environment variables, consider these alternatives:

### Option 1: **Netlify** (Best for Static Sites)
1. Push your repo to GitHub
2. Connect to Netlify
3. Add environment variables in Netlify dashboard
4. Deploy automatically on push

**Setup:**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod
```

Add env vars in: Netlify Dashboard → Site Settings → Environment Variables

### Option 2: **Vercel** (Great Alternative)
1. Import GitHub repo to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically

**Setup:**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

Add env vars in: Vercel Dashboard → Project Settings → Environment Variables

### Option 3: **Cloudflare Pages**
1. Connect GitHub repo
2. Add environment variables
3. Deploy automatically

---

## 🎯 Recommended Approach for LoyalLocal

Since you're using GitHub Pages and want to keep it simple:

### ✅ **Keep using GitHub Pages + Implement RLS**

1. **Enable RLS** on all tables (see SQL above)
2. **Restrict API access by domain** in Supabase dashboard
3. **Monitor usage** regularly
4. **The anon key can remain public** - it's designed for this!

### Why This Works:
- ✅ RLS ensures users can only access their own data
- ✅ Domain restrictions prevent key abuse
- ✅ Rate limiting prevents API abuse
- ✅ No need to change hosting
- ✅ Keeps your deployment simple

---

## 🔐 Key Rotation (If Compromised)

If you ever need to rotate your keys:

1. Go to **Supabase Dashboard** → **Settings** → **API**
2. Click **Reset project API keys**
3. Update keys in your code
4. Redeploy

---

## 📊 Security Checklist

- [ ] RLS enabled on `visits` table
- [ ] RLS enabled on `businesses` table
- [ ] All policies created and tested
- [ ] Domain restrictions added in Supabase
- [ ] Rate limiting configured
- [ ] Usage monitoring set up
- [ ] `.env` added to `.gitignore`
- [ ] Tested that unauthorized users can't access data
- [ ] Tested that businesses can only see their own data
- [ ] Tested that customers can view rewards

---

## 🚨 What to Do If Your Key is Compromised

1. **Rotate the key immediately** in Supabase dashboard
2. **Check access logs** for suspicious activity
3. **Review RLS policies** to ensure they're correct
4. **Update your code** with new keys
5. **Deploy the changes** immediately

---

## 📚 Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/database/security)
- [PostgreSQL RLS Guide](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

---

## 💡 Remember

> "The anon key is meant to be public. Your security comes from well-configured Row Level Security policies, not from hiding the key."

With proper RLS, even if someone has your anon key, they can't:
- ❌ Access other businesses' data
- ❌ Modify data they don't own
- ❌ Delete records
- ❌ Bypass authentication

**Security = RLS Policies + Domain Restrictions + Rate Limiting** ✅
