# 🔒 Security Quick Start

## TL;DR - What You Need to Know

### ✅ Your Supabase ANON key CAN be public
It's designed to be exposed in frontend code. The real security comes from **Row Level Security (RLS)** in your database.

### ⚡ Quick Action Plan (5 minutes)

1. **Enable RLS** on your Supabase tables
2. **Add domain restrictions** in Supabase dashboard
3. **Keep using GitHub Pages** (it's perfectly secure with RLS!)

That's it! You're secure. 🎉

---

## 🎯 Choose Your Path

### Path A: Stay on GitHub Pages (Recommended) ✅

**Pros:**
- ✅ Already set up
- ✅ Free
- ✅ Simple
- ✅ No migration needed

**Setup (5 minutes):**
1. Go to Supabase Dashboard → SQL Editor
2. Run RLS setup queries (see below)
3. Add domain restrictions
4. Done!

**Security:**
- ✅ Secure via RLS policies
- ✅ Domain restrictions prevent abuse
- ✅ Rate limiting included
- ⚠️ Credentials visible in source (but that's OK!)

### Path B: Migrate to Netlify (If You Want Hidden Credentials) 🔄

**Pros:**
- ✅ Environment variables support
- ✅ Credentials hidden
- ✅ Serverless functions available
- ✅ Better deployment features

**Setup (10 minutes):**
1. Create Netlify account
2. Connect GitHub repo
3. Add environment variables
4. Deploy!

**See:** [HOSTING_OPTIONS.md](HOSTING_OPTIONS.md)

---

## 🚀 5-Minute Security Setup

### Step 1: Enable RLS (Copy & Paste)

Go to **Supabase Dashboard → SQL Editor** and run:

```sql
-- Enable RLS
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read visits (customer portal needs this)
CREATE POLICY "Public read visits" ON visits
  FOR SELECT TO anon, authenticated
  USING (true);

-- Only business owners can modify visits
CREATE POLICY "Owners modify visits" ON visits
  FOR ALL TO authenticated
  USING (business_id IN (
    SELECT id FROM businesses WHERE user_id = auth.uid()
  ));

-- Anyone can read business names (for customer portal)
CREATE POLICY "Public read businesses" ON businesses
  FOR SELECT TO anon, authenticated
  USING (true);

-- Only owners can modify their business
CREATE POLICY "Owners modify business" ON businesses
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Step 2: Add Domain Restrictions

1. Go to **Supabase Dashboard → Settings → API**
2. Under **API Settings**, add allowed domains:
   ```
   https://imisioluwa3.github.io
   http://localhost:*
   ```
3. Save

### Step 3: Test Your Security

```javascript
// Try this in browser console (should fail):
await supabase
  .from('businesses')
  .update({ name: 'Hacked!' })
  .eq('id', 'some-business-id');
// ❌ Should return error: "new row violates row-level security policy"
```

**If you see that error = Security is working!** ✅

---

## 📋 Security Checklist

Copy this checklist to ensure you're secure:

- [ ] RLS enabled on `visits` table
- [ ] RLS enabled on `businesses` table
- [ ] Read policies allow public access (for customer portal)
- [ ] Write policies require authentication
- [ ] Domain restrictions added in Supabase
- [ ] Tested unauthorized access (should fail)
- [ ] Tested authorized access (should work)
- [ ] `.gitignore` includes `.env` files
- [ ] Usage monitoring set up in Supabase

---

## 🤔 Common Questions

### Q: "But my API key is visible in the code!"
**A:** That's OK! It's designed to be public. Security comes from RLS policies, not hiding the key.

### Q: "Can someone steal my data?"
**A:** No, if RLS is set up correctly. They can see the key but can't bypass RLS policies.

### Q: "Can someone rack up my Supabase bill?"
**A:** Unlikely. Domain restrictions + rate limiting prevent abuse. Plus Supabase free tier is generous.

### Q: "Should I rotate my keys?"
**A:** Only if you suspect malicious activity. Check Supabase logs regularly.

### Q: "Is GitHub Pages less secure than Netlify?"
**A:** No. Both are equally secure with proper RLS. Netlify just hides the key from view.

---

## 🔥 What to Do If Compromised

If you suspect your API is being abused:

1. **Check Supabase logs** (Dashboard → Logs)
2. **Rotate API keys** (Settings → API → Reset keys)
3. **Review RLS policies** (ensure they're correct)
4. **Update domain restrictions** (remove suspicious domains)
5. **Enable stricter rate limiting**

---

## 📊 Monitoring Your Security

### Daily Checks (30 seconds):
```
Supabase Dashboard → Home → Check request count
```

### Weekly Checks (2 minutes):
```
Supabase Dashboard → Logs → Review unusual activity
Supabase Dashboard → Usage → Check bandwidth/storage
```

### Monthly Checks (5 minutes):
```
Review RLS policies
Test security (try unauthorized access)
Check for Supabase updates
Review domain restrictions
```

---

## 🎓 Understanding the Security Model

### Traditional Backend:
```
Client → Server (has secret key) → Database
         ↑
    Credentials hidden here
```

### Supabase with RLS:
```
Client (has public key) → Supabase (RLS policies) → Database
                           ↑
                      Security enforced here
```

**Key Difference:**
- Traditional: Security through hidden credentials
- Supabase: Security through database policies

**Both are secure!** Supabase just puts the security layer in the database instead of the server.

---

## 🛠️ Advanced: Adding More Security

### 1. Email Verification
Already included in Supabase auth! ✅

### 2. Rate Limiting Per User
```sql
-- Limit visits per customer per day
CREATE POLICY "Rate limit visits" ON visits
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT COUNT(*) FROM visits
     WHERE customer_phone_number = NEW.customer_phone_number
     AND business_id = NEW.business_id
     AND created_at > NOW() - INTERVAL '1 day') < 20
  );
```

### 3. IP-based Access Control
Configure in Supabase Dashboard → Settings → API

### 4. Audit Logging
```sql
-- Create audit log table
CREATE TABLE audit_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action TEXT,
  table_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add trigger to log changes
CREATE OR REPLACE FUNCTION log_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (user_id, action, table_name)
  VALUES (auth.uid(), TG_OP, TG_TABLE_NAME);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_businesses
AFTER INSERT OR UPDATE OR DELETE ON businesses
FOR EACH ROW EXECUTE FUNCTION log_changes();
```

---

## 📚 Further Reading

- [SECURITY_SETUP.md](SECURITY_SETUP.md) - Complete SQL policies
- [HOSTING_OPTIONS.md](HOSTING_OPTIONS.md) - Alternative hosting platforms
- [Supabase RLS Docs](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/database/security)

---

## ✅ You're All Set!

With RLS enabled and domain restrictions in place, your app is secure! The fact that your API key is visible in the code is not a security issue.

**Remember:** Modern web apps with Supabase are secure by design through RLS, not through hiding credentials.

Now go build amazing things! 🚀
