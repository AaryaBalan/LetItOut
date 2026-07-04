import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { useRouter } from "expo-router";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MoodSelector, { MOOD_OPTIONS } from "../../components/MoodSelector";
import { db } from "../../config/firebase";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

const ACTIVITY_TAGS = [
  { id: "work", label: "Work", icon: "briefcase-outline" },
  { id: "study", label: "Study", icon: "book-outline" },
  { id: "exercise", label: "Exercise", icon: "barbell-outline" },
  { id: "social", label: "Social", icon: "people-outline" },
  { id: "family", label: "Family", icon: "home-outline" },
  { id: "health", label: "Health", icon: "medkit-outline" },
  { id: "love", label: "Love", icon: "heart-outline" },
  { id: "Grateful", label: "Grateful", icon: "leaf-outline" },
  { id: "Goals", label: "Goals", icon: "flag-outline" },
  { id: "Other", label: "Other", icon: "ellipsis-horizontal" },
];

export default function LogMood() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  const [selectedMood, setSelectedMood] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const toggleTag = (tagId) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  };

  const selectedMoodMeta = MOOD_OPTIONS.find((m) => m.id === selectedMood);

  const getMoodScore = (type) => {
    if (type === "amazing") return 10;
    if (type === "good") return 5;
    if (type === "okay") return 0;
    if (type === "bad") return -5;
    if (type === "awful") return -10;
    return 0;
  };

  const handleSave = async () => {
    if (!selectedMood || !user) return;
    if (!title.trim()) {
      Alert.alert("Missing Title", "Please enter a title for your journal entry.");
      return;
    }
    setSaving(true);

    try {
      await addDoc(collection(db, "moodEntries"), {
        userId: user.uid,
        moodType: selectedMood,
        moodScore: getMoodScore(selectedMood),
        title: title.trim(),
        note: note.trim() || null,
        tags: selectedTags,
        createdAt: new Date().toISOString(),
        timestamp: serverTimestamp(),
      });

      Alert.alert("Mood Logged! 🎉", "Your mood has been saved.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err) {
      console.error("Error saving mood:", err);
      Alert.alert("Error", "Failed to save mood. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: theme.background },
      ]}
      edges={["top"]}
    >
      <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Log Mood
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.bigTitle, { color: theme.text }]}>
            How are you feeling today?
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Your mood matters. Let's capture it.
          </Text>

          {/* ── Mood Selector ────────────────────── */}
          <Text style={[styles.label, { color: theme.text }]}>
            Select your mood
          </Text>
          <MoodSelector selected={selectedMood} onSelect={setSelectedMood} />


          {/* ── Activity Tags ────────────────────── */}
          <Text
            style={[styles.label, { color: theme.text, marginTop: 12 }]}
          >
            Add activities <Text style={{ fontFamily: "Fredoka-Regular", color: theme.textTertiary }}>(optional)</Text>
          </Text>
          <View style={styles.tagsWrap}>
            {ACTIVITY_TAGS.map((tag) => {
              const on = selectedTags.includes(tag.id);
              return (
                <TouchableOpacity
                  key={tag.id}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                    },
                    on && {
                      backgroundColor: theme.text,
                      borderColor: theme.text,
                    },
                  ]}
                  onPress={() => toggleTag(tag.id)}
                >
                  <Ionicons
                    name={tag.icon}
                    size={16}
                    color={on ? theme.background : theme.text}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      { color: on ? theme.background : theme.text },
                    ]}
                  >
                    {tag.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Title ─────────────────────────────── */}
          <Text
            style={[styles.label, { color: theme.text, marginTop: 24 }]}
          >
            Entry Title <Text style={{ color: "#FF6B6B" }}>*</Text>
          </Text>
          <View
            style={[
              styles.inputBox,
              {
                height: 56,
                paddingVertical: 0,
                justifyContent: "center",
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
          >
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Give your mood a title"
              placeholderTextColor={theme.placeholder}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* ── Note ─────────────────────────────── */}
          <Text
            style={[styles.label, { color: theme.text, marginTop: 24 }]}
          >
            Add a note <Text style={{ fontFamily: "Fredoka-Regular", color: theme.textTertiary }}>(optional)</Text>
          </Text>
          <View
            style={[
              styles.inputBox,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
          >
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="What's on your mind?"
              placeholderTextColor={theme.placeholder}
              multiline
              maxLength={200}
              value={note}
              onChangeText={setNote}
              textAlignVertical="top"
            />
            <Text style={[styles.counter, { color: theme.textTertiary }]}>
              {note.length}/200
            </Text>
          </View>

          <View style={{ height: 32 }} />

          {/* ── Save ─────────────────────────────── */}
          <TouchableOpacity
            style={[
              styles.saveBtn,
              {
                backgroundColor: selectedMood ? theme.text : theme.border,
              },
              !selectedMood && { elevation: 0, shadowOpacity: 0 },
            ]}
            disabled={!selectedMood || saving}
            onPress={handleSave}
          >
            {saving ? (
              <Text style={[styles.saveBtnText, { color: theme.background }]}>
                Saving...
              </Text>
            ) : (
              <Text
                style={[
                  styles.saveBtnText,
                  { color: selectedMood ? theme.background : theme.textSecondary },
                ]}
              >
                Save Mood
              </Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerTitle: { fontSize: 16, fontFamily: "Fredoka-Bold" },

  scroll: { paddingHorizontal: 20, paddingTop: 12 },
  bigTitle: {
    fontSize: 32,
    fontFamily: "Frederick",
    lineHeight: 40,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Fredoka-Regular",
    marginBottom: 32,
  },
  label: { fontSize: 14, fontFamily: "Fredoka-Bold", marginBottom: 16 },

  // Intensity
  intensityWrap: { marginTop: 24, marginBottom: 24 },
  intensityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  intensityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  intensityVal: { fontSize: 13, fontFamily: "Fredoka-Bold" },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  sliderTick: { fontSize: 11, fontFamily: "Fredoka-Regular" },

  // Tags
  tagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  chipText: { fontSize: 13, fontFamily: "Fredoka-Regular" },

  // Note
  inputBox: { borderWidth: 1, borderRadius: 20, padding: 16, height: 120 },
  input: { flex: 1, fontFamily: "Fredoka-Regular", fontSize: 15 },
  counter: {
    fontSize: 11,
    fontFamily: "Fredoka-Regular",
    textAlign: "right",
    marginTop: 8,
  },

  // Save
  saveBtn: {
    width: "100%",
    padding: 18,
    borderRadius: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: { fontSize: 16, fontFamily: "Fredoka-Bold" },
});
