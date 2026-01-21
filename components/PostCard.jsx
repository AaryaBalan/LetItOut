import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CategoryBadge from './CategoryBadge';

export default function PostCard({ post }) {
    const [supportCount, setSupportCount] = useState(post.reactions.support);
    const [hugCount, setHugCount] = useState(post.reactions.hug);
    const [supportActive, setSupportActive] = useState(false);
    const [hugActive, setHugActive] = useState(false);

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

    return (
        <Link href={`/post/${post.id}`} asChild>
            <TouchableOpacity style={styles.card}>
                <View style={styles.header}>
                    <Text style={styles.title}>
                        {post.title}
                    </Text>
                    <CategoryBadge category={post.category} />
                </View>

                <Text style={styles.preview} numberOfLines={2}>
                    {post.preview}
                </Text>

                <View style={styles.footer}>
                    <Text style={styles.timestamp}>{post.timestamp}</Text>

                    <View style={styles.reactions}>
                        <TouchableOpacity
                            onPress={(e) => {
                                e.preventDefault();
                                handleSupport();
                            }}
                            style={styles.reactionButton}
                        >
                            <Text style={styles.emoji}>❤️</Text>
                            <Text style={[styles.reactionCount, supportActive && styles.reactionActive]}>
                                {supportCount}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={(e) => {
                                e.preventDefault();
                                handleHug();
                            }}
                            style={styles.reactionButton}
                        >
                            <Text style={styles.emoji}>🤗</Text>
                            <Text style={[styles.reactionCount, hugActive && styles.reactionActiveHug]}>
                                {hugCount}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        </Link>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#f3f4f6',
    },
    header: {
        marginBottom: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 8,
    },
    preview: {
        color: '#4b5563',
        marginBottom: 12,
        lineHeight: 20,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    timestamp: {
        fontSize: 14,
        color: '#9ca3af',
    },
    reactions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    reactionButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    emoji: {
        fontSize: 18,
        marginRight: 4,
    },
    reactionCount: {
        fontSize: 14,
        fontWeight: '500',
        color: '#4b5563',
    },
    reactionActive: {
        color: '#ef4444',
    },
    reactionActiveHug: {
        color: '#f59e0b',
    },
});
