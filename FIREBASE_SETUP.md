# Firebase Authentication Setup Guide

This guide will help you set up Firebase Authentication with email/password and Google Sign-In for your LetItOut React Native app.

## Prerequisites

- A Firebase account (https://firebase.google.com)
- Node.js and npm installed
- Android Studio (for Android development)
- Expo CLI installed

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard to create your project
4. Once created, you'll be redirected to the project dashboard

## Step 2: Register Your Android App

1. In the Firebase Console, click the Android icon to add an Android app
2. Enter your Android package name: `com.aarya_b.LetItOut` (found in `android/app/build.gradle`)
3. (Optional) Enter an app nickname: "LetItOut"
4. Click "Register app"
5. Download the `google-services.json` file
6. Place it in `android/app/` directory (replace the existing one if present)

## Step 3: Get Firebase Configuration

1. In Firebase Console, go to Project Settings (gear icon)
2. Scroll down to "Your apps" section
3. Click on your Android app
4. Find the "Firebase SDK snippet" section
5. Select "Config" option
6. Copy the configuration object

## Step 4: Update Firebase Configuration Files

### Update `config/firebase.js`

Replace the placeholder values in `config/firebase.js` with your actual Firebase configuration:

```javascript
const firebaseConfig = {
   apiKey: "YOUR_API_KEY_HERE",
   authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
   projectId: "YOUR_PROJECT_ID",
   storageBucket: "YOUR_PROJECT_ID.appspot.com",
   messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
   appId: "YOUR_APP_ID",
};
```

## Step 5: Enable Authentication Methods in Firebase

### Enable Email/Password Authentication

1. In Firebase Console, go to "Authentication" → "Sign-in method"
2. Click on "Email/Password"
3. Toggle "Enable" on
4. Click "Save"

### Enable Google Sign-In

1. In the same "Sign-in method" tab
2. Click on "Google"
3. Toggle "Enable" on
4. Select a support email
5. Click "Save"

## Step 6: Set Up Google Sign-In for Android

### Get SHA-1 Certificate Fingerprint

Run this command in your project directory:

```bash
cd android
./gradlew signingReport
```

Look for the SHA-1 fingerprint under "Variant: debug" → "Config: debug". It will look something like:

```
SHA1: A1:B2:C3:D4:E5:F6:...
```

### Add SHA-1 to Firebase

1. Go to Firebase Console → Project Settings
2. Scroll to "Your apps" section
3. Click on your Android app
4. Click "Add fingerprint"
5. Paste your SHA-1 certificate fingerprint
6. Click "Save"

### Get Web Client ID

1. In Firebase Console, go to Project Settings
2. Scroll to "Your apps" section
3. Under the Web app section (or create one if it doesn't exist), find the "Web client ID"
4. Copy this Web Client ID

### Update AuthContext.jsx

Open `context/AuthContext.jsx` and replace the placeholder:

```javascript
GoogleSignin.configure({
   webClientId: "YOUR_WEB_CLIENT_ID_HERE", // Replace with your actual Web Client ID
   offlineAccess: true,
});
```

## Step 7: Set Up Firestore Database

1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in production mode" (we'll set up rules next)
4. Select a location for your database
5. Click "Enable"

### Set Up Firestore Security Rules

Replace the default rules with these (for development):

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
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }

    // Comments collection
    match /comments/{commentId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```

## Step 8: Test Your Setup

### Install Dependencies

```bash
npm install
```

### Run the App

```bash
npm run android
```

### Test Email/Password Sign-Up

1. Navigate to the Sign-Up page
2. Enter a display name, email, and password
3. Click "Sign Up"
4. Check Firebase Console → Authentication to see the new user
5. Check Firestore Database → users collection to see the user document

### Test Google Sign-In

1. Navigate to the Login or Sign-Up page
2. Click "Continue with Google"
3. Select a Google account
4. The user should be authenticated and redirected to home

## Step 9: Verify User Data in Firestore

After signing up, check your Firestore Database:

1. Go to Firebase Console → Firestore Database
2. You should see a "users" collection
3. Each user document should contain:
   - `email`: User's email
   - `displayName`: User's display name
   - `photoURL`: User's profile photo (for Google sign-in)
   - `createdAt`: Timestamp of account creation
   - `updatedAt`: Timestamp of last update

## Troubleshooting

### Google Sign-In Not Working

1. **Verify SHA-1**: Make sure you added the correct SHA-1 fingerprint to Firebase
2. **Check Web Client ID**: Ensure you're using the Web Client ID, not the Android Client ID
3. **Google Services**: Make sure `google-services.json` is in the correct location
4. **Clean Build**: Try cleaning and rebuilding:
   ```bash
   cd android
   ./gradlew clean
   cd ..
   npm run android
   ```

### Email Sign-Up Errors

1. **Weak Password**: Firebase requires passwords to be at least 6 characters
2. **Email Already in Use**: The email is already registered
3. **Invalid Email**: Check email format

### Firestore Permission Denied

1. Check your Firestore security rules
2. Ensure the user is authenticated before accessing Firestore
3. Verify the user's UID matches the document they're trying to access

## User Data Structure

When a user signs up, the following data is stored in Firestore:

```javascript
{
  email: "user@example.com",
  displayName: "John Doe",
  photoURL: null, // or Google profile picture URL
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## Features Implemented

✅ Email/Password Sign-Up with display name
✅ Email/Password Login
✅ Google Sign-In
✅ Automatic user document creation in Firestore
✅ User data persistence
✅ Proper error handling
✅ Form validation
✅ Loading states
✅ Firebase Authentication with AsyncStorage persistence
✅ Firestore integration for user data storage

## Security Best Practices

1. **Never commit** your `google-services.json` or Firebase config with real credentials to public repositories
2. Always use environment variables for sensitive data in production
3. Implement proper Firestore security rules before deploying
4. Enable App Check for additional security
5. Set up email verification for new users
6. Implement password reset functionality

## Next Steps

- [ ] Add email verification
- [ ] Implement password reset
- [ ] Add profile picture upload
- [ ] Implement user profile editing
- [ ] Add social authentication (Facebook, Apple)
- [ ] Set up Firebase Cloud Messaging for push notifications
- [ ] Implement proper production security rules
