# Firebase Client Configuration Setup

Fix the "auth/invalid-api-key" error by getting your Firebase Web API credentials.

## 🔴 The Problem

The admin dashboard needs **Firebase Client SDK credentials** (not Admin SDK credentials).

**Error:** `FirebaseError: Firebase: Error (auth/invalid-api-key)`

**Cause:** Missing or incorrect Firebase web configuration in `apps/admin/.env.local`

---

## ✅ Solution: Get Firebase Web Credentials

### Step 1: Open Firebase Console
1. Go to https://console.firebase.google.com
2. Click on your project
3. Click the gear icon ⚙️ → **Project settings**

### Step 2: Find Your Web App Config
1. Go to **General** tab (should be default)
2. Scroll down to **Your apps** section
3. Look for your web app (might show as "Web App")

**If you don't see a web app:**
1. Click **Add app** button
2. Select **Web** (</> icon)
3. Enter an app name like "Admin Dashboard"
4. Click **Register app**

### Step 3: Copy Configuration
You'll see JavaScript configuration code. It looks like:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDxxxxxxxxxxxxxxxxxx",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

### Step 4: Update `.env.local` File

Open `apps/admin/.env.local` and add these values:

```env
# Firebase Web Configuration (from Firebase Console Project Settings)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

**Replace** the values with your actual Firebase config values.

### Step 5: Restart Admin Dashboard

```bash
# Stop the dev server (Ctrl+C in terminal running pnpm --filter admin dev)

# Start it again
pnpm --filter admin dev

# Open http://localhost:3000
```

---

## 📍 Where to Find Each Value

| Variable | Where to Find | Example |
|----------|---------------|---------|
| **apiKey** | Firebase Console → Project Settings → General → firebaseConfig | `AIzaSyD...` |
| **authDomain** | Firebase Console → Project Settings → General → firebaseConfig | `my-project.firebaseapp.com` |
| **projectId** | Firebase Console → Project Settings → General | `my-project-123` |
| **storageBucket** | Firebase Console → Project Settings → General → firebaseConfig | `my-project-123.appspot.com` |
| **messagingSenderId** | Firebase Console → Project Settings → General → firebaseConfig | `123456789` |
| **appId** | Firebase Console → Project Settings → General → firebaseConfig | `1:123456789:web:abc...` |

---

## 🔍 How to Get Your Config from Firebase Console

### Method 1: Copy from Project Settings
1. Firebase Console → Your Project
2. Click ⚙️ **Settings**
3. Go to **General** tab
4. Scroll to **Your apps**
5. Click on your web app
6. Copy all values under **firebaseConfig**

### Method 2: Copy from Firebase SDK Code
1. Firebase Console → Your Project
2. Click ⚙️ **Settings**
3. Go to **General** tab
4. Scroll to **Your apps**
5. Under your web app, click **Config** or **Firebase SDK snippet**
6. You'll see the complete JavaScript configuration

### Method 3: From Hosting Setup
1. Firebase Console → **Hosting**
2. If you have hosting set up, the config might be visible
3. Or go to ⚙️ **Settings** → **General** tab

---

## 📝 Complete .env.local File Template

```env
# Firebase Web Client Configuration
# Get these from Firebase Console → Project Settings → General
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY_HERE
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID
```

---

## ⚠️ Important Notes

### Public vs Private Keys
- **`NEXT_PUBLIC_*` keys** can be public (they're in frontend code)
- These are used by the browser to authenticate users
- The API key is intentionally public in client-side code
- It's restricted to Firebase services via Firebase Security Rules

### Private Keys (Not Needed Here)
- `FIREBASE_PRIVATE_KEY` (from service account) → for **backend/worker only**
- This should NOT be in admin frontend
- Never put Admin SDK credentials in browser code

### Why "NEXT_PUBLIC"?
- In Next.js, variables starting with `NEXT_PUBLIC_` are exposed to the browser
- This is intentional for Firebase client initialization
- Security is enforced via Firebase Security Rules, not secret keys

---

## ✅ Verify Configuration Works

### 1. Check File Exists
```bash
cat apps/admin/.env.local
# Should show your Firebase web config
```

### 2. Check Values Are Set
```bash
cat apps/admin/.env.local | grep FIREBASE_API_KEY
# Should show: NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
```

### 3. Start Admin Dashboard
```bash
pnpm --filter admin dev
```

### 4. Open Browser
```
http://localhost:3000
```

### 5. Should See Login Page
- If you see login page → ✅ Firebase is working
- If you see error → Check config values again

---

## 🔧 Troubleshooting

### Error: "auth/invalid-api-key"
**Solution:** 
1. Copy fresh credentials from Firebase Console
2. Make sure values don't have extra spaces
3. Verify you're copying the **client** config, not Admin SDK config
4. Restart dev server after updating .env

### Error: "Firebase: Error (auth/invalid-auth-domain)"
**Solution:**
1. Check `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` is correct
2. Should be: `your-project.firebaseapp.com`
3. Not: `your-project.firebase.com` (missing "app")

### Login Page Loads But Can't Sign In
**Possible Issues:**
1. Firebase Authentication not enabled
2. User doesn't exist in Firebase Authentication
3. User doesn't have `admin: true` custom claim

**Solutions:**
```bash
# 1. Check Authentication is enabled
# Firebase Console → Authentication → Set up sign-in method → Email/Password

