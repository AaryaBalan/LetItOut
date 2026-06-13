let AdEventType, InterstitialAd, TestIds;
let isAdsAvailable = false;

try {
    const ads = require('react-native-google-mobile-ads');
    AdEventType = ads.AdEventType;
    InterstitialAd = ads.InterstitialAd;
    TestIds = ads.TestIds;
    isAdsAvailable = true;
} catch (_e) {
    // react-native-google-mobile-ads not available (e.g. Expo Go)
}

let interstitial = null;

if (isAdsAvailable && InterstitialAd && TestIds) {
    try {
        const adUnitId = __DEV__ ? TestIds.INTERSTITIAL : 'ca-app-pub-2512361520457456/1362953981';
        interstitial = InterstitialAd.createForAdRequest(adUnitId);
    } catch (_e) {
        // ignore
    }
}

export const showInterstitialAd = (onFinished) => {
    if (!isAdsAvailable || !interstitial) {
        if (onFinished) onFinished();
        return;
    }

    // Load the ad
    interstitial.load();

    // When Ad loads
    const loadedListener = interstitial.addAdEventListener(
        AdEventType.LOADED,
        () => {
            interstitial.show();
        }
    );

    // When Ad closes
    const closedListener = interstitial.addAdEventListener(
        AdEventType.CLOSED,
        () => {
            loadedListener();
            closedListener();
            if (onFinished) onFinished();
        }
    );

    // If Ad errors out
    const errorListener = interstitial.addAdEventListener(
        AdEventType.ERROR,
        () => {
            loadedListener();
            closedListener();
            errorListener();
            if (onFinished) onFinished();
        }
    );
};

// Default export required by Expo Router
export default function InterstitialAdsScreen() {
    return null;
}