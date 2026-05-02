# Render Deployment Configuration

## Build Command
```bash
npm install
```

## Start Command
```bash
node server.js
```

## Environment Variables
Set these in Render Dashboard:
- `GEMINI_API_KEY` - Your Gemini API key
- `EMAIL_USER` - Your email address
- `EMAIL_PASS` - Your email app password
- `PORT` - Leave blank (Render will auto-assign)
- `NODE_ENV` - Set to `production`

## Root Directory
**Leave blank or set to `.`** (current directory)

⚠️ DO NOT use `/opt/render/project/src/main` - that's causing your error!

## Repository Settings
Make sure your repository is:
- Either PUBLIC on GitHub
- Or you've connected your GitHub account to Render

## Quick Fix Steps:

1. **In Render Dashboard:**
   - Go to your service settings
   - Find "Root Directory" field
   - Clear it completely or set to `.`
   - Save changes

2. **Build Settings:**
   - Build Command: `npm install`
   - Start Command: `node server.js`

3. **Make Repository Public (if needed):**
   - Go to https://github.com/sugampokhareldev/sugamDev-Portfolio
   - Settings → Danger Zone → Change visibility → Make public

4. **Redeploy:**
   - Click "Manual Deploy" → "Clear build cache & deploy"
