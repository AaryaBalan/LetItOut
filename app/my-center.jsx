import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { useRouter } from "expo-router";
import { collection, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Avatar from "../components/Avatar";
import Loading from "../components/Loading";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { createPerspectiveNotification } from "../utils/notifications";

export default function MyCenter() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [commentsByPost, setCommentsByPost] = useState({});
  const [activeTab, setActiveTab] = useState("posts"); // "posts" or "comments"
  const [selectedPost, setSelectedPost] = useState(null); // Selected post for comments detail view
  const [ratingFeedback, setRatingFeedback] = useState({}); // Track saved status: { [commentId]: 'Saved!' }
  const [expandedCommentId, setExpandedCommentId] = useState(null);

  // 1. Fetch current user's posts
  useEffect(() => {
    if (!user) return;

    const postsRef = collection(db, "posts");
    const q = query(postsRef, where("authorId", "==", user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedPosts = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title,
            description: data.description,
            feelPercentage: data.feelPercentage ?? 0,
            category: data.category || "Other",
            createdAt: data.createdAt,
          };
        });

        // Sort posts in-memory by createdAt descending
        fetchedPosts.sort((a, b) => {
          const aTime = a.createdAt?.seconds 
            ? a.createdAt.seconds * 1000 
            : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          const bTime = b.createdAt?.seconds 
            ? b.createdAt.seconds * 1000 
            : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          return bTime - aTime;
        });

        setPosts(fetchedPosts);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching my posts:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // 2. Fetch comments for each post in real-time
  useEffect(() => {
    if (posts.length === 0) return;

    const unsubscribes = posts.map((post) => {
      const commentsRef = collection(db, "comments");
      const q = query(commentsRef, where("postId", "==", post.id));

      return onSnapshot(q, (snapshot) => {
        const postComments = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            text: data.comment || data.text,
            commentorId: data.commentorId,
            commentorName: data.commentorName || "Anonymous",
            commentorAvatar: data.commentorAvatar || "anonymous",
            perspectiveRating: data.perspectiveRating, // Can be undefined initially
            createdAt: data.createdAt,
            postId: post.id,
            postTitle: post.title,
          };
        });

        setCommentsByPost((prev) => ({
          ...prev,
          [post.id]: postComments,
        }));
      });
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [posts]);

  // Handle saving rating and computing delta relative to the previous rating
  const handleRatingChange = async (post, comment, val) => {
    try {
      const initial = post.feelPercentage ?? 0;
      // Previous rating defaults to post feelPercentage if undefined
      const prevRating = comment.perspectiveRating !== undefined ? comment.perspectiveRating : initial;
      const delta = val - prevRating;

      // 1. Update rating in Firestore
      const commentRef = doc(db, "comments", comment.id);
      await updateDoc(commentRef, {
        perspectiveRating: val,
      });

      // 2. Create notification for the commenter using the delta rating (only if delta is not zero)
      if (delta !== 0) {
        await createPerspectiveNotification(
          comment.commentorId,
          post.id,
          post.title,
          user.uid,
          user.displayName || "Anonymous",
          delta,
          comment.id
        );
      }

      // 3. Show a temporary save status feedback
      const feedbackText = delta > 0 ? `+${delta} Shift!` : `${delta} Shift!`;
      setRatingFeedback((prev) => ({ ...prev, [comment.id]: feedbackText }));
      setTimeout(() => {
        setRatingFeedback((prev) => {
          const copy = { ...prev };
          delete copy[comment.id];
          return copy;
        });
      }, 2500);

    } catch (error) {
      console.error("Error saving perspective rating:", error);
      Alert.alert("Error", "Failed to save rating.");
    }
  };

  const getMoodColor = (mood) => {
    if (mood < 0) return "#7986CB"; // Sad
    if (mood > 0) return "#FFB74D"; // Happy
    return "#9E9E9E"; // Neutral
  };

  const getCategoryColors = (category, isDark) => {
    const normalized = category === "Anxiety" ? "Stress" : (category === "Mindfulness" ? "Mental Health" : category);
    const colors = {
      "Family": { bg: isDark ? "#174EA6" : "#E8F0FE", text: isDark ? "#8AB4F8" : "#1A73E8" },
      "Stress": { bg: isDark ? "#C5221F" : "#FCE8E6", text: isDark ? "#F28B82" : "#D93025" },
      "Relationship": { bg: isDark ? "#880E4F" : "#FCE4EC", text: isDark ? "#F8BBD0" : "#C2185B" },
      "Study": { bg: isDark ? "#137333" : "#E6F4EA", text: isDark ? "#81C995" : "#188038" },
      "Mental Health": { bg: isDark ? "#E37400" : "#FEF7E0", text: isDark ? "#FDD663" : "#B06000" },
      "Other": { bg: isDark ? "#3C4043" : "#F1F3F4", text: isDark ? "#E8EAED" : "#3C4043" },
    };
    return colors[normalized] || colors["Other"];
  };

  const getCategoryLabel = (category) => {
    const labels = {
      Study: "STUDY SUPPORT",
      "Mental Health": "MENTAL HEALTH",
      Mindfulness: "MINDFULNESS",
    };
    return labels[category] || (category ? category.toUpperCase() : "OTHER");
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "Just now";

    if (typeof timestamp === 'string') {
      if (timestamp === 'Just now') return timestamp;
      const match = timestamp.match(/^(\d+)d ago$/);
      if (match) {
        const days = parseInt(match[1], 10);
        if (days >= 7) {
          const weeks = Math.floor(days / 7);
          const months = Math.floor(days / 30);
          const years = Math.floor(days / 365);
          if (days < 30) return `${weeks}w ago`;
          if (days < 365) return `${months}mon ago`;
          return `${years}yr ago`;
        }
      }
      const parsedDate = new Date(timestamp);
      if (isNaN(parsedDate.getTime())) {
        return timestamp;
      }
      timestamp = parsedDate;
    }

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

    if (isNaN(date.getTime())) return "Just now";

    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${diffWeeks}w ago`;
    if (diffDays < 365) return `${diffMonths}mon ago`;
    return `${diffYears}yr ago`;
  };

  // Calculate cumulative score: starting mood + sum of all comment deltas relative to starting mood
  const getPostCumulativeScore = (post) => {
    const comments = commentsByPost[post.id] || [];
    const initial = post.feelPercentage ?? 0;

    const sumAdjusted = comments.reduce((acc, c) => {
      const rating = c.perspectiveRating !== undefined ? c.perspectiveRating : initial;
      const delta = rating - initial;
      return acc + delta;
    }, 0);

    const cumulative = initial + sumAdjusted;
    // Clamp cumulative mood score between -100 and 100
    return Math.max(-100, Math.min(100, cumulative));
  };

  // Compile all comments across all posts for the Comments Tab
  const getAllComments = () => {
    const all = Object.values(commentsByPost).flat();
    return all.sort((a, b) => {
      const aTime = a.createdAt?.seconds 
        ? a.createdAt.seconds * 1000 
        : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const bTime = b.createdAt?.seconds 
        ? b.createdAt.seconds * 1000 
        : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return bTime - aTime;
    });
  };

  // Custom visualizer for mood shift
  const renderMoodShiftTrack = (post, isMini = false) => {
    const initial = post.feelPercentage ?? 0;
    const current = getPostCumulativeScore(post);
    
    // Normalize -100..100 to 0%..100%
    const initialPct = `${(initial + 100) / 2}%`;
    const currentPct = `${(current + 100) / 2}%`;
    
    const delta = current - initial;
    const isImprovement = delta >= 0;

    if (isMini) {
      return (
        <View style={styles.miniTrackContainer}>
          <View style={styles.miniTrackBar}>
            <View style={[styles.moodTrackLine, { backgroundColor: theme.isDark ? '#2A2A2F' : '#E5E7EB' }]} />
            <View style={[
              styles.moodTrackConnector, 
              { 
                left: delta >= 0 ? initialPct : currentPct, 
                width: `${Math.abs(delta) / 2}%`,
                backgroundColor: isImprovement ? '#66BB6A' : '#E57373'
              }
            ]} />
            <View style={[styles.miniMoodPoint, { left: initialPct, backgroundColor: '#7986CB' }]} />
            <View style={[styles.miniMoodPoint, { left: currentPct, backgroundColor: isImprovement ? '#4CAF50' : '#F44336' }]} />
          </View>
          <View style={styles.miniTrackLabels}>
            <Text style={[styles.miniTrackText, { color: theme.textSecondary }]}>Initial: {initial}</Text>
            <Text style={[styles.miniTrackText, { color: isImprovement ? '#66BB6A' : '#E57373', fontWeight: '700' }]}>
              Current: {current} ({delta >= 0 ? `+${delta}` : delta})
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.moodTrackContainer}>
        <View style={styles.moodTrackLabelRow}>
          <View style={styles.moodLabelGroup}>
            <Text style={[styles.moodTrackLabel, { color: theme.textSecondary }]}>Initial Mood</Text>
            <Text style={[styles.moodTrackVal, { color: getMoodColor(initial) }]}>
              {initial > 0 ? `+${initial}` : initial}
            </Text>
          </View>

          <View style={[styles.moodLabelGroup, { alignItems: 'flex-end' }]}>
            <Text style={[styles.moodTrackLabel, { color: theme.text }]}>Cumulative Mood</Text>
            <Text style={[styles.moodTrackVal, { color: getMoodColor(current), fontWeight: '800' }]}>
              {current > 0 ? `+${current}` : current}
            </Text>
          </View>
        </View>
        
        {/* Track Line */}
        <View style={[styles.moodTrackBar, { backgroundColor: theme.isDark ? '#2A2A2F' : '#E5E7EB' }]}>
          {/* Connector Line between Initial and Current */}
          <View style={[
            styles.moodTrackConnector, 
            { 
              left: delta >= 0 ? initialPct : currentPct, 
              width: `${Math.abs(delta) / 2}%`,
              backgroundColor: isImprovement ? '#66BB6A' : '#E57373'
            }
          ]} />
          
          {/* Initial Mood Point */}
          <View style={[styles.moodPoint, { left: initialPct, backgroundColor: '#7986CB' }]} />
          
          {/* Current Mood Point */}
          <View style={[styles.moodPoint, { left: currentPct, backgroundColor: isImprovement ? '#4CAF50' : '#F44336', transform: [{ scale: 1.3 }] }]} />
        </View>
        
        <View style={styles.moodTrackInfoRow}>
          <Ionicons name={isImprovement ? "trending-up" : "trending-down"} size={16} color={isImprovement ? '#66BB6A' : '#E57373'} />
          <Text style={[styles.moodShiftText, { color: isImprovement ? '#66BB6A' : '#E57373' }]}>
            {delta === 0 ? "No shift in perspective yet" : `Perspective shifted by ${delta > 0 ? '+' : ''}${delta} points`}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <Loading size="large" color="#9575cd" />
        </View>
      </SafeAreaView>
    );
  }

  const allCommentsList = getAllComments();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.background} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity 
          onPress={() => {
            if (selectedPost) {
              setSelectedPost(null);
            } else {
              router.back();
            }
          }} 
          style={[styles.backButton, { backgroundColor: theme.isDark ? '#1A1A1A' : '#F9FAFB' }]}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {selectedPost ? "Post Comments" : "My Center"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Segmented Tab Bar (Only visible when no post is selected) */}
      {!selectedPost && (
        <View style={[styles.tabBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === "posts" && [styles.activeTabItem, { borderBottomColor: "#9575cd" }]]}
            onPress={() => setActiveTab("posts")}
          >
            <Ionicons name="document-text-outline" size={18} color={activeTab === "posts" ? "#9575cd" : theme.textSecondary} />
            <Text style={[styles.tabText, { color: activeTab === "posts" ? "#9575cd" : theme.textSecondary }, activeTab === "posts" && styles.activeTabText]}>
              Posts
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === "comments" && [styles.activeTabItem, { borderBottomColor: "#9575cd" }]]}
            onPress={() => setActiveTab("comments")}
          >
            <Ionicons name="chatbubbles-outline" size={18} color={activeTab === "comments" ? "#9575cd" : theme.textSecondary} />
            <Text style={[styles.tabText, { color: activeTab === "comments" ? "#9575cd" : theme.textSecondary }, activeTab === "comments" && styles.activeTabText]}>
              Comments
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {selectedPost ? (
        // --- 1. SINGLE POST COMMENTS DETAIL VIEW ---
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.selectedPostContainer, { borderBottomColor: theme.divider }]}>
            <View style={styles.postHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.postTitleLarge, { color: getCategoryColors(selectedPost.category, theme.isDark).text }]}>
                  {selectedPost.title}
                </Text>
                <View style={{ flexDirection: 'row', marginTop: 4, alignItems: 'center', gap: 8 }}>
                  <View style={[styles.categoryBadge, { backgroundColor: getCategoryColors(selectedPost.category, theme.isDark).bg }]}>
                    <Text style={[styles.categoryText, { color: getCategoryColors(selectedPost.category, theme.isDark).text }]}>
                      {getCategoryLabel(selectedPost.category)}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11, color: theme.textTertiary }}>
                    {formatTimestamp(selectedPost.createdAt)}
                  </Text>
                </View>
              </View>
              <View style={[styles.moodBadge, { backgroundColor: getMoodColor(selectedPost.feelPercentage) + "22" }]}>
                <Text style={[styles.moodText, { color: getMoodColor(selectedPost.feelPercentage) }]}>
                  {selectedPost.feelPercentage > 0 ? `+${selectedPost.feelPercentage}` : selectedPost.feelPercentage}
                </Text>
              </View>
            </View>
            <Text style={[styles.postDescriptionLarge, { color: theme.textSecondary }]}>
              {selectedPost.description}
            </Text>

            {/* Mood Shift Track Visualizer */}
            {renderMoodShiftTrack(selectedPost)}
          </View>

          {/* Comments List for Selected Post */}
          <Text style={[styles.commentsSectionTitle, { color: theme.text }]}>
            Comments ({(commentsByPost[selectedPost.id] || []).length})
          </Text>

          {(commentsByPost[selectedPost.id] || []).length === 0 ? (
            <View style={styles.emptyCommentsBox}>
              <Text style={[styles.noCommentsText, { color: theme.textTertiary }]}>
                No comments received on this post yet.
              </Text>
            </View>
          ) : (
            (commentsByPost[selectedPost.id] || []).map((comment) => {
              const baselineVal = selectedPost.feelPercentage ?? 0;
              const currentVal = comment.perspectiveRating !== undefined ? comment.perspectiveRating : baselineVal;
              return (
                <TouchableOpacity 
                  key={comment.id} 
                  activeOpacity={0.9}
                  onPress={() => setExpandedCommentId(prev => prev === comment.id ? null : comment.id)}
                  style={styles.timelineCommentItem}
                >
                  <View style={styles.timelineLeftColumn}>
                    <Avatar seed={comment.commentorAvatar || comment.commentorName} size={32} />
                    <View style={[styles.timelineVerticalLine, { backgroundColor: theme.divider }]} />
                  </View>

                  <View style={styles.timelineRightColumn}>
                    <View style={styles.commentHeader}>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.commentorName, { color: theme.text }]}>
                          {comment.commentorName}
                        </Text>
                        <Text style={{ fontSize: 11, color: theme.textTertiary }}>
                          • {formatTimestamp(comment.createdAt)}
                        </Text>
                      </View>
                      {ratingFeedback[comment.id] && (
                        <View style={styles.savedBadge}>
                          <Text style={styles.savedBadgeText}>{ratingFeedback[comment.id]}</Text>
                        </View>
                      )}
                      <Ionicons 
                        name={expandedCommentId === comment.id ? "chevron-up" : "chevron-down"} 
                        size={18} 
                        color={theme.textTertiary} 
                      />
                    </View>

                    <Text style={[styles.commentText, { color: theme.textSecondary }]}>
                      {comment.text}
                    </Text>

                    {expandedCommentId === comment.id && (
                      <View style={styles.ratingSection}>
                        <View style={[styles.reflectionNote, { backgroundColor: theme.isDark ? '#2C2A3A' : '#F3E5F5', borderColor: theme.border }]}>
                          <Ionicons name="bulb-outline" size={16} color="#9575cd" style={{ marginRight: 6 }} />
                          <Text style={[styles.reflectionNoteText, { color: theme.textSecondary }]}>
                            How did this comment shift your perspective or state of mind? Adjust the slider below.
                          </Text>
                        </View>

                        <View style={styles.ratingLabelRow}>
                          <Text style={[styles.ratingLabel, { color: theme.textSecondary }]}>
                            Perspective:
                          </Text>
                          <Text style={[styles.ratingValue, { color: getMoodColor(currentVal) }]}>
                            {currentVal === 0
                              ? "Neutral (0)"
                              : currentVal < 0
                              ? `Negative (${currentVal})`
                              : `Positive (+${currentVal})`}
                          </Text>
                        </View>

                        <Slider
                          style={styles.slider}
                          minimumValue={-100}
                          maximumValue={100}
                          step={5}
                          value={currentVal}
                          onSlidingComplete={(val) => handleRatingChange(selectedPost, comment, val)}
                          minimumTrackTintColor="#7986CB"
                          maximumTrackTintColor="#FFB74D"
                          thumbTintColor="#9575cd"
                        />

                        <View style={styles.ticksRow}>
                          <Text style={[styles.tickText, { color: theme.textTertiary }]}>-100</Text>
                          <Text style={[styles.tickText, { color: theme.textTertiary }]}>0</Text>
                          <Text style={[styles.tickText, { color: theme.textTertiary }]}>+100</Text>
                        </View>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      ) : activeTab === "posts" ? (
        // --- 2. POSTS LIST TAB ---
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {posts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: theme.isDark ? '#222' : '#F5F5F5' }]}>
                <Ionicons name="document-text-outline" size={48} color="#9575cd" />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No Posts Yet</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                When you post your feelings, they will appear here. Select a post to rate support received.
              </Text>
            </View>
          ) : (
            posts.map((post) => {
              const commentsCount = (commentsByPost[post.id] || []).length;
              return (
                <TouchableOpacity
                  key={post.id}
                  style={[styles.postCard, { borderBottomColor: theme.divider }]}
                  onPress={() => setSelectedPost(post)}
                  activeOpacity={0.7}
                >
                  <View style={styles.postHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.postTitle, { color: getCategoryColors(post.category, theme.isDark).text }]} numberOfLines={1}>
                        {post.title}
                      </Text>
                      <View style={{ flexDirection: 'row', marginTop: 4, alignItems: 'center', gap: 8 }}>
                        <View style={[styles.categoryBadge, { backgroundColor: getCategoryColors(post.category, theme.isDark).bg }]}>
                          <Text style={[styles.categoryText, { color: getCategoryColors(post.category, theme.isDark).text }]}>
                            {getCategoryLabel(post.category)}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 11, color: theme.textTertiary }}>
                          {formatTimestamp(post.createdAt)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="chatbubbles-outline" size={16} color={theme.textTertiary} style={{ marginRight: 4 }} />
                      <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                        {commentsCount}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.postDescription, { color: theme.textSecondary }]} numberOfLines={2}>
                    {post.description}
                  </Text>

                  {/* MINI MOOD SHIFT TRACK */}
                  {renderMoodShiftTrack(post, true)}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      ) : (
        // --- 3. ALL COMMENTS LIST TAB ---
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {allCommentsList.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: theme.isDark ? '#222' : '#F5F5F5' }]}>
                <Ionicons name="chatbubbles-outline" size={48} color="#9575cd" />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No Comments Yet</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                You haven&apos;t received any comments on your posts yet.
              </Text>
            </View>
          ) : (
            allCommentsList.map((comment) => {
              const matchingPost = posts.find((p) => p.id === comment.postId);
              const baselineVal = matchingPost ? (matchingPost.feelPercentage ?? 0) : 0;
              const currentVal = comment.perspectiveRating !== undefined ? comment.perspectiveRating : baselineVal;
              return (
                <TouchableOpacity 
                  key={comment.id} 
                  activeOpacity={0.9}
                  onPress={() => setExpandedCommentId(prev => prev === comment.id ? null : comment.id)}
                  style={styles.timelineCommentItem}
                >
                  <View style={styles.timelineLeftColumn}>
                    <Avatar seed={comment.commentorAvatar || comment.commentorName} size={32} />
                    <View style={[styles.timelineVerticalLine, { backgroundColor: theme.divider }]} />
                  </View>

                  <View style={styles.timelineRightColumn}>
                    {/* Context note about which post this comment was sent to */}
                    <View style={[styles.postContextRow, { backgroundColor: theme.isDark ? '#1C1C1E' : '#F2F2F7', marginBottom: 8 }]}>
                      <Text style={[styles.postContextText, { color: theme.textSecondary }]} numberOfLines={1}>
                        On: <Text style={{ fontWeight: "700", color: theme.text }}>{comment.postTitle}</Text>
                      </Text>
                    </View>

                    <View style={styles.commentHeader}>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.commentorName, { color: theme.text }]}>
                          {comment.commentorName}
                        </Text>
                        <Text style={{ fontSize: 11, color: theme.textTertiary }}>
                          • {formatTimestamp(comment.createdAt)}
                        </Text>
                      </View>
                      {ratingFeedback[comment.id] && (
                        <View style={styles.savedBadge}>
                          <Text style={styles.savedBadgeText}>{ratingFeedback[comment.id]}</Text>
                        </View>
                      )}
                      <Ionicons 
                        name={expandedCommentId === comment.id ? "chevron-up" : "chevron-down"} 
                        size={18} 
                        color={theme.textTertiary} 
                      />
                    </View>

                    <Text style={[styles.commentText, { color: theme.textSecondary }]}>
                      {comment.text}
                    </Text>

                    {expandedCommentId === comment.id && (
                      <View style={styles.ratingSection}>
                        <View style={[styles.reflectionNote, { backgroundColor: theme.isDark ? '#2C2A3A' : '#F3E5F5', borderColor: theme.border }]}>
                          <Ionicons name="bulb-outline" size={16} color="#9575cd" style={{ marginRight: 6 }} />
                          <Text style={[styles.reflectionNoteText, { color: theme.textSecondary }]}>
                            How did this comment shift your perspective or state of mind? Adjust the slider below.
                          </Text>
                        </View>

                        <View style={styles.ratingLabelRow}>
                          <Text style={[styles.ratingLabel, { color: theme.textSecondary }]}>
                            Perspective:
                          </Text>
                          <Text style={[styles.ratingValue, { color: getMoodColor(currentVal) }]}>
                            {currentVal === 0
                              ? "Neutral (0)"
                              : currentVal < 0
                              ? `Negative (${currentVal})`
                              : `Positive (+${currentVal})`}
                          </Text>
                        </View>

                        <Slider
                          style={styles.slider}
                          minimumValue={-100}
                          maximumValue={100}
                          step={5}
                          value={currentVal}
                          onSlidingComplete={(val) => {
                            const postObj = matchingPost || { id: comment.postId, title: comment.postTitle, feelPercentage: 0 };
                            handleRatingChange(postObj, comment, val);
                          }}
                          minimumTrackTintColor="#7986CB"
                          maximumTrackTintColor="#FFB74D"
                          thumbTintColor="#9575cd"
                        />

                        <View style={styles.ticksRow}>
                          <Text style={[styles.tickText, { color: theme.textTertiary }]}>-100</Text>
                          <Text style={[styles.tickText, { color: theme.textTertiary }]}>0</Text>
                          <Text style={[styles.tickText, { color: theme.textTertiary }]}>+100</Text>
                        </View>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    height: 48,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTabItem: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  activeTabText: {
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 0,
    paddingTop: 16,
    paddingBottom: 40,
  },
  selectedPostContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  postTitleLarge: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  postCategory: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  moodBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  moodText: {
    fontSize: 13,
    fontWeight: "800",
  },
  postDescriptionLarge: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  postDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  commentsSectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 12,
    letterSpacing: -0.2,
    paddingHorizontal: 16,
  },
  emptyCommentsBox: {
    paddingVertical: 20,
    alignItems: "center",
  },
  noCommentsText: {
    fontSize: 13,
    fontStyle: "italic",
    paddingVertical: 8,
  },
  commentItem: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  commentorName: {
    fontSize: 13,
    fontWeight: "700",
  },
  savedBadge: {
    backgroundColor: "#66BB6A",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  savedBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  commentText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  ratingSection: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.03)",
  },
  ratingLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  ratingLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  ratingValue: {
    fontSize: 12,
    fontWeight: "700",
  },
  slider: {
    width: "100%",
    height: 30,
    ...Platform.select({
      web: {
        outlineStyle: "none",
      },
    }),
  },
  ticksRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginTop: -2,
  },
  tickText: {
    fontSize: 10,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  postCard: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  timelineCommentItem: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  timelineLeftColumn: {
    alignItems: 'center',
    marginRight: 14,
    width: 36,
  },
  timelineVerticalLine: {
    width: 2,
    flex: 1,
    marginTop: 8,
    alignSelf: 'center',
    borderRadius: 1,
  },
  timelineRightColumn: {
    flex: 1,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    fontSize: 12,
    fontWeight: "700",
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  categoryText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  postContextRow: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  postContextText: {
    fontSize: 11,
    fontWeight: "500",
  },
  
  // Custom Visualizer Styles
  moodTrackContainer: {
    marginTop: 8,
  },
  moodTrackLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  moodLabelGroup: {
    flexDirection: 'column',
  },
  moodTrackLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  moodTrackVal: {
    fontSize: 15,
    fontWeight: '700',
  },
  moodTrackBar: {
    height: 6,
    borderRadius: 3,
    position: 'relative',
    marginVertical: 12,
  },
  moodTrackConnector: {
    height: 6,
    borderRadius: 3,
    position: 'absolute',
  },
  moodPoint: {
    width: 12,
    height: 12,
    borderRadius: 6,
    position: 'absolute',
    top: -3,
    marginLeft: -6,
  },
  moodTrackInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  moodShiftText: {
    fontSize: 12,
    fontWeight: '700',
  },
  
  // Mini Track Styles
  miniTrackContainer: {
    marginTop: 8,
  },
  miniTrackBar: {
    height: 4,
    position: 'relative',
    marginVertical: 8,
  },
  moodTrackLine: {
    height: 4,
    borderRadius: 2,
    width: '100%',
  },
  miniMoodPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    top: -2,
    marginLeft: -4,
  },
  miniTrackLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  miniTrackText: {
    fontSize: 11,
    fontWeight: '600',
  },
  reflectionNote: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  reflectionNoteText: {
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
    lineHeight: 16,
  },
});
