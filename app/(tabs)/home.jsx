import { Ionicons } from "@expo/vector-icons";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  FlatList,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PostCard from "../../components/PostCard";
import { db } from "../../config/firebase";
import { posts as dummyPosts } from "../../data/dummyData";

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState("All Feed");
  const [searchQuery, setSearchQuery] = useState("");
  const [firebasePosts, setFirebasePosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const categories = ["All Feed", "Stress", "Anxiety", "Self-Care"];

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
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="menu" size={28} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.logo}>LetItOut</Text>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons
            name="notifications-outline"
            size={26}
            color="#212121"
          />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#BDBDBD" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search discussions..."
            placeholderTextColor="#BDBDBD"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Category Filter */}
      <View style={styles.categoriesContainer}>
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
                selectedCategory === category &&
                styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[
                  styles.categoryText,
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

      {/* Posts Feed */}
      <FlatList
        data={filteredPosts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <PostCard post={item} />}
        contentContainerStyle={styles.feedContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Loading posts...</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="document-text-outline"
                size={64}
                color="#BDBDBD"
              />
              <Text style={styles.emptyText}>No posts yet</Text>
              <Text style={styles.emptySubtext}>
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
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    fontSize: 22,
    fontWeight: "700",
    color: "#212121",
  },
  notificationButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#212121",
  },
  categoriesContainer: {
    backgroundColor: "#FFFFFF",
    paddingBottom: 16,
  },
  categoriesContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  categoryChipActive: {
    backgroundColor: "#B39DDB",
    borderColor: "#B39DDB",
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#757575",
  },
  categoryTextActive: {
    color: "#FFFFFF",
  },
  feedContent: {
    paddingTop: 0,
    paddingBottom: 20,
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
    color: "#757575",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#BDBDBD",
    marginTop: 8,
  },
});
