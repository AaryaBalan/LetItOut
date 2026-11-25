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

function getOrCreateInterstitial() {
    if (!isAdsAvailable || !InterstitialAd || !TestIds) return null;
    if (interstitial) return interstitial;

    try {
        // Use TestIds.INTERSTITIAL to avoid crashing if publisher ID does not match app.json
        const adUnitId = TestIds.INTERSTITIAL;
        interstitial = InterstitialAd.createForAdRequest(adUnitId, {
            requestNonPersonalizedAdsOnly: true,
        });
        return interstitial;
    } catch (_e) {
        return null;
    }
}

export const showInterstitialAd = (onFinished) => {
    try {
        const adInstance = getOrCreateInterstitial();
        if (!adInstance || !AdEventType) {
            if (onFinished) onFinished();
            return;
        }

        let isHandled = false;
        const done = () => {
            if (!isHandled) {
                isHandled = true;
                if (onFinished) onFinished();
            }
        };

        const loadedListener = adInstance.addAdEventListener(
            AdEventType.LOADED,
            () => {
                try {
                    adInstance.show();
                } catch (_err) {
                    done();
                }
            }
        );

        const closedListener = adInstance.addAdEventListener(
            AdEventType.CLOSED,
            () => {
                try { loadedListener(); } catch (_) {}
                try { closedListener(); } catch (_) {}
                try { errorListener(); } catch (_) {}
                done();
            }
        );

        const errorListener = adInstance.addAdEventListener(
            AdEventType.ERROR,
            () => {
                try { loadedListener(); } catch (_) {}
                try { closedListener(); } catch (_) {}
                try { errorListener(); } catch (_) {}
                done();
            }
        );

        adInstance.load();
    } catch (_err) {
        if (onFinished) onFinished();
    }
};

// Default export required by Expo Router
export default function InterstitialAdsScreen() {
    return null;
}
