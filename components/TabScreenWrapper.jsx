import { StyleSheet, View } from 'react-native';
import BannerAds from '../app/ads/BannerAds';

export default function TabScreenWrapper({ children }) {
    return (
        <View style={styles.container}>
            <View style={styles.content}>
                {children}
            </View>
            <View style={styles.adContainer}>
                <BannerAds />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
    adContainer: {
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
});
