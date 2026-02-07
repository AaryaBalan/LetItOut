# Google Mobile Ads Setup Guide

## Current Status
✅ Banner ads code integrated into all tab screens  
✅ Error handling improved to prevent crashes  
⚠️ **Ads require a development build to work** (won't work in Expo Go)

## Why Ads Don't Work in Expo Go

`react-native-google-mobile-ads` is a **native module** that requires:
- Native iOS/Android code compilation
- Google Mobile Ads SDK integration
- App configuration in Google AdMob

**Expo Go cannot run native modules** - it only supports JavaScript-based libraries.

## Solution: Create a Development Build

### Option 1: EAS Build (Recommended - Cloud-based)

1. **Install EAS CLI**:
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**:
   ```bash
   eas login
   ```

3. **Configure EAS**:
   ```bash
   eas build:configure
   ```

4. **Build for Android** (faster, can test on emulator):
   ```bash
   eas build --profile development --platform android
   ```

5. **Build for iOS** (requires Apple Developer account):
   ```bash
   eas build --profile development --platform ios
   ```

6. **Install the build** on your device when complete

### Option 2: Local Development Build

1. **Prebuild the native projects**:
   ```bash
   npx expo prebuild
   ```

2. **Run on Android**:
   ```bash
   npx expo run:android
   ```

3. **Run on iOS** (Mac only):
   ```bash
   npx expo run:ios
   ```

## Google AdMob Configuration

### 1. Create AdMob Account
- Go to https://admob.google.com
- Create an account and add your app

### 2. Get App IDs
You'll need:
- **Android App ID**: `ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX`
- **iOS App ID**: `ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX`

### 3. Configure app.json

Add to your `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "react-native-google-mobile-ads",
        {
          "androidAppId": "ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX",
          "iosAppId": "ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX"
        }
      ]
    ]
  }
}
```

### 4. Your Ad Unit IDs (Already Configured)

✅ **Banner Ads**: `ca-app-pub-2512361520457456/9617042041`  
✅ **Interstitial Ads**: `ca-app-pub-2512361520457456/1362953981`

## Testing Ads

### Development Mode
- App automatically uses **Google test ads**
- No real ads are shown
- Safe for testing without affecting metrics

### Production Mode
- Uses your real ad unit IDs
- Shows actual ads
- Earns revenue

## Current Implementation

### Files Modified
- ✅ `components/TabScreenWrapper.jsx` - Wrapper for banner ads
- ✅ `app/(tabs)/home.jsx` - Banner ads integrated
- ✅ `app/(tabs)/explore.jsx` - Banner ads integrated
- ✅ `app/(tabs)/chat.jsx` - Banner ads integrated
- ✅ `app/(tabs)/profile.jsx` - Banner ads integrated
- ✅ `app/ads/BannerAds.jsx` - Improved error handling
- ✅ `app/ads/InterstitialAds.jsx` - Fixed export warning

### What Works Now
- ✅ App runs without crashing (ads gracefully disabled in Expo Go)
- ✅ Console shows helpful message about development build
- ✅ Code is ready for when you create a development build

## Next Steps

1. **Choose your build method** (EAS or local)
2. **Configure app.json** with your AdMob app IDs
3. **Create development build**
4. **Test ads** on real device
5. **Monitor performance** in AdMob dashboard

## Quick Start (EAS Build)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure
eas build:configure

# Build for Android (recommended for testing)
eas build --profile development --platform android

# Download and install the APK when ready
```

## Troubleshooting

### "Module not found" error
- **Expected in Expo Go** - this is normal
- Create a development build to fix

### Ads not showing in development build
1. Check AdMob app IDs in `app.json`
2. Verify ad unit IDs are correct
3. Check console for error messages
4. Ensure internet connection is active

### Test ads not showing
- Wait a few seconds for ads to load
- Check AdMob account is active
- Verify app.json configuration

## Resources

- [Expo Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Google Mobile Ads Setup](https://docs.page/invertase/react-native-google-mobile-ads)
- [AdMob Dashboard](https://admob.google.com)
