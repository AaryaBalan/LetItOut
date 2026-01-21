import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
    Alert,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getPostById } from "../../data/dummyData";

const getCategoryColor = (category) => {
    const colors = {
        Study: "#E1BEE7",
        "Mental Health": "#B39DDB",
        Mindfulness: "#FFE082",
        Stress: "#FFAB91",
        Anxiety: "#B39DDB",
        Relationship: "#F48FB1",
        Family: "#80CBC4",
    };
    return colors[category] || "#E0E0E0";
};

const getCategoryLabel = (category) => {
    const labels = {
        Study: "ACADEMIC STRESS",
    };
    return labels[category] || category.toUpperCase();
};

export default function PostDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const post = getPostById(id);

    const [supportCount, setSupportCount] = useState(
        post?.reactions.support || 0,
    );
    const [hugCount, setHugCount] = useState(post?.reactions.hug || 0);
    const [supportActive, setSupportActive] = useState(false);
    const [hugActive, setHugActive] = useState(false);
    const [meTooActive, setMeTooActive] = useState(false);
    const [keepGoingActive, setKeepGoingActive] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [comments, setComments] = useState(post?.comments || []);

    if (!post) {
        return (
            <SafeAreaView style={styles.errorContainer}>
                <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
                <Text style={styles.errorText}>Post not found</Text>
            </SafeAreaView>
        );
    }

    const handleSupport = () => {
        setSupportActive(!supportActive);
        setSupportCount(supportActive ? supportCount - 1 : supportCount + 1);
    };

    const handleHug = () => {
        setHugActive(!hugActive);
        setHugCount(hugActive ? hugCount - 1 : hugCount + 1);
    };

    const handleAddComment = () => {
        if (newComment.trim()) {
            const comment = {
                id: Date.now(),
                text: newComment,
                timestamp: "Just now",
                username: "You",
            };
            setComments([...comments, comment]);
            setNewComment("");
        }
    };

    const handleReport = () => {
        Alert.alert(
            "Report Content",
            "Thank you for helping keep our community safe.",
            [{ text: "OK" }],
        );
    };

    const totalHugs = hugCount + supportCount;

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <Ionicons name="chevron-back" size={28} color="#212121" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Post Detail</Text>
                <TouchableOpacity style={styles.moreButton}>
                    <Ionicons name="ellipsis-horizontal" size={24} color="#212121" />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Post Card */}
                <View style={styles.postCard}>
                    <View style={styles.postHeader}>
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

                    <Text style={styles.postTitle}>{post.title}</Text>
                    <Text style={styles.postDescription}>{post.description}</Text>

                    {/* Hugs Sent */}
                    <View style={styles.hugsSentContainer}>
                        <View style={styles.hugIcon}>
                            <Ionicons name="heart" size={16} color="#E57373" />
                        </View>
                        <View style={styles.hugIcon}>
                            <Ionicons name="hand-left" size={16} color="#FFB74D" />
                        </View>
                        <Text style={styles.hugsSentText}>{totalHugs} hugs sent</Text>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={[
                                styles.actionButton,
                                hugActive && styles.actionButtonActive,
                            ]}
                            onPress={handleHug}
                        >
                            <Ionicons
                                name="hand-left"
                                size={18}
                                color={hugActive ? "#FFB74D" : "#9575cd"}
                            />
                            <Text
                                style={[
                                    styles.actionButtonText,
                                    hugActive && styles.actionButtonTextActive,
                                ]}
                            >
                                Send Hug
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.actionButton,
                                meTooActive && styles.actionButtonActive,
                            ]}
                            onPress={() => setMeTooActive(!meTooActive)}
                        >
                            <Ionicons
                                name="happy"
                                size={18}
                                color={meTooActive ? "#66BB6A" : "#9575cd"}
                            />
                            <Text
                                style={[
                                    styles.actionButtonText,
                                    meTooActive && styles.actionButtonTextActive,
                                ]}
                            >
                                Me too
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.actionButton,
                                keepGoingActive && styles.actionButtonActive,
                            ]}
                            onPress={() => setKeepGoingActive(!keepGoingActive)}
                        >
                            <Ionicons
                                name="bulb"
                                size={18}
                                color={keepGoingActive ? "#FFA726" : "#9575cd"}
                            />
                            <Text
                                style={[
                                    styles.actionButtonText,
                                    keepGoingActive && styles.actionButtonTextActive,
                                ]}
                            >
                                Keep going
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Supportive Replies Section */}
                <View style={styles.repliesSection}>
                    <View style={styles.repliesHeader}>
                        <Text style={styles.repliesTitle}>Supportive Replies</Text>
                        <Text style={styles.repliesCount}>
                            {comments.length} REPLIES
                        </Text>
                    </View>

                    {/* Comments List */}
                    {comments.map((comment, index) => (
                        <View key={comment.id} style={styles.commentCard}>
                            <View style={styles.commentHeader}>
                                <Text style={styles.commentUsername}>
                                    {comment.username || `KindSoul_${index + 1}`}
                                </Text>
                                <Text style={styles.commentTimestamp}>
                                    {comment.timestamp}
                                </Text>
                            </View>
                            <Text style={styles.commentText}>{comment.text}</Text>
                        </View>
                    ))}
                </View>

                {/* Report Button */}
                <TouchableOpacity
                    onPress={handleReport}
                    style={styles.reportButton}
                >
                    <Ionicons name="flag-outline" size={16} color="#9E9E9E" />
                    <Text style={styles.reportText}>REPORT CONTENT</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Bottom Input */}
            <View style={styles.bottomInput}>
                <TextInput
                    style={styles.input}
                    placeholder="Type a message of support..."
                    placeholderTextColor="#BDBDBD"
                    value={newComment}
                    onChangeText={setNewComment}
                />
                <TouchableOpacity style={styles.emojiButton}>
                    <Ionicons name="happy-outline" size={24} color="#9E9E9E" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.sendButton}
                    onPress={handleAddComment}
                    disabled={!newComment.trim()}
                >
                    <Ionicons
                        name="send"
                        size={20}
                        color={newComment.trim() ? "#FFFFFF" : "#BDBDBD"}
                    />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F5F5F5",
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F5F5F5",
    },
    errorText: {
        fontSize: 16,
        color: "#757575",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E0E0E0",
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "flex-start",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#212121",
    },
    moreButton: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "flex-end",
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    postCard: {
        backgroundColor: "#FFFFFF",
        padding: 20,
        marginBottom: 16,
    },
    postHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
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
    postTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#212121",
        marginBottom: 12,
        lineHeight: 28,
    },
    postDescription: {
        fontSize: 15,
        color: "#616161",
        lineHeight: 24,
        marginBottom: 20,
    },
    hugsSentContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
    },
    hugIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "#F5F5F5",
        justifyContent: "center",
        alignItems: "center",
        marginRight: -8,
        borderWidth: 2,
        borderColor: "#FFFFFF",
    },
    hugsSentText: {
        fontSize: 14,
        color: "#757575",
        marginLeft: 16,
    },
    actionButtons: {
        flexDirection: "row",
        gap: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        borderRadius: 20,
        backgroundColor: "#F3E5F5",
        gap: 6,
    },
    actionButtonActive: {
        backgroundColor: "#E1BEE7",
    },
    actionButtonText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#9575cd",
    },
    actionButtonTextActive: {
        color: "#6A1B9A",
    },
    repliesSection: {
        backgroundColor: "#FFFFFF",
        padding: 20,
        marginBottom: 16,
    },
    repliesHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    repliesTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#212121",
    },
    repliesCount: {
        fontSize: 12,
        fontWeight: "700",
        color: "#9E9E9E",
        letterSpacing: 0.5,
    },
    commentCard: {
        marginBottom: 20,
    },
    commentHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    commentUsername: {
        fontSize: 14,
        fontWeight: "600",
        color: "#9575cd",
    },
    commentTimestamp: {
        fontSize: 12,
        color: "#BDBDBD",
    },
    commentText: {
        fontSize: 14,
        color: "#616161",
        lineHeight: 22,
    },
    reportButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        gap: 8,
    },
    reportText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#9E9E9E",
        letterSpacing: 0.5,
    },
    bottomInput: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: "#E0E0E0",
        gap: 12,
    },
    input: {
        flex: 1,
        backgroundColor: "#F5F5F5",
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        color: "#212121",
    },
    emojiButton: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
    },
    sendButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#9575cd",
        justifyContent: "center",
        alignItems: "center",
    },
});
