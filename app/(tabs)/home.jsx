import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PostCard from "../../components/PostCard";
import { db } from "../../config/firebase";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { posts as dummyPosts } from "../../data/dummyData";

const getCategoryColor = (category) => {
  const colors = {
    "All Feed": "#000000",
    "Stress": "#B39DDB",
    "Anxiety": "#7C6BA8",
    "Self-Care": "#FFE082",
    "Mental Health": "#FFE082",
    "Mindfulness": "#B2DFDB",
    "Study": "#B2DFDB",
    "Relationship": "#F48FB1",
    "Family": "#FFCDD2",
  };
  return colors[category] || "#B39DDB";
};

export default function Home() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState("All Feed");
  const [searchQuery, setSearchQuery] = useState("");
  const [firebasePosts, setFirebasePosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  const categories = [
    "All Feed",
    "Stress",
    "Family",
    "Mental Health",
    "Study",
    "Relationship",
    "Other"
  ];

  // Fetch posts from Firebase in real-time
  useEffect(() => {
    const postsRef = collection(db, "posts");
    const q = query(postsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedPosts = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title,
            description: data.description,
            category: data.category,
            timestamp: data.createdAt
              ? getTimeAgo(data.createdAt)
              : "Just now",
            reactions: data.reactions || { support: 0, hug: 0 },
            reactionCount: data.reactionCount || 0,
            comments: data.comments || [],
            isAnonymous: data.isAnonymous,
            authorName: data.authorName || "Anonymous",
            authorId: data.authorId,
          };
        });
        setFirebasePosts(fetchedPosts);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching posts:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // Fetch Unread Notifications Count
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "notifications"),
      where("toUserId", "==", user.uid),
      where("read", "==", false),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allowedTypes = ["like", "hug", "metoo", "comment", "follow", "friend_request", "friend_request_accepted"];
      const filteredCount = snapshot.docs.filter(doc => allowedTypes.includes(doc.data().type)).length;
      setUnreadCount(filteredCount);
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch Unread Chats Count for Chat icon badge (optional, but good for UX)
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  useEffect(() => {
    if (!user) return;

    // Simple listener for chat unreads if we had a way (requires iterating all chats or a user field)
    // For now, leaving chat badge fetch out to keep it simple or we can re-use the logic from Tab Layout if we moved it
  }, [user]);

  // Fetch Unread Count
  useEffect(() => {
    if (!user) return;

    const chatsRef = collection(db, "chats");
    const q = query(chatsRef, where("participants", "array-contains", user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let totalUnread = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        totalUnread += (data[`unreadCount_${user.uid}`] || 0);
      });
      setUnreadCount(totalUnread);
    });

    return () => unsubscribe();
  }, [user]);

  // Helper function to calculate time ago
  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const postDate = new Date(timestamp);
    const diffInMs = now - postDate;
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${diffInDays}d ago`;
  };

  // Combine Firebase posts with dummy data
  const allPosts = [...firebasePosts, ...dummyPosts];

  const filteredPosts = allPosts.filter((post) => {
    // Filter by category
    const matchesCategory =
      selectedCategory === "All Feed" ||
      post.category.toLowerCase().includes(selectedCategory.toLowerCase());

    // Filter by search query
    const matchesSearch =
      searchQuery.trim() === "" ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.category.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      <FlatList
        data={[
          { id: 'header' }, // Just header now, no search
          { id: 'sticky-categories' },
          ...filteredPosts
        ]}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => {
          if (item.id === 'header') {
            return (
              <View style={[styles.header, { backgroundColor: theme.isDark ? '#000000' : theme.surface, borderBottomColor: theme.divider, borderBottomWidth: theme.isDark ? 0 : 1 }]}>
                <View style={styles.headerLeft}>
                  <TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.isDark ? '#2A2A2A' : '#FAFAFA' }]}>
                    <Ionicons name="menu-outline" size={24} color={theme.isDark ? '#FFFFFF' : theme.text} />
                  </TouchableOpacity>
                </View>

                <View style={styles.logoContainerCenter}>
                  <Text style={[styles.logo, { color: theme.isDark ? '#FFFFFF' : theme.text }]}>Let It Out</Text>
                </View>

                <View style={styles.headerRight}>
                  <TouchableOpacity
                    style={[styles.iconButton, { backgroundColor: theme.isDark ? '#2A2A2A' : '#FAFAFA' }]}
                    onPress={() => router.push("/notifications")}
                  >
                    <View style={styles.notificationIconContainer}>
                      <Ionicons
                        name="notifications-outline"
                        size={24}
                        color={theme.isDark ? '#FFFFFF' : theme.text}
                      />
                      {unreadCount > 0 && (
                        <View style={styles.badge} />
                      )}
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }
          if (item.id === 'sticky-categories') {
            return (
              <View style={[styles.stickyContainer, { backgroundColor: theme.isDark ? '#000000' : theme.surface, borderBottomColor: theme.divider }]}>
                {isSearchExpanded ? (
                  <View style={styles.expandedWrapper}>
                    <View style={[styles.expandedSearchBar, { backgroundColor: theme.isDark ? '#2A2A2A' : theme.input, borderColor: theme.inputBorder }]}>
                      <Ionicons name="search" size={20} color={theme.isDark ? '#FFFFFF' : theme.text} />
                      <TextInput
                        style={[styles.expandedSearchInput, { color: theme.isDark ? '#FFFFFF' : theme.text }]}
                        placeholder="Search..."
                        placeholderTextColor={theme.placeholder}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoFocus
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        setSearchQuery("");
                        setIsSearchExpanded(false);
                      }}
                    >
                      <Text style={[styles.cancelText, { color: theme.isDark ? '#FFFFFF' : theme.text }]}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.categoriesRow}>
                    <TouchableOpacity
                      style={[styles.searchIconButton, { backgroundColor: theme.isDark ? '#2A2A2A' : '#F5F5F5' }]}
                      onPress={() => setIsSearchExpanded(true)}
                    >
                      <Ionicons name="search" size={20} color={theme.isDark ? '#FFFFFF' : '#212121'} />
                    </TouchableOpacity>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.categoriesContent}
                    >
                      {categories.map((category) => (
                        <TouchableOpacity
                          key={category}
                          style={[
                            styles.categoryChip,
                            { backgroundColor: theme.isDark ? '#2A2A2A' : '#F5F5F5' },
                            selectedCategory === category && {
                              backgroundColor: getCategoryColor(category),
                              borderColor: getCategoryColor(category),
                              shadowColor: getCategoryColor(category),
                              shadowOpacity: 0.3,
                            },
                          ]}
                          onPress={() => setSelectedCategory(category)}
                        >
                          <Text
                            style={[
                              styles.categoryText,
                              { color: theme.isDark ? '#AAAAAA' : '#757575' },
                              selectedCategory === category &&
                              styles.categoryTextActive,
                            ]}
                          >
                            {category}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            );
          }
          return <PostCard post={item} />;
        }}
        contentContainerStyle={styles.feedContent}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]} // Make only the categories (index 1) sticky
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color={theme.isDark ? '#B39DDB' : '#9575cd'} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Loading posts...</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="document-text-outline"
                size={64}
                color={theme.textTertiary}
              />
              <Text style={[styles.emptyText, { color: theme.text }]}>No posts yet</Text>
              <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                Be the first to share your thoughts!
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 0,
    paddingVertical: 12,
    position: 'relative',
  },
  headerLeft: {
    width: 56,
    alignItems: 'flex-start',
  },
  headerRight: {
    width: 56,
    alignItems: 'flex-end',
  },
  logoContainerCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: 24,
    fontWeight: "700",
    color: "#212121",
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
  },
  notificationIconContainer: {
    position: 'relative',
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 2,
    backgroundColor: '#FF5252',
    borderRadius: 4,
    width: 8,
    height: 8,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    // Premium Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#FAFAFA",
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#212121",
    fontWeight: "500",
  },
  stickyContainer: {
    paddingVertical: 8,
  },
  categoriesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 40, // Enforce fixed height
  },
  searchIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  expandedSearchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  expandedSearchInput: {
    flex: 1,
    fontSize: 15,
    color: "#212121",
    fontWeight: "500",
    padding: 0,
    height: '100%',
  },
  cancelButton: {
    paddingHorizontal: 4,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#212121",
  },
  categoriesContainer: {
    backgroundColor: "transparent",
  },
  categoriesContent: {
    paddingRight: 16,
    gap: 10,
    alignItems: 'center', // Center vertically
  },
  categoryChip: {
    paddingHorizontal: 20,
    height: 40,
    justifyContent: 'center',
    borderRadius: 20,
  },
  categoryChipActive: {
    backgroundColor: "#9F8BFF", // Re-add active style helper if lost?
    // No, logic is inline. But style name exists?
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#757575",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  categoryTextActive: {
    color: "#FFFFFF",
  },
  feedContent: {
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
});
