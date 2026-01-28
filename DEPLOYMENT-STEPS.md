# Step-by-Step Deployment Instructions

Follow these steps exactly. I'll tell you what to do in the browser vs what I can help with.

---

## ✅ STEP 1: Create GitHub Repository (5 minutes)

**Do this in your browser:**

1. Go to https://github.com/new
2. Fill in:
   - **Repository name**: `energy-mastery-landing`
   - **Description**: (optional) "Energy Mastery for Founders landing pages"
   - **Visibility**: Choose "Private" (recommended) or "Public"
   - ⚠️ **IMPORTANT**: DO NOT check "Add a README file"
3. Click "Create repository"
4. **Copy the repository URL** shown on the next page (looks like: `https://github.com/YOUR-USERNAME/energy-mastery-landing.git`)

**Tell me when done, and give me the URL so I can set up Git for you**

---

## ⏸️ STEP 2: Push Files to GitHub

**I'll do this for you once you give me the GitHub URL**

I'll run the git commands to initialize the repository and push all your files.

---

## ✅ STEP 3: Deploy to Netlify (5 minutes)

**Do this in your browser:**

1. Go to https://app.netlify.com (sign up if needed - use "Sign up with GitHub" for easier setup)
2. Click "Add new site" → "Import an existing project"
3. Click "Deploy with GitHub"
4. Authorize Netlify to access GitHub if prompted
5. Find and select your repository: `energy-mastery-landing`
6. Configure settings:
   - **Branch to deploy**: `main`
   - **Build command**: Leave empty
   - **Publish directory**: `.` (just a single period/dot)
7. Click "Deploy site"
8. Wait 1-2 minutes for deployment to complete

**After deployment:**
- Copy your site URL (looks like: `random-name-123456.netlify.app`)
- **Tell me when done**

---

## ✅ STEP 4: Add Custom Domain in Netlify (3 minutes)

**Do this in your browser (still in Netlify):**

1. In your site dashboard, click "Domain settings" (left sidebar)
2. Click "Add custom domain"
3. Enter: `danburck.com`
4. Click "Verify" and then "Add domain"
5. Netlify will show you DNS instructions
6. **Copy the IP address** they show you (usually `75.2.60.5`)

**Tell me the IP address, then continue to Step 5**

---

## ✅ STEP 5: Update GoDaddy DNS (2 minutes)

**Do this in GoDaddy:**

1. Go to your GoDaddy DNS management (the page from your screenshot)
2. Find the **A Record** with:
   - Type: `A`
   - Name: `@`
   - Data: `3.231.35.217` (your current IP)
3. Click the edit/pencil icon on that row
4. Change **Data/Points to**: `[THE IP FROM NETLIFY]` (the one you copied in Step 4)
5. Keep TTL as `1 Hour`
6. Click "Save"

**DO NOT change any other records** (keep letters, www, NS records as they are)

---

## ⏰ STEP 6: Wait for DNS Propagation (24-48 hours max, often just 1-2 hours)

Your site will be live at:
- `danburck.com/energymasteryforfounders` ← Landing page
- `danburck.com/booking` ← Booking page
- `danburck.com` → Still redirects to letters.danburck.com

You can check DNS propagation at: https://dnschecker.org

---

## ✅ STEP 7: Enable HTTPS (after DNS works)

**Do this in Netlify after DNS propagates:**

1. Go back to your site in Netlify
2. Click "Domain settings" → "HTTPS"
3. Click "Verify DNS configuration"
4. Once verified, toggle "Force HTTPS" to ON

**Done! 🎉**

---

## Quick Test

Once DNS propagates, test these URLs:
- https://danburck.com ← Should redirect to letters.danburck.com
- https://danburck.com/energymasteryforfounders ← Your landing page
- https://danburck.com/booking ← Your booking page

---

## Need Help?

If anything goes wrong, send me:
- Which step you're on
- Screenshot of any error messages
- Your site URL from Netlify
