import { StyleSheet, Text, View } from 'react-native';

export default function CommentCard({ comment }) {
    return (
        <View style={styles.card}>
            <Text style={styles.text}>
                {comment.text}
            </Text>
            <Text style={styles.timestamp}>{comment.timestamp}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
    },
    text: {
        color: '#374151',
        marginBottom: 8,
        lineHeight: 20,
    },
    timestamp: {
        fontSize: 12,
        color: '#9ca3af',
    },
});
