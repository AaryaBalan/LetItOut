import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Avatar from './Avatar';

const CommentThread = ({
    comment,
    depth = 0,
    maxDepth = 3,
    onReply,
    onSupport,
    commentSupports = {},
    userCommentSupports = {},
    commentorProfiles = {},
    themeOverride = null // Optional prop to override theme
}) => {
    const { theme: contextTheme } = useTheme();
    const theme = themeOverride || contextTheme;
    const [isCollapsed, setIsCollapsed] = useState(false);

    const hasReplies = comment.replies && comment.replies.length > 0;
    const shouldIndent = depth > 0;
    const canReply = depth < maxDepth;

    // Calculate indentation and line color based on depth
    const indentWidth = depth * 12; // Reduced indentation from 20 to 12
    const lineColors = ['#9575cd', '#B39DDB', '#D1C4E9'];
    // For root (depth 0), use the first color. For nested, cycle through colors.
    const lineColor = lineColors[Math.min(depth, lineColors.length - 1)];

    return (
        <View style={{ marginLeft: indentWidth }}>
            {/* Comment Card with connector */}
            <View style={styles.commentItem}>
                <View style={[
                    styles.horizontalConnector,
                    {
                        backgroundColor: lineColor,
                        width: 15, // Reduced from 20
                        left: -15, // Reduced from -20
                        top: 20, // Align with smaller avatar center
                    }
                ]} />

                <View style={[styles.commentCard, {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    opacity: depth > 0 ? 1 - (depth * 0.05) : 1,
                    marginLeft: 15, // Reduced from 20
                }]}>
                    <View style={styles.commentHeaderSection}>
                        {/* Avatar */}
                        {comment.commentorId && commentorProfiles[comment.commentorId] ? (
                            <Avatar seed={commentorProfiles[comment.commentorId]} size={depth > 0 ? 24 : 28} /> // Smaller avatars
                        ) : (
                            <View style={[styles.commentAvatarPlaceholder, {
                                width: depth > 0 ? 24 : 28, // Smaller placeholders
                                height: depth > 0 ? 24 : 28,
                            }]}>
                                <Ionicons name="person" size={12} color="#9575cd" />
                            </View>
                        )}

                        <View style={styles.commentHeaderContent}>
                            {/* Header with collapse button */}
                            <View style={styles.commentHeader}>
                                <Text style={[styles.commentUsername, { color: theme.text }]}>
                                    {comment.username || 'Anonymous'}
                                </Text>
                                <Text style={[styles.commentTimestamp, { color: theme.textTertiary }]}>
                                    {comment.timestamp}
                                </Text>

                                {/* Collapse/Expand button */}
                                {hasReplies && (
                                    <TouchableOpacity
                                        onPress={() => setIsCollapsed(!isCollapsed)}
                                        style={styles.collapseButton}
                                    >
                                        <Ionicons
                                            name={isCollapsed ? 'chevron-down' : 'chevron-up'}
                                            size={14}
                                            color={theme.textSecondary}
                                        />
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Comment Text */}
                            <Text style={[styles.commentText, { color: theme.textSecondary }]}>
                                {comment.text}
                            </Text>

                            {/* Actions */}
                            <View style={styles.commentActions}>
                                <TouchableOpacity
                                    style={styles.supportButton}
                                    onPress={() => onSupport(comment.id)}
                                >
                                    <Ionicons
                                        name={userCommentSupports[comment.id] ? "heart" : "heart-outline"}
                                        size={13}
                                        color="#66BB6A"
                                    />
                                    <Text style={[styles.supportText, { color: theme.textTertiary }]}>
                                        {commentSupports[comment.id] || 0}
                                    </Text>
                                </TouchableOpacity>

                                {canReply && (
                                    <TouchableOpacity
                                        style={styles.replyButton}
                                        onPress={() => onReply(comment)}
                                    >
                                        <Ionicons name="arrow-undo" size={13} color="#9575cd" />
                                        <Text style={[styles.replyText, { color: '#9575cd' }]}>
                                            Reply
                                        </Text>
                                    </TouchableOpacity>
                                )}

                                {hasReplies && (
                                    <Text style={[styles.replyCount, { color: theme.textTertiary }]}>
                                        {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                                    </Text>
                                )}
                            </View>
                        </View>
                    </View>
                </View>
            </View>

            {/* Nested Replies */}
            {hasReplies && !isCollapsed && (
                <View style={styles.repliesContainer}>
                    {/* Vertical connecting line */}
                    <View style={[
                        styles.verticalLine,
                        {
                            backgroundColor: lineColor,
                            left: depth > 0 ? 9 : 11.5 // Adjusted for smaller hierarchy
                        }
                    ]} />

                    {comment.replies.map((reply, index) => (
                        <CommentThread
                            key={reply.id || index}
                            comment={reply}
                            depth={depth + 1}
                            maxDepth={maxDepth}
                            onReply={onReply}
                            onSupport={onSupport}
                            commentSupports={commentSupports}
                            userCommentSupports={userCommentSupports}
                            commentorProfiles={commentorProfiles}
                            themeOverride={themeOverride} // Pass theme override recursively
                        />
                    ))}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    commentItem: {
        marginBottom: 4, // Reduced margin
    },
    commentCard: {
        borderRadius: 8, // Smaller border radius
        padding: 8, // Reduced padding
        borderWidth: 1,
    },
    commentHeaderSection: {
        flexDirection: 'row',
        gap: 8, // Reduced gap
    },
    commentAvatarPlaceholder: {
        borderRadius: 50,
        backgroundColor: '#F3F0FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    commentHeaderContent: {
        flex: 1,
    },
    commentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2, // Reduced margin
        gap: 6, // Reduced gap
    },
    commentUsername: {
        fontSize: 13, // Slightly smaller
        fontWeight: '600',
    },
    commentTimestamp: {
        fontSize: 11, // Slightly smaller
    },
    collapseButton: {
        marginLeft: 'auto',
        padding: 2,
    },
    commentText: {
        fontSize: 13, // Slightly smaller
        lineHeight: 18, // Tighter line height
        marginBottom: 4, // Reduced margin
    },
    commentActions: {
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12, // Reduced gap
    },
    supportButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    supportText: {
        fontSize: 13, // Slightly smaller
        fontWeight: '600',
    },
    replyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    replyText: {
        fontSize: 13, // Slightly smaller
        fontWeight: '600',
    },
    replyCount: {
        fontSize: 13, // Slightly smaller
        marginLeft: 'auto',
    },
    verticalLine: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 1.5, // Thinner line
        zIndex: 0,
    },
    horizontalConnector: {
        position: 'absolute',
        height: 2,
        zIndex: 1,
    },
    repliesContainer: {
        position: 'relative',
        marginTop: 4,
    },
});

export default CommentThread;
