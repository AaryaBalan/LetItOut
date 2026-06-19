import { StyleSheet, Text, View } from 'react-native';

const categoryColors = {
    'Family': { bg: '#e3f2fd', text: '#5b8fc7' },
    'Stress': { bg: '#ffe8cc', text: '#d9844d' },
    'Relationship': { bg: '#ffd9e8', text: '#d9699f' },
    'Study': { bg: '#d4f0e3', text: '#5cb885' },
    'Mental Health': { bg: '#e8dff5', text: '#111827' },
    'Other': { bg: '#F3F4F6', text: '#7d7d7d' },
};

export default function CategoryBadge({ category }) {
    const colors = categoryColors[category] || categoryColors['Other'];

    return (
        <View style={[styles.badge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.badgeText, { color: colors.text }]}>{category}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 16,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '500',
    },
});