# 2. Create a test user
# Firebase Console → Authentication → Users → Add user

# 3. Set admin claim
firebase shell
# Then:
admin.auth().setCustomUserClaims('YOUR_USER_UID', { admin: true })
```

---

## 📋 Quick Checklist

- [ ] Opened Firebase Console
- [ ] Found your project
- [ ] Located Project Settings → General
- [ ] Copied all 6 Firebase web config values
- [ ] Updated `apps/admin/.env.local` with these values
- [ ] No extra spaces in the values
- [ ] Restarted `pnpm --filter admin dev`
- [ ] Can access http://localhost:3000
- [ ] Login page loads without errors
- [ ] Can login with Firebase user

---

## 📞 Still Having Issues?

### Check Firebase Console
1. Firebase Console → Your Project → ⚙️ Settings → General
2. Scroll to "Your apps"
3. Verify your web app is listed
4. Copy exact config values

### Verify User Exists
1. Firebase Console → Authentication → Users
2. Create user if needed
3. Note the UID

### Set Admin Claim
```bash
firebase login
firebase shell
# In shell:
admin.auth().setCustomUserClaims('USER_UID_HERE', { admin: true })
```

### Test Configuration
```bash
# Check .env.local file
cat apps/admin/.env.local

# Should show:
# NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
# NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
# etc.
```

---

## 🎯 Common Mistakes to Avoid

❌ Using Admin SDK credentials instead of Web API credentials  
❌ Missing "NEXT_PUBLIC_" prefix in variable names  
❌ Extra spaces in environment variable values  
❌ Using `.firebase.com` instead of `.firebaseapp.com`  
❌ Not restarting dev server after updating .env  
❌ Forgetting to set `admin: true` custom claim on user  

✅ Copy values directly from Firebase Console  
✅ Keep `NEXT_PUBLIC_` prefix  
✅ Double-check for extra spaces  
✅ Verify auth domain has "app" in it  
✅ Restart dev server after env changes  
✅ Set custom claim for admin access  

---

## ✨ Once Fixed

After adding the Firebase web configuration:

1. ✅ Admin dashboard loads at http://localhost:3000
2. ✅ Login page appears
3. ✅ Can sign in with Firebase user
4. ✅ Redirects to dashboard if user has `admin: true`
5. ✅ Can create automation accounts
6. ✅ Can configure keywords & schedules
7. ✅ Worker can process jobs

You're ready to go! 🚀
