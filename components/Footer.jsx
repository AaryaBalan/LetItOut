import { StyleSheet, Text, View } from 'react-native';

export default function Footer() {
    return (
        <View style={styles.footer}>
            <View style={styles.container}>
                <Text style={styles.logo}>Let It Out</Text>
                <Text style={styles.tagline}>
                    A safe space for emotional support
                </Text>
                <Text style={styles.copyright}>
                    © 2026 Let It Out. All rights reserved.
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    footer: {
        backgroundColor: '#f3f4f6',
        paddingVertical: 32,
        paddingHorizontal: 24,
        marginTop: 48 },
    container: {
        alignItems: 'center' },
    logo: {
        fontSize: 24,
        fontWeight: '400',
        color: '#6366f1',
        marginBottom: 8,
        fontFamily: 'Fredoka-Regular' },
    tagline: {
        color: '#4b5563',
        textAlign: 'center',
        marginBottom: 16,
        fontFamily: 'Fredoka-Regular' },
    copyright: {
        fontSize: 14,
        color: '#6b7280',
        fontFamily: 'Fredoka-Regular' } });
