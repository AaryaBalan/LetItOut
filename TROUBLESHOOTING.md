# Troubleshooting Guide

## ✅ Google Sign-In Native Module Error - FIXED

**Error:**

```
TurboModuleRegistry.getEnforcing(...): 'RNGoogleSignin' could not be found
```

**Solution Applied:**
The code has been updated to make Google Sign-In optional. The app will now:

- Work without Google Sign-In if the native module isn't available
- Show the Google Sign-In button only when the module is properly linked
- Fall back gracefully to email/password authentication only

### To Enable Google Sign-In (Optional)

1. **Ensure your device/emulator is connected:**

   ```bash
   adb devices
   ```

2. **Clean and rebuild the Android app:**

   ```bash
   cd android
   ./gradlew clean
   cd ..
   npx expo run:android
   ```

3. **If you still get errors, try:**

   ```bash
   # Clear metro cache
   npx expo start -c

   # Or full rebuild
   cd android
   ./gradlew clean
   cd ..
   rm -rf node_modules
   npm install
   npx expo run:android
   ```

## Current Status

✅ **Email/Password Authentication** - Fully functional
✅ **Firestore Integration** - Fully functional
⚠️ **Google Sign-In** - Optional (requires rebuild with connected device)

## How to Run the App

### Option 1: Development Mode (Recommended for now)

```bash
# Start Metro bundler
npm start

# Then press 'a' for Android
```

### Option 2: Full Native Build

```bash
# Make sure device/emulator is connected
adb devices

# Build and run
npx expo run:android
```

## Testing Without Google Sign-In

The app will work perfectly with email/password authentication:

1. **Sign Up:**
   - Navigate to the sign-up page
   - Enter display name, email, and password
   - Click "Sign Up"
   - User data will be stored in Firebase Auth and Firestore

2. **Login:**
   - Navigate to the login page
   - Enter email and password
   - Click "Log In"

3. **Verify:**
   - Check Firebase Console → Authentication
   - Check Firestore Database → users collection

## When Google Sign-In Will Be Available

The Google Sign-In button will automatically appear once:

1. The app is rebuilt with `npx expo run:android` on a connected device
2. The native module is properly linked
3. Firebase is configured with SHA-1 certificate

Until then, the app works perfectly with email/password authentication!

## Common Errors

### 1. Missing Default Export

**Error:**

```
Route "./auth/login.jsx" is missing the required default export
```

**Cause:** Usually a caching issue

**Solution:**

```bash
npx expo start -c
```

### 2. SafeAreaView Deprecation Warning

**Warning:**

```
SafeAreaView has been deprecated
```

**Status:** This is just a warning and doesn't affect functionality. The app already uses `react-native-safe-area-context` in login/signin pages.

### 3. No Connected Device

**Error:**

```
No Android connected device found
```

**Solution:**

- Start an Android emulator, OR
- Connect a physical Android device with USB debugging enabled, OR
- Use `npm start` and scan QR code with Expo Go app

## Device Setup

### Using Android Emulator

1. Open Android Studio
2. Go to Tools → Device Manager
3. Create a new virtual device (if needed)
4. Start the emulator
5. Run: `npx expo run:android`

### Using Physical Device

1. Enable Developer Options on your Android device
2. Enable USB Debugging
3. Connect via USB
4. Run: `adb devices` to verify connection
5. Run: `npx expo run:android`

### Using Expo Go (Easiest)

1. Install Expo Go from Play Store
2. Run: `npm start`
3. Scan the QR code
4. **Note:** Google Sign-In won't work in Expo Go without a custom development build

## Next Steps

1. ✅ Email/Password auth is ready to use now
2. ⚠️ To enable Google Sign-In:
   - Connect a device/emulator
   - Run `npx expo run:android`
   - Complete Firebase setup (SHA-1, Web Client ID)
3. 📱 For production: Create a custom development build or standalone app

## Quick Start (Working Now)

```bash
# Clear cache and start
npx expo start -c

# Press 'a' for Android (with device connected)
# OR scan QR with Expo Go app
```

Your email/password authentication is fully functional! 🎉
