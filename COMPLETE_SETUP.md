# 🚀 Complete Firebase Setup Guide - Let It Out App

## ✅ What's Already Done

1. ✅ Firebase configuration updated with your project credentials
2. ✅ Welcome screen created with Get Started flow
3. ✅ Email/Password authentication pages ready
4. ✅ Google Sign-In code implemented (needs configuration)
5. ✅ Firestore integration for user data storage
6. ✅ SHA-1 Certificate obtained: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`

## 📋 Required Steps to Complete Setup

### Step 1: Add SHA-1 to Firebase Console

1. Go to [Firebase Console - Project Settings](https://console.firebase.google.com/project/let-itout/settings/general)
2. Scroll down to "Your apps" section
3. Find your Android app: **com.android.letitout** (App ID: 1:976666516752:android:dce05354cb312ee8d69995)
4. Click "Add fingerprint" button
5. Paste this SHA-1:
   ```
   5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
   ```
6. Click "Save"

### Step 2: Get Web Client ID for Google Sign-In

1. In the same Firebase Console page (Project Settings)
2. Look for the **Web app** in "Your apps" section
   - If you don't see a web app, click "Add app" → Select "Web" → Register it
3. Find the configuration object, you'll see something like:
   ```javascript
   const firebaseConfig = {
      apiKey: "AIzaSyA65RlWsspLIG8UAI7zNmpV54cKsslW8Iw",
      authDomain: "let-itout.firebaseapp.com",
      projectId: "let-itout",
      // ...
   };
   ```
4. **OR** go to Google Cloud Console:
   - Visit: https://console.cloud.google.com/apis/credentials?project=let-itout
   - Look for "Web client" under OAuth 2.0 Client IDs
   - Copy the Client ID (format: `XXXXXX-XXXXXXXX.apps.googleusercontent.com`)

5. **Update the code:**
   Open `context/AuthContext.jsx` and replace line 37:
   ```javascript
   webClientId: '976666516752-XXXXXXXXXXXXXXXXXXXXXXXX.apps.googleusercontent.com',
   ```

### Step 3: Enable Authentication Methods

1. Go to [Firebase Authentication](https://console.firebase.google.com/project/let-itout/authentication/providers)
2. Click "Get Started" if not enabled
3. Go to "Sign-in method" tab

**Enable Email/Password:**

- Click "Email/Password"
- Toggle "Enable" to ON
- Click "Save"

**Enable Google Sign-In:**

- Click "Google"
- Toggle "Enable" to ON
- Select a support email from dropdown
- Click "Save"

### Step 4: Set up Firestore Database

1. Go to [Firestore Database](https://console.firebase.google.com/project/let-itout/firestore)
2. Click "Create database"
3. **Start in production mode** (we'll set rules next)
4. Choose your preferred location (e.g., `us-central1`)
5. Click "Enable"

**Set Security Rules:**

Once created, go to the "Rules" tab and paste these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - users can read/write their own document
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Posts collection - authenticated users can read all, write their own
    match /posts/{postId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null &&
        request.auth.uid == resource.data.userId;
    }

    // Comments collection
    match /comments/{commentId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null &&
        request.auth.uid == resource.data.userId;
    }
  }
}
```

Click "Publish" to save the rules.

### Step 5: Restart the App

After completing Firebase setup:

```bash
# Stop current server (Ctrl+C if running)

# Clear cache and restart
npx expo start -c

# Press 'a' for Android or scan QR with Expo Go
```

## 🎯 App Flow

### New User Experience:

1. **Landing Page** → Shows app intro with stats
   - User sees "Get Started" button

2. **Welcome Page** → Authentication options
   - "Continue with Google" (if available)
   - "Sign Up with Email"
   - "Already have an account? Log In"

3. **Sign Up Page** → Create account
   - Enter Display Name
   - Enter Email
   - Enter Password
   - Confirm Password
   - Optional: "Continue with Google"

4. **Automatic Data Storage** → Firebase saves:
   - Authentication: Email, Password (hashed), UID
   - Firestore `users` collection:
      ```javascript
      {
        email: "user@example.com",
        displayName: "John Doe",
        photoURL: null, // or Google profile pic
        createdAt: Timestamp,
        updatedAt: Timestamp
      }
      ```

5. **Home Screen** → User lands on main app

### Returning User:

1. **Landing Page** → Auto-redirects to Home (if logged in)
2. **OR Login Page** → Enter credentials → Home

## 🧪 Testing Your Setup

### Test Email/Password Sign-Up:

1. Launch app
2. Click "Get Started"
3. Click "Sign Up with Email"
4. Fill in:
   - Display Name: "Test User"
   - Email: "test@example.com"
   - Password: "test123456"
   - Confirm Password: "test123456"
5. Click "Sign Up"

**Verify in Firebase:**

- Go to [Authentication](https://console.firebase.google.com/project/let-itout/authentication/users)
- You should see the new user
- Go to [Firestore](https://console.firebase.google.com/project/let-itout/firestore/data)
- Check `users` collection → You should see a document with the user's data

### Test Google Sign-In (After Native Build):

1. Click "Get Started"
2. Click "Continue with Google"
3. Select your Google account
4. User created in both Firebase Auth and Firestore

## 📱 Important Notes

### Google Sign-In Limitations:

**In Expo Go:**

- Google Sign-In won't work (requires native build)
- Button will show "Google Sign-In Unavailable" message
- Email/Password works perfectly

**For Full Google Sign-In:**

```bash
# Connect Android device or start emulator
adb devices

# Build native app
npx expo run:android
```

### Current Package Name

Your Android package is: `com.android.letitout`

**Note:** If you need to change it:

1. Update `android/app/build.gradle` (line with `applicationId`)
2. Update package in Firebase Console
3. Re-download `google-services.json`

## 🔍 Verification Checklist

Before running the app, ensure:

- [ ] SHA-1 added to Firebase Console
- [ ] Web Client ID updated in `context/AuthContext.jsx`
- [ ] Email/Password enabled in Firebase Authentication
- [ ] Google Sign-In enabled in Firebase Authentication
- [ ] Firestore database created
- [ ] Firestore security rules set
- [ ] App restarted with `npx expo start -c`

## 🐛 Troubleshooting

### "Google Sign-In Unavailable" message

- Expected in Expo Go
- Build with `npx expo run:android` for full functionality

### "Permission denied" in Firestore

- Check security rules are published
- Verify user is authenticated

### App doesn't redirect after sign-in

- Clear cache: `npx expo start -c`
- Check if Firebase credentials are correct

### SHA-1 errors

- Ensure SHA-1 is added to correct app in Firebase
- Try rebuilding: `cd android && ./gradlew clean && cd ..`

## 📞 Support

If you encounter issues:

1. Check the [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for detailed setup
2. Check the [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common errors
3. Verify all steps in this guide are completed

---

**Your app is ready for email/password authentication!** 🎉

Complete the Firebase Console steps above to enable full functionality including Google Sign-In.
