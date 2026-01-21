import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const getCategoryColor = (category) => {
    const colors = {
        Study: "#FFE082",
        "Mental Health": "#B39DDB",
        Mindfulness: "#FFE082",
        Stress: "#EF9A9A",
        Anxiety: "#B39DDB",
        Relationship: "#F48FB1",
        Family: "#80CBC4",
    };
    return colors[category] || "#E0E0E0";
};

const getCategoryLabel = (category) => {
    const labels = {
        Study: "STUDY SUPPORT",
        "Mental Health": "MENTAL HEALTH",
        Mindfulness: "MINDFULNESS",
    };
    return labels[category] || category.toUpperCase();
};

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

    const commentCount = post.comments?.length || 0;

    return (
        <Link href={`/post/${post.id}`} asChild>
            <TouchableOpacity style={styles.card}>
                <View style={styles.cardHeader}>
                    <View
                        style={[
                            styles.categoryBadge,
                            { backgroundColor: getCategoryColor(post.category) },
                        ]}
                    >
                        <Text style={styles.categoryText}>
                            {getCategoryLabel(post.category)}
                        </Text>
                    </View>
                    <Text style={styles.timestamp}>{post.timestamp}</Text>
                </View>

                <Text style={styles.title}>{post.title}</Text>

                <Text style={styles.preview} numberOfLines={3}>
                    {post.description}
                </Text>

                <View style={styles.footer}>
                    <View style={styles.reactions}>
                        <TouchableOpacity
                            onPress={(e) => {
                                e.preventDefault();
                                handleSupport();
                            }}
                            style={styles.reactionButton}
                        >
                            <Ionicons
                                name={supportActive ? "heart" : "heart-outline"}
                                size={20}
                                color={supportActive ? "#E57373" : "#9E9E9E"}
                            />
                            <Text
                                style={[
                                    styles.reactionCount,
                                    supportActive && styles.reactionActive,
                                ]}
                            >
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
                            <Ionicons
                                name={hugActive ? "hand-left" : "hand-left-outline"}
                                size={20}
                                color={hugActive ? "#FFB74D" : "#9E9E9E"}
                            />
                            <Text
                                style={[
                                    styles.reactionCount,
                                    hugActive && styles.reactionActiveHug,
                                ]}
                            >
                                {hugCount}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.commentSection}>
                        <Ionicons
                            name="chatbubble-outline"
                            size={18}
                            color="#9E9E9E"
                        />
                        <Text style={styles.commentCount}>{commentCount}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        </Link>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    categoryBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    categoryText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#212121",
        letterSpacing: 0.5,
    },
    timestamp: {
        fontSize: 13,
        color: "#BDBDBD",
    },
    title: {
        fontSize: 18,
        fontWeight: "700",
        color: "#212121",
        marginBottom: 8,
        lineHeight: 24,
    },
    preview: {
        fontSize: 14,
        color: "#757575",
        lineHeight: 22,
        marginBottom: 16,
    },
    footer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    reactions: {
        flexDirection: "row",
        gap: 16,
    },
    reactionButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    reactionCount: {
        fontSize: 14,
        fontWeight: "600",
        color: "#757575",
    },
    reactionActive: {
        color: "#E57373",
    },
    reactionActiveHug: {
        color: "#FFB74D",
    },
    commentSection: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    commentCount: {
        fontSize: 14,
        fontWeight: "600",
        color: "#757575",
    },
});
