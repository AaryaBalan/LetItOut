import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { collection, deleteDoc, doc, onSnapshot, query, where } from "firebase/firestore";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../config/firebase";
import { useAuth } from "../../context/AuthContext";

export default function Profile() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [userPosts, setUserPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  // Fetch user's posts from Firebase
  useEffect(() => {
    if (!user) {
      setLoadingPosts(false);
      return;
    }

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
            category: data.category,
            description: data.description,
            createdAt: data.createdAt,
            reactions: data.reactions || { support: 0, hug: 0 },
            commentCount: data.commentCount || 0,
          };
        });
        setUserPosts(fetchedPosts);
        setLoadingPosts(false);
      },
      (error) => {
        console.error("Error fetching user posts:", error);
        setLoadingPosts(false);
      },
    );

    return () => unsubscribe();
  }, [user]);

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return "Just now";
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

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          const result = await logout();
          if (result.success) {
            router.replace("/");
          } else {
            Alert.alert("Error", "Failed to logout");
          }
        },
      },
    ]);
  };

  const handlePrivacySettings = () => {
    Alert.alert(
      "Privacy Settings",
      "Privacy settings will be implemented soon",
    );
  };

  const handleDeactivateAccount = () => {
    Alert.alert(
      "Deactivate Account",
      "Are you sure you want to deactivate your account? This action can be reversed by logging in again.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Deactivate", style: "destructive" },
      ],
    );
  };

  const formatJoinDate = (timestamp) => {
    if (!timestamp) return "October 2023";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
  };

  const formatMemberSince = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // If user is not logged in, show login prompt
  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />
        <View style={styles.notLoggedInContainer}>
          <Ionicons
            name="person-circle-outline"
            size={80}
            color="#BDBDBD"
          />
          <Text style={styles.notLoggedInTitle}>Not Logged In</Text>
          <Text style={styles.notLoggedInText}>
            Please log in to view your profile
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push("/auth/login")}
          >
            <Text style={styles.loginButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const joinDate = user.metadata?.creationTime
    ? formatJoinDate(user.metadata.creationTime)
    : user.createdAt
      ? formatJoinDate(user.createdAt)
      : "October 2023";

  const memberSince = user.metadata?.creationTime
    ? formatMemberSince(user.metadata.creationTime)
    : user.createdAt
      ? formatMemberSince(user.createdAt)
      : "N/A";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Profile</Text>
        <TouchableOpacity style={styles.settingsButton}>
          <Ionicons name="settings" size={24} color="#212121" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="happy" size={40} color="#9575cd" />
            </View>
          </View>

          <Text style={styles.username}>
            {user.displayName || "Anonymous User"}
          </Text>
          <Text style={styles.joinDate}>Joined {joinDate}</Text>

          {/* Additional Info */}
          <View style={styles.infoSection}>
            <View style={styles.infoItem}>
              <Ionicons name="mail-outline" size={16} color="#757575" />
              <Text style={styles.infoText}>{user.email}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons
                name="person-outline"
                size={16}
                color="#757575"
              />
              <Text style={styles.infoText}>
                {user.displayName || "Anonymous"}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons
                name="calendar-outline"
                size={16}
                color="#757575"
              />
              <Text style={styles.infoText}>
                Member since {memberSince}
              </Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>32</Text>
              <Text style={styles.statLabel}>HUGS SENT</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{userPosts.length}</Text>
              <Text style={styles.statLabel}>STORIES SHARED</Text>
            </View>
          </View>
        </View>

        {/* My Stories Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Stories</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>VIEW ALL</Text>
            </TouchableOpacity>
          </View>

          {loadingPosts ? (
            <View style={styles.storyCard}>
              <Text style={styles.storyText}>Loading your posts...</Text>
            </View>
          ) : userPosts.length > 0 ? (
            userPosts.slice(0, 3).map((post) => (
              <TouchableOpacity
                key={post.id}
                style={styles.storyCard}
                onPress={() => router.push(`/post/${post.id}`)}
              >
                <Text style={styles.storyCategory}>{post.category.toUpperCase()}</Text>
                <Text style={styles.storyTime}>{getTimeAgo(post.createdAt)}</Text>
                <Text style={styles.storyText} numberOfLines={2}>
                  {post.title}
                </Text>
                <View style={styles.storyFooter}>
                  <Ionicons
                    name="hand-left-outline"
                    size={16}
                    color="#9E9E9E"
                  />
                  <Text style={styles.storyHugs}>
                    {post.reactions.hug + post.reactions.support} hugs received
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.storyCard}>
              <Text style={styles.storyText}>No posts yet. Share your first thought!</Text>
            </View>
          )}
        </View>

        {/* Supportive History Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Supportive History</Text>
            <TouchableOpacity>
              <Text style={styles.recentText}>RECENT</Text>
            </TouchableOpacity>
          </View>

          {/* Reply Card */}
          <View style={styles.historyCard}>
            <Text style={styles.historyTag}>REPLIED TO ANONYMOUS</Text>
            <Text style={styles.historyTime}>1h ago</Text>
            <Text style={styles.historyText}>
              "I went through this exact same thing last semester. Please
              remember..."
            </Text>
          </View>

          {/* Hug Card */}
          <View style={styles.historyCard}>
            <Text style={styles.historyTag}>SENT A HUG</Text>
            <Text style={styles.historyTime}>3h ago</Text>
            <Text style={styles.historyText}>
              You supported a post in{" "}
              <Text style={styles.boldText}>Career Growth</Text>
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.privacyButton}
            onPress={handlePrivacySettings}
          >
            <Ionicons name="lock-closed" size={20} color="#FFFFFF" />
            <Text style={styles.privacyButtonText}>Privacy Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color="#212121" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deactivateButton}
            onPress={handleDeactivateAccount}
          >
            <Text style={styles.deactivateButtonText}>
              DEACTIVATE ACCOUNT
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
    backgroundColor: "#F5F5F5",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#212121",
  },
  settingsButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E1BEE7",
    justifyContent: "center",
    alignItems: "center",
  },
  username: {
    fontSize: 24,
    fontWeight: "700",
    color: "#212121",
    marginBottom: 4,
  },
  joinDate: {
    fontSize: 14,
    color: "#9E9E9E",
    marginBottom: 20,
  },
  infoSection: {
    width: "100%",
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#616161",
    flex: 1,
  },
  statsContainer: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 32,
    fontWeight: "700",
    color: "#9575cd",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9E9E9E",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#212121",
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9575cd",
    letterSpacing: 0.5,
  },
  recentText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9E9E9E",
    letterSpacing: 0.5,
  },
  storyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
  },
  storyCategory: {
    fontSize: 11,
    fontWeight: "700",
    color: "#B39DDB",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  storyTime: {
    position: "absolute",
    top: 16,
    right: 16,
    fontSize: 12,
    color: "#BDBDBD",
  },
  storyText: {
    fontSize: 15,
    color: "#424242",
    lineHeight: 22,
    marginBottom: 12,
  },
  storyFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  storyHugs: {
    fontSize: 13,
    color: "#9E9E9E",
  },
  historyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  historyTag: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFB74D",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  historyTime: {
    position: "absolute",
    top: 16,
    right: 16,
    fontSize: 12,
    color: "#BDBDBD",
  },
  historyText: {
    fontSize: 14,
    color: "#616161",
    lineHeight: 20,
    fontStyle: "italic",
  },
  boldText: {
    fontWeight: "700",
    fontStyle: "normal",
    color: "#212121",
  },
  actionButtons: {
    marginTop: 8,
    gap: 12,
  },
  privacyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#9575cd",
    paddingVertical: 16,
    borderRadius: 24,
    gap: 8,
    shadowColor: "#9575cd",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  privacyButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFD54F",
    paddingVertical: 16,
    borderRadius: 24,
    gap: 8,
    shadowColor: "#FFD54F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#212121",
  },
  deactivateButton: {
    paddingVertical: 16,
    alignItems: "center",
  },
  deactivateButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#BDBDBD",
    letterSpacing: 0.5,
  },
  notLoggedInContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  notLoggedInTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#212121",
    marginTop: 16,
    marginBottom: 8,
  },
  notLoggedInText: {
    fontSize: 15,
    color: "#757575",
    textAlign: "center",
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: "#9575cd",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
