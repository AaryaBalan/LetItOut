import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { useRouter } from "expo-router";
import { addDoc, collection, doc, increment, serverTimestamp, updateDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../config/firebase";
import { useAuth } from "../../context/AuthContext";
import { useTabBar } from "../../context/TabBarContext";
import { useTheme } from "../../context/ThemeContext";
import { categories } from "../../data/dummyData";
import { showInterstitialAd } from "../ads/InterstitialAds";

const getCategoryTheme = (category, isDark) => {
  const themes = {
    "Family": { icon: "people", color: isDark ? "#8AB4F8" : "#1A73E8", bgColor: isDark ? "#174EA6" : "#E8F0FE" },
    "Stress": { icon: "leaf", color: isDark ? "#F28B82" : "#D93025", bgColor: isDark ? "#C5221F" : "#FCE8E6" },
    "Relationship": { icon: "heart", color: isDark ? "#F8BBD0" : "#C2185B", bgColor: isDark ? "#880E4F" : "#FCE4EC" },
    "Study": { icon: "book", color: isDark ? "#81C995" : "#188038", bgColor: isDark ? "#137333" : "#E6F4EA" },
    "Mental Health": { icon: "fitness", color: isDark ? "#FDD663" : "#B06000", bgColor: isDark ? "#E37400" : "#FEF7E0" },
    "Other": { icon: "ellipsis-horizontal", color: isDark ? "#E8EAED" : "#3C4043", bgColor: isDark ? "#3C4043" : "#F1F3F4" }
  };
  return themes[category] || themes["Other"];
};

export default function CreatePost() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { showTabBar } = useTabBar();

  // Ensure tab bar is shown when entering the Create screen
  useEffect(() => {
    showTabBar();
  }, [showTabBar]);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true); // Default to true for anonymous posting
  const [helpNeeded, setHelpNeeded] = useState(false);
  const [moodLevel, setMoodLevel] = useState(0); // Range: -100 to 100
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const submittingRef = useRef(false);

  // Handle help needed toggle with interstitial ad
  const handleHelpNeededToggle = (value) => {
    setHelpNeeded(value);

    // Show interstitial ad when help needed is turned ON
    if (value === true) {
      try {
        showInterstitialAd(() => {
          console.log('Interstitial ad closed');
        });
      } catch (error) {
        console.warn('Failed to show interstitial ad:', error);
      }
    }
  };

  const characterCount = description.length;
  const maxCharacters = 1000;
  const isFormValid = title.trim() !== "" && category !== "" && description.trim() !== "";

  const handleSubmit = async () => {
    if (submittingRef.current) return;

    if (!title.trim() || !category || !description.trim()) {
      Alert.alert("Missing Information", "Please fill in all fields.");
      return;
    }

    if (!user) {
      Alert.alert("Not Logged In", "Please log in to create a post.");
      router.push("/auth/login");
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      // Create post object with proper schema
      const postData = {
        title: title.trim(),
        category: category,
        description: description.trim(),
        authorName: isAnonymous
          ? "Anonymous"
          : user.displayName || "Anonymous",
        isAnonymous: isAnonymous,
        helpNeeded: helpNeeded,
        feelPercentage: moodLevel, // Stored as -100 to 100
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString(),
        reactionCount: 0,
      };

      // Add authorId only if not anonymous (Firestore doesn't accept undefined)
      if (!isAnonymous) {
        postData.authorId = user.uid;
      }

      // Add document to 'posts' collection
      const docRef = await addDoc(collection(db, "posts"), postData);

      console.log("Post created with ID:", docRef.id);

      // Increment postCount for non-anonymous posts
      if (!isAnonymous && user.uid) {
        await updateDoc(doc(db, "users", user.uid), {
          postCount: increment(1),
        });
      }

      Alert.alert(
        "Success!",
        "Your thought has been shared with the community. 💜",
        [
          {
            text: "View Feed",
            onPress: () => router.push("/(tabs)/home"),
          },
          { text: "OK", style: "cancel" },
        ],
      );

      // Reset form
      setTitle("");
      setDescription("");
      setCategory("");
      setIsAnonymous(true);
      setHelpNeeded(false);
      setMoodLevel(0);
    } catch (error) {
      console.error("Error creating post:", error);
      Alert.alert(
        "Error",
        "Failed to share your thought. Please try again.",
      );
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const toggleAnonymity = () => {
    setIsAnonymous(!isAnonymous);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.surface }]} edges={["top"]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.surface} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.cancelButton}
        >
          <Ionicons name="close" size={26} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Create</Text>
        <TouchableOpacity
          onPress={handleSubmit}
          style={[
            styles.postButton,
            { backgroundColor: isFormValid ? theme.primary : (theme.isDark ? "#2A2A2A" : "#F3F4F6") }
          ]}
          disabled={!isFormValid || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={[styles.postButtonText, { color: isFormValid ? "#FFFFFF" : theme.textTertiary }]}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Identity/Profile Picker (Reddit style) */}
          <View style={styles.identityRow}>
            <TouchableOpacity
              style={[
                styles.identityPill,
                { backgroundColor: theme.isDark ? "#2A2A2A" : "#F3F4F6", borderColor: theme.border }
              ]}
              onPress={toggleAnonymity}
            >
              <View style={styles.identityAvatar}>
                {isAnonymous ? (
                  <Image
                    source={require("../../assets/images/letitout_logo.png")}
                    style={{ width: 18, height: 18, borderRadius: 9 }}
                  />
                ) : (
                  <Ionicons name="person-circle" size={18} color={theme.primary} />
                )}
              </View>
              <Text style={[styles.identityText, { color: theme.text }]}>
                {isAnonymous ? "Anonymous" : user?.displayName || "Public"}
              </Text>
              <Ionicons name="chevron-down" size={14} color={theme.textSecondary} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>

          {/* Title Input */}
          <TextInput
            style={[styles.titleInput, { color: theme.text }]}
            placeholder="An interesting title"
            placeholderTextColor={theme.placeholder}
            value={title}
            onChangeText={setTitle}
            multiline
            maxLength={100}
          />

          {/* Category/Flair Selection badge */}
          <View style={styles.flairRow}>
            {category ? (
              <TouchableOpacity
                style={[
                  styles.flairPill,
                  {
                    backgroundColor: getCategoryTheme(category, theme.isDark).bgColor,
                    borderColor: getCategoryTheme(category, theme.isDark).color
                  }
                ]}
                onPress={() => setShowCategoryModal(true)}
              >
                <Ionicons
                  name={getCategoryTheme(category, theme.isDark).icon}
                  size={14}
                  color={getCategoryTheme(category, theme.isDark).color}
                />
                <Text style={[styles.flairText, { color: getCategoryTheme(category, theme.isDark).color }]}>
                  {category}
                </Text>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    setCategory("");
                  }}
                  style={styles.flairClose}
                >
                  <Ionicons name="close-circle" size={16} color={getCategoryTheme(category, theme.isDark).color} />
                </TouchableOpacity>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.addFlairPill,
                  { backgroundColor: theme.isDark ? "#2A2A2A" : "#F3F4F6", borderColor: theme.border }
                ]}
                onPress={() => setShowCategoryModal(true)}
              >
                <Ionicons name="add" size={16} color={theme.textSecondary} />
                <Text style={[styles.addFlairText, { color: theme.textSecondary }]}>Add category</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Body Input */}
          <TextInput
            style={[styles.bodyInput, { color: theme.text }]}
            placeholder="What's happening? Be as detailed as you like..."
            placeholderTextColor={theme.placeholder}
            multiline
            value={description}
            onChangeText={setDescription}
            maxLength={maxCharacters}
          />

          {/* Characters count */}
          <Text style={[styles.characterCount, { color: theme.textTertiary }]}>
            {characterCount} / {maxCharacters}
          </Text>

          {/* Bottom Card for Mood and Options */}
          <View style={[styles.bottomCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {/* Mood Slider Section */}
            <View style={styles.moodSection}>
              <View style={styles.moodHeader}>
                <Ionicons
                  name={moodLevel < 0 ? "sad-outline" : moodLevel > 0 ? "happy-outline" : "ellipse-outline"}
                  size={20}
                  color={moodLevel < 0 ? "#7986CB" : moodLevel > 0 ? "#FFB74D" : "#9E9E9E"}
                />
                <Text style={[styles.moodLabel, { color: theme.text }]}>How are you feeling?</Text>
                <Text style={[styles.moodValue, { color: moodLevel < 0 ? "#5C6BC0" : moodLevel > 0 ? "#FFA726" : theme.textSecondary }]}>
                  {moodLevel === 0 ? "Neutral (0)" : moodLevel < 0 ? `Sad (${moodLevel})` : `Happy (+${moodLevel})`}
                </Text>
              </View>

              <Slider
                style={styles.slider}
                minimumValue={-100}
                maximumValue={100}
                step={1}
                value={moodLevel}
                onValueChange={setMoodLevel}
                minimumTrackTintColor="#7986CB"
                maximumTrackTintColor="#FFB74D"
                thumbTintColor="#7C3AED"
              />

              <View style={styles.sliderTicks}>
                <Text style={styles.tickText}>Sad (-100)</Text>
                <Text style={styles.tickText}>Neutral (0)</Text>
                <Text style={styles.tickText}>Happy (+100)</Text>
              </View>
            </View>

            <View style={[styles.separator, { backgroundColor: theme.divider }]} />

            {/* Help Needed Toggle */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleTextContainer}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="hand-left-outline" size={20} color="#FFB74D" />
                  <Text style={[styles.toggleTitle, { color: theme.text }]}>Help Needed</Text>
                </View>
                <Text style={[styles.toggleSubtitle, { color: theme.textSecondary }]}>
                  Looking for support, advice, or validation
                </Text>
              </View>
              <Switch
                value={helpNeeded}
                onValueChange={handleHelpNeededToggle}
                trackColor={{ false: theme.isDark ? "#3E3E3E" : "#E5E7EB", true: "#FFB74D" }}
                thumbColor={helpNeeded ? "#FF9800" : "#F3F4F6"}
                ios_backgroundColor="#E5E7EB"
              />
            </View>

            {/* Info Message */}
            <View style={[styles.infoBox, { backgroundColor: theme.isDark ? "#2E2A3A" : "#F3E5F5" }]}>
              <Ionicons
                name="information-circle"
                size={18}
                color={theme.isDark ? "#B39DDB" : "#7B1FA2"}
              />
              <Text style={[styles.infoText, { color: theme.isDark ? "#D1C4E9" : "#7B1FA2" }]}>
                Posts are shared with the community. Please be kind and respectful.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category Selection Modal */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCategoryModal(false)}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.surface, borderTopColor: theme.border }
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalScroll}>
              {categories.map((cat) => {
                const details = getCategoryTheme(cat, theme.isDark);
                const isSelected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryOption,
                      {
                        backgroundColor: isSelected
                          ? details.bgColor
                          : (theme.isDark ? "#2A2A2A" : "#F9FAFB"),
                        borderColor: isSelected ? details.color : theme.border
                      }
                    ]}
                    onPress={() => {
                      setCategory(cat);
                      setShowCategoryModal(false);
                    }}
                  >
                    <Ionicons name={details.icon} size={18} color={details.color} />
                    <Text
                      style={[
                        styles.categoryOptionText,
                        {
                          color: isSelected ? details.color : theme.text,
                          fontWeight: isSelected ? "700" : "500"
                        }
                      ]}
                    >
                      {cat}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark"
                        size={16}
                        color={details.color}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cancelButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  postButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  postButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 100,
    flexGrow: 1,
  },
  identityRow: {
    marginHorizontal: 16,
    marginVertical: 6,
  },
  identityPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  identityAvatar: {
    marginRight: 6,
  },
  identityText: {
    fontSize: 12,
    fontWeight: "600",
  },
  titleInput: {
    fontSize: 22,
    fontWeight: "700",
    marginHorizontal: 16,
    marginVertical: 10,
    padding: 0,
  },
  flairRow: {
    marginHorizontal: 16,
    marginVertical: 4,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  flairPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 6,
  },
  flairText: {
    fontSize: 12,
    fontWeight: "600",
  },
  flairClose: {
    marginLeft: 2,
  },
  addFlairPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: "dashed",
    gap: 6,
  },
  addFlairText: {
    fontSize: 12,
    fontWeight: "600",
  },
  bodyInput: {
    fontSize: 16,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 20,
    flex: 1,
    minHeight: 180,
    textAlignVertical: "top",
    padding: 0,
  },
  characterCount: {
    marginHorizontal: 16,
    fontSize: 12,
    textAlign: "right",
    marginBottom: 16,
  },
  bottomCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    marginTop: 8,
    marginBottom: Platform.OS === "ios" ? 10 : 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  moodSection: {
    gap: 8,
  },
  moodHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  moodLabel: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  moodValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  slider: {
    width: "100%",
    height: 40,
  },
  sliderTicks: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  tickText: {
    fontSize: 10,
    color: "#9E9E9E",
  },
  separator: {
    height: 1,
    marginVertical: 14,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  toggleSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  modalScroll: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingBottom: 20,
  },
  categoryOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    flexGrow: 1,
    minWidth: "28%",
  },
  categoryOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryOptionText: {
    fontSize: 13,
  },
});
