#!/bin/bash

# Firebase Setup Helper Script
# This script helps you complete the Firebase setup for Google Sign-In

echo "========================================="
echo "Firebase Google Sign-In Setup Helper"
echo "========================================="
echo ""

echo "📱 Your Firebase Configuration:"
echo "Project ID: let-itout"
echo "Android Package: com.android.letitout"
echo ""

echo "Step 1: Getting SHA-1 Certificate Fingerprint"
echo "----------------------------------------------"
cd android
echo "Running: ./gradlew signingReport"
echo ""
./gradlew signingReport | grep "SHA1:" | head -1
echo ""

echo "Step 2: Add SHA-1 to Firebase Console"
echo "----------------------------------------------"
echo "1. Go to: https://console.firebase.google.com/project/let-itout/settings/general"
echo "2. Scroll to 'Your apps' section"
echo "3. Find your Android app (com.android.letitout)"
echo "4. Click 'Add fingerprint'"
echo "5. Paste the SHA-1 fingerprint shown above"
echo "6. Click 'Save'"
echo ""

echo "Step 3: Get Web Client ID"
echo "----------------------------------------------"
echo "1. In the same Firebase Console page"
echo "2. Look for a Web app in 'Your apps' section"
echo "3. Copy the 'Web client ID' (format: XXXXXX-XXXXXXXX.apps.googleusercontent.com)"
echo "4. Update context/AuthContext.jsx with this Web Client ID"
echo ""

echo "Step 4: Enable Authentication Methods"
echo "----------------------------------------------"
echo "1. Go to: https://console.firebase.google.com/project/let-itout/authentication/providers"
echo "2. Enable 'Email/Password' sign-in method"
echo "3. Enable 'Google' sign-in method (select a support email)"
echo ""

echo "Step 5: Set up Firestore Database"
echo "----------------------------------------------"
echo "1. Go to: https://console.firebase.google.com/project/let-itout/firestore"
echo "2. Click 'Create database'"
echo "3. Start in 'production mode'"
echo "4. Choose your preferred location"
echo "5. Update security rules (see FIREBASE_SETUP.md)"
echo ""

echo "Step 6: Rebuild the App"
echo "----------------------------------------------"
echo "After completing the above steps, rebuild:"
echo "  cd .."
echo "  cd android && ./gradlew clean && cd .."
echo "  npx expo run:android"
echo ""

echo "========================================="
echo "Setup helper completed!"
echo "========================================="
