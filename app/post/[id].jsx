import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CategoryBadge from '../../components/CategoryBadge';
import CommentCard from '../../components/CommentCard';
import { getPostById } from '../../data/dummyData';

export default function PostDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const post = getPostById(id);

    const [supportCount, setSupportCount] = useState(post?.reactions.support || 0);
    const [hugCount, setHugCount] = useState(post?.reactions.hug || 0);
    const [supportActive, setSupportActive] = useState(false);
    const [hugActive, setHugActive] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [comments, setComments] = useState(post?.comments || []);

    if (!post) {
        return (
            <SafeAreaView style={styles.errorContainer}>
                <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
                <Text style={styles.errorText}>Post not found</Text>
            </SafeAreaView>
        );
    }

    const handleSupport = () => {
        if (supportActive) {
            setSupportCount(supportCount - 1);
            setSupportActive(false);
        } else {
            setSupportCount(supportCount + 1);
            setSupportActive(true);
        }
    };

    const handleHug = () => {
        if (hugActive) {
            setHugCount(hugCount - 1);
            setHugActive(false);
        } else {
            setHugCount(hugCount + 1);
            setHugActive(true);
        }
    };

    const handleAddComment = () => {
        if (newComment.trim()) {
            const comment = { id: Date.now(), text: newComment, timestamp: 'Just now' };
            setComments([...comments, comment]);
            setNewComment('');
            Alert.alert('Success', 'Your supportive comment has been added!');
        }
    };

    const handleReport = () => {
        Alert.alert('Report Post', 'Thank you for helping keep our community safe. This post has been flagged for review.', [{ text: 'OK' }]);
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Post Details</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                <View style={styles.postCard}>
                    <View style={styles.postHeader}>
                        <Text style={styles.postTitle}>{post.title}</Text>
                        <CategoryBadge category={post.category} />
                    </View>
                    <Text style={styles.postDescription}>{post.description}</Text>
                    <View style={styles.postFooter}>
                        <Text style={styles.timestamp}>{post.timestamp}</Text>
                        <View style={styles.reactions}>
                            <TouchableOpacity onPress={handleSupport} style={styles.reactionButton}>
                                <Text style={styles.emojiLarge}>❤️</Text>
                                <Text style={[styles.reactionCount, supportActive && styles.reactionActive]}>{supportCount}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleHug} style={styles.reactionButton}>
                                <Text style={styles.emojiLarge}>🤗</Text>
                                <Text style={[styles.reactionCount, hugActive && styles.reactionActiveHug]}>{hugCount}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <TouchableOpacity onPress={handleReport} style={styles.reportButton}>
                    <Text style={styles.reportText}>🚩 Report</Text>
                </TouchableOpacity>

                <View style={styles.commentsSection}>
                    <Text style={styles.commentsTitle}>Supportive Comments ({comments.length})</Text>
                    {comments.map(comment => (
                        <CommentCard key={comment.id} comment={comment} />
                    ))}
                </View>

                <View style={styles.addCommentCard}>
                    <Text style={styles.addCommentTitle}>Add your support</Text>
                    <TextInput
                        style={styles.commentInput}
                        placeholder="Share your supportive message..."
                        placeholderTextColor="#9ca3af"
                        multiline
                        value={newComment}
                        onChangeText={setNewComment}
                    />
                    <TouchableOpacity onPress={handleAddComment} style={styles.sendButton}>
                        <Text style={styles.sendButtonText}>Send Support 💜</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ffffff' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    backButton: { padding: 8 },
    headerTitle: { fontSize: 18, fontWeight: '600', color: '#1f2937' },
    placeholder: { width: 40 },
    scrollView: { flex: 1, backgroundColor: '#f9fafb' },
    scrollContent: { paddingHorizontal: 16, paddingVertical: 16 },
    errorContainer: { flex: 1, backgroundColor: '#f9fafb', alignItems: 'center', justifyContent: 'center' },
    errorText: { fontSize: 20, color: '#4b5563' },
    postCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2, borderWidth: 1, borderColor: '#f3f4f6', marginBottom: 16 },
    postHeader: { marginBottom: 16 },
    postTitle: { fontSize: 24, fontWeight: 'bold', color: '#1f2937', marginBottom: 12 },
    postDescription: { color: '#374151', lineHeight: 24, marginBottom: 16 },
    postFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
    timestamp: { fontSize: 14, color: '#9ca3af' },
    reactions: { flexDirection: 'row', alignItems: 'center', gap: 24 },
    reactionButton: { flexDirection: 'row', alignItems: 'center' },
    emojiLarge: { fontSize: 24, marginRight: 8 },
    reactionCount: { fontSize: 16, fontWeight: '500', color: '#4b5563' },
    reactionActive: { color: '#ef4444' },
    reactionActiveHug: { color: '#f59e0b' },
    reportButton: { alignSelf: 'flex-end', marginBottom: 16 },
    reportText: { color: '#ef4444', fontWeight: '500' },
    commentsSection: { marginBottom: 16 },
    commentsTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginBottom: 12 },
    addCommentCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2, borderWidth: 1, borderColor: '#f3f4f6', marginBottom: 16 },
    addCommentTitle: { fontSize: 18, fontWeight: '600', color: '#1f2937', marginBottom: 12 },
    commentInput: { backgroundColor: '#f9fafb', borderRadius: 8, padding: 16, color: '#374151', minHeight: 96, textAlignVertical: 'top', marginBottom: 12 },
    sendButton: { backgroundColor: '#9575cd', paddingVertical: 12, borderRadius: 8 },
    sendButtonText: { color: '#ffffff', fontWeight: '600', textAlign: 'center' },
});
