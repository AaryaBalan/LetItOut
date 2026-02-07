import { useRef, useState } from 'react';
import { Platform, View } from 'react-native';

// Safely import ads library - may fail in Expo Go or without native build
let BannerAd, BannerAdSize, TestIds, useForeground;
let adsAvailable = false;

try {
    const ads = require('react-native-google-mobile-ads');
    BannerAd = ads.BannerAd;
    BannerAdSize = ads.BannerAdSize;
    TestIds = ads.TestIds;
    useForeground = ads.useForeground;
    adsAvailable = true;
} catch (e) {
    console.warn('Google Mobile Ads not available. This is expected in Expo Go. Use a development build to enable ads.');
    adsAvailable = false;
}

const adUnitId = adsAvailable && __DEV__ ? TestIds?.ADAPTIVE_BANNER || '' : 'ca-app-pub-2512361520457456/4724013214';

function BannerAds() {
    const bannerRef = useRef(null);
    const [adFailed, setAdFailed] = useState(false);

    // If ads library not available, return empty (no crash)
    if (!adsAvailable || !BannerAd || !BannerAdSize) {
        return null;
    }

    // (iOS) WKWebView can terminate if app is in a "suspended state"
    if (useForeground) {
        useForeground(() => {
            Platform.OS === 'ios' && bannerRef.current?.load();
        });
    }

    if (adFailed) {
        return null;
    }

    return (
        <View>
            <BannerAd
                ref={bannerRef}
                unitId={adUnitId}
                size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                onAdFailedToLoad={(error) => {
                    console.warn('Ad failed to load:', error);
                    setAdFailed(true);
                }}
            />
        </View>
    );
}

export default BannerAds;