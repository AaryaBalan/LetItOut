import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import { addDoc, collection, doc, increment, serverTimestamp, updateDoc } from "firebase/firestore";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
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
import { categories } from "../../data/dummyData";

export default function CreatePost() {
  const router = useRouter();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [helpNeeded, setHelpNeeded] = useState(false);
  const [moodLevel, setMoodLevel] = useState(50);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const characterCount = description.length;
  const maxCharacters = 1000;

  const handleSubmit = async () => {
    if (!title.trim() || !category || !description.trim()) {
      Alert.alert("Missing Information", "Please fill in all fields.");
      return;
    }

    if (!user) {
      Alert.alert("Not Logged In", "Please log in to create a post.");
      router.push("/auth/login");
      return;
    }

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
        feelPercentage: moodLevel,
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
      setMoodLevel(50);
    } catch (error) {
      console.error("Error creating post:", error);
      Alert.alert(
        "Error",
        "Failed to share your thought. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.cancelButton}
        >
          <Ionicons name="close" size={28} color="#757575" />
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Post</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Main Title */}
          <Text style={styles.mainTitle}>
            Release what's on your mind.
          </Text>
          <Text style={styles.subtitle}>
            Everything you share is completely anonymous and kept safe
            within our community.
          </Text>

          {/* Form Card */}
          <View style={styles.formCard}>
            {/* Title Field */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>TITLE</Text>
              <TextInput
                style={styles.input}
                placeholder="Give it a name..."
                placeholderTextColor="#BDBDBD"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Category Picker */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>CATEGORY</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={category}
                  onValueChange={(itemValue) => setCategory(itemValue)}
                  style={styles.picker}
                >
                  <Picker.Item
                    label="Select a topic"
                    value=""
                    color="#BDBDBD"
                  />
                  {categories.map((cat) => (
                    <Picker.Item key={cat} label={cat} value={cat} />
                  ))}
                </Picker>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color="#9575cd"
                  style={styles.pickerIcon}
                />
              </View>
            </View>

            {/* Story TextArea */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>YOUR STORY</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="What's happening? Be as detailed as you like..."
                placeholderTextColor="#BDBDBD"
                multiline
                numberOfLines={8}
                value={description}
                onChangeText={setDescription}
                maxLength={maxCharacters}
              />
              <Text style={styles.characterCount}>
                {characterCount} / {maxCharacters}
              </Text>
            </View>

            {/* Anonymous Toggle */}
            <View style={styles.toggleContainer}>
              <View style={styles.toggleLeft}>
                <Text style={styles.toggleTitle}>Post Anonymously</Text>
                <Text style={styles.toggleSubtitle}>
                  Identity stays private
                </Text>
              </View>
              <Switch
                value={isAnonymous}
                onValueChange={setIsAnonymous}
                trackColor={{ false: "#E0E0E0", true: "#B39DDB" }}
                thumbColor={isAnonymous ? "#9575cd" : "#F5F5F5"}
                ios_backgroundColor="#E0E0E0"
              />
            </View>

            {/* Mood Slider */}
            <View style={styles.moodContainer}>
              <Text style={styles.label}>HOW ARE YOU FEELING?</Text>
              <View style={styles.moodLabels}>
                <View style={styles.moodLabelLeft}>
                  <Ionicons name="sad" size={20} color="#7986CB" />
                  <Text style={styles.moodLabelText}>Depression</Text>
                </View>
                <Text style={styles.moodPercentage}>{moodLevel}%</Text>
                <View style={styles.moodLabelRight}>
                  <Text style={styles.moodLabelText}>Happiness</Text>
                  <Ionicons name="happy" size={20} color="#FFB74D" />
                </View>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={100}
                step={1}
                value={moodLevel}
                onValueChange={setMoodLevel}
                minimumTrackTintColor="#7986CB"
                maximumTrackTintColor="#FFB74D"
                thumbTintColor="#9575cd"
              />
              <Text style={styles.moodHint}>
                Swipe to indicate your current mood
              </Text>
            </View>

            {/* Help Needed Toggle */}
            <View style={styles.toggleContainer}>
              <View style={styles.toggleLeft}>
                <Text style={styles.toggleTitle}>Help Needed</Text>
                <Text style={styles.toggleSubtitle}>
                  Looking for support and advice
                </Text>
              </View>
              <Switch
                value={helpNeeded}
                onValueChange={setHelpNeeded}
                trackColor={{ false: "#E0E0E0", true: "#FFB74D" }}
                thumbColor={helpNeeded ? "#FF9800" : "#F5F5F5"}
                ios_backgroundColor="#E0E0E0"
              />
            </View>

            {/* Info Message */}
            <View style={styles.infoContainer}>
              <Ionicons
                name="information-circle"
                size={20}
                color="#9575cd"
              />
              <Text style={styles.infoText}>
                Your thoughts help build a supportive community.
                Remember to be kind.
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              style={[
                styles.submitButton,
                isSubmitting && styles.submitButtonDisabled,
              ]}
              disabled={isSubmitting}
            >
              <Ionicons name="send" size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>
                {isSubmitting ? "Sharing..." : "Share Thought"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cancelText: {
    fontSize: 16,
    color: "#757575",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#212121",
  },
  placeholder: {
    width: 80,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#212121",
    marginBottom: 6,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 13,
    color: "#9E9E9E",
    lineHeight: 18,
    marginBottom: 16,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  fieldContainer: {
    marginBottom: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9E9E9E",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#212121",
    borderWidth: 1,
    borderColor: "transparent",
  },
  pickerContainer: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: "transparent",
  },
  picker: {
    height: 50,
    color: "#212121",
  },
  pickerIcon: {
    position: "absolute",
    right: 16,
    top: 15,
    pointerEvents: "none",
  },
  textArea: {
    height: 120,
    textAlignVertical: "top",
    paddingTop: 10,
  },
  characterCount: {
    fontSize: 12,
    color: "#BDBDBD",
    textAlign: "right",
    marginTop: 4,
  },
  toggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    marginBottom: 10,
  },
  toggleLeft: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#212121",
    marginBottom: 2,
  },
  toggleSubtitle: {
    fontSize: 12,
    color: "#9E9E9E",
  },
  moodContainer: {
    marginBottom: 12,
    paddingVertical: 8,
  },
  moodLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  moodLabelLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  moodLabelRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  moodLabelText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#757575",
  },
  moodPercentage: {
    fontSize: 18,
    fontWeight: "700",
    color: "#9575cd",
  },
  slider: {
    width: "100%",
    height: 40,
  },
  moodHint: {
    fontSize: 12,
    color: "#BDBDBD",
    textAlign: "center",
    marginTop: 4,
  },
  infoContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F3E5F5",
    padding: 12,
    borderRadius: 10,
    gap: 10,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#7B1FA2",
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: "#9575cd",
    paddingVertical: 14,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#9575cd",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
});
