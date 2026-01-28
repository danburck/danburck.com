# Energy Mastery for Founders - Deployment Guide

This guide will help you deploy your landing pages to danburck.com using GitHub and Netlify.

## What You'll Get

- Landing page at: `danburck.com/energymasteryforfounders`
- Booking page at: `danburck.com/booking`
- Root domain (`danburck.com`) continues redirecting to `letters.danburck.com` (your existing setup)
- `letters.danburck.com` keeps working (stays on Substack)

## GoDaddy + Netlify Setup

**Good news**: GoDaddy works perfectly with Netlify! You just need to:
1. Push your files to GitHub (Steps 1-2)
2. Deploy to Netlify (Step 3)
3. Update ONE DNS record in GoDaddy: Change your A record's IP to Netlify's IP
4. Done! Everything else stays the same

## Step 1: Create GitHub Repository

1. Go to [github.com](https://github.com) and create a new repository
2. Name it something like `energy-mastery-landing` (can be private or public)
3. **Don't** initialize with README (we already have files)

## Step 2: Push Files to GitHub

Open your terminal and run these commands from this folder:

```bash
cd /path/to/netlify-deploy

# Initialize git repository
git init

# Add all files
git add .

# Commit files
git commit -m "Initial commit: Energy Mastery landing pages"

# Add your GitHub repository as remote (replace with your repo URL)
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 3: Connect Netlify to GitHub

1. Go to [netlify.com](https://netlify.com) and sign up/login (use GitHub login for easier setup)
2. Click "Add new site" → "Import an existing project"
3. Choose "Deploy with GitHub"
4. Select your repository (`energy-mastery-landing`)
5. Configure build settings:
   - **Build command**: Leave empty
   - **Publish directory**: `.` (just a dot)
6. Click "Deploy site"

## Step 4: Configure Custom Domain

1. After deployment, go to your site's "Domain settings" in Netlify
2. Click "Add custom domain"
3. Enter `danburck.com`
4. Netlify will show you DNS instructions and an IP address (usually `75.2.60.5`)
5. **Copy this IP address** - you'll need it for GoDaddy

### Update Your GoDaddy DNS Settings

**Good news**: You can keep using GoDaddy DNS - no need to change nameservers!

In your GoDaddy DNS management (screenshot you shared):

1. **Update the A Record**:
   - Keep Type: `A`
   - Keep Name: `@`
   - Update Data/Points to: Use the IP address Netlify shows you (usually `75.2.60.5`)
   - TTL: `1 Hour` or `600 seconds`

2. **Keep these records as they are** (DO NOT CHANGE):
   - CNAME `letters` → `target.substack-custom-domains.com` (for letters.danburck.com)
   - CNAME `www` → `danburck.com` (for www redirect)
   - All NS records

3. **Optional**: Add CNAME for www to Netlify instead:
   - Type: `CNAME`
   - Name: `www`
   - Data: `your-site-name.netlify.app`
   - This ensures www.danburck.com also works

**Important**:
- Your `letters.danburck.com` subdomain will keep working (it points to Substack)
- Your main domain `danburck.com` will now be served by Netlify
- Netlify will handle the redirect from `danburck.com` → `letters.danburck.com` based on netlify.toml

## Step 5: Enable HTTPS

1. After DNS propagates (can take 24-48 hours)
2. In Netlify, go to "Domain settings" → "HTTPS"
3. Click "Verify DNS configuration"
4. Enable "Force HTTPS"

## File Structure

```
netlify-deploy/
├── netlify.toml                    # Netlify configuration
├── logo-blur.png                   # Yellow logo
├── logo-blur-grey.png              # Grey logo
├── daniel-profile.png              # Profile photo
├── energymasteryforfounders/
│   └── index.html                  # Landing page
└── booking/
    └── index.html                  # Booking page
```

## Testing Locally

Before deploying, you can test locally:

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Test locally
cd netlify-deploy
netlify dev
```

## Troubleshooting

**DNS not propagating?**
- Use [dnschecker.org](https://dnschecker.org) to check DNS propagation
- Can take up to 48 hours

**Links not working?**
- Make sure all internal links use absolute paths (e.g., `/booking` not `booking.html`)
- Check netlify.toml redirects are configured correctly

**Images not loading?**
- Verify image files are in the root of netlify-deploy folder
- Check that paths in HTML use `/logo-blur.png` (with leading slash)

## Need Help?

- Netlify docs: [docs.netlify.com](https://docs.netlify.com)
- GitHub docs: [docs.github.com](https://docs.github.com)
