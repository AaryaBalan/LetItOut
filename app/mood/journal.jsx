import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import {
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../config/firebase";
import { MOOD_OPTIONS } from "../../components/MoodSelector";

const FILTERS = ["All", "Amazing", "Good", "Okay", "Bad", "Awful"];

const CATEGORIES = [
  { id: "work", label: "Work" },
  { id: "study", label: "Study" },
  { id: "exercise", label: "Exercise" },
  { id: "social", label: "Social" },
  { id: "family", label: "Family" },
  { id: "health", label: "Health" },
  { id: "love", label: "Love" },
  { id: "Grateful", label: "Grateful" },
  { id: "Goals", label: "Goals" },
  { id: "Other", label: "Other" },
];

export default function JournalScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState("All");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "moodEntries"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      // Only keep entries that have a title or note
      const allEntries = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const journalEntries = allEntries.filter(e => e.title || e.note);
      setEntries(journalEntries);
    });
    return unsub;
  }, [user]);

  const filteredEntries = entries.filter(e => {
    // 1. Filter by Mood
    let moodMatch = true;
    if (activeFilter !== "All") {
      moodMatch = e.moodType === activeFilter.toLowerCase();
    }

    // 2. Filter by Category
    let categoryMatch = true;
    if (selectedCategories.length > 0) {
      if (!e.tags || e.tags.length === 0) {
        categoryMatch = false;
      } else {
        categoryMatch = selectedCategories.some(cat => e.tags.includes(cat));
      }
    }

    return moodMatch && categoryMatch;
  });

  const toggleCategory = (catId) => {
    setSelectedCategories(prev => 
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  const getDoodleForMood = (moodType) => {
    switch (moodType) {
      case "amazing": return "heart-outline";
      case "good": return "star-outline";
      case "okay": return "cloudy-outline";
      case "bad": return "rainy-outline";
      case "awful": return "thunderstorm-outline";
      default: return "star-outline";
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top"]}
    >
      <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Journal</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            Write your thoughts.{"\n"}Reflect. Heal. Grow.
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={[styles.iconBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => setShowFilterModal(true)}
          >
            <View>
              <Ionicons name="options-outline" size={20} color={theme.text} />
              {selectedCategories.length > 0 && (
                <View style={styles.filterDot} />
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.iconBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => router.push("/mood/history")}
          >
            <Ionicons name="calendar-outline" size={20} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.iconBtn, { backgroundColor: "#8B7CFF", borderWidth: 0 }]}
            onPress={() => router.push("/mood/log")}
          >
            <Ionicons name="add" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterBtn,
                { backgroundColor: theme.card, borderColor: theme.border },
                activeFilter === f && { backgroundColor: theme.isDark ? "#2A2540" : "#F3EEFF", borderColor: "#8B7CFF" }
              ]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[
                styles.filterText,
                { color: activeFilter === f ? "#8B7CFF" : theme.textSecondary }
              ]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Journals List */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {filteredEntries.length === 0 ? (
          <View style={{ padding: 40, alignItems: "center" }}>
            <Ionicons name="journal-outline" size={48} color={theme.textTertiary} />
            <Text style={{ marginTop: 12, color: theme.textSecondary, fontFamily: "Fredoka-Regular" }}>
              No journal entries found.
            </Text>
          </View>
        ) : (
          filteredEntries.map((journal) => {
            const mood = MOOD_OPTIONS.find(m => m.id === journal.moodType) || MOOD_OPTIONS[2];
            const d = new Date(journal.createdAt);
            const dateStr = d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
            const timeStr = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

            return (
              <TouchableOpacity 
                key={journal.id} 
                style={[styles.card, { backgroundColor: mood.color + "1A" }]} // 10% opacity
                activeOpacity={0.8}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.moodOrb, { backgroundColor: mood.color }]}>
                    <MaterialCommunityIcons name={mood.icon} size={24} color="#FFF" />
                  </View>
                  <View style={styles.cardMeta}>
                    <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
                      {journal.title || "Untitled Entry"}
                    </Text>
                    <Text style={[styles.cardDate, { color: theme.textTertiary }]}>
                      {dateStr}  ·  {timeStr}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.moreBtn}>
                    <Ionicons name="ellipsis-vertical" size={20} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>

                {journal.note && (
                  <Text style={[styles.cardContent, { color: theme.textSecondary }]} numberOfLines={3}>
                    {journal.note}
                  </Text>
                )}

                <View style={styles.cardFooter}>
                  <View style={styles.tagsContainer}>
                    {journal.tags && journal.tags.map(tag => (
                      <View key={tag} style={[styles.tag, { backgroundColor: theme.isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.6)" }]}>
                        <Text style={[styles.tagText, { color: mood.color }]}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                  {/* Big decorative doodle */}
                  <Ionicons name={getDoodleForMood(journal.moodType)} size={48} color={mood.color} style={styles.bgDoodle} />
                </View>
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Category Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Filter by Category</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <View style={styles.tagsContainer}>
                {CATEGORIES.map(cat => {
                  const on = selectedCategories.includes(cat.id);
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.catChip,
                        { backgroundColor: theme.input },
                        on && { backgroundColor: "#8B7CFF" }
                      ]}
                      onPress={() => toggleCategory(cat.id)}
                    >
                      <Text style={[styles.catChipText, { color: on ? "#FFF" : theme.textSecondary }]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: theme.input }]}
                onPress={() => setSelectedCategories([])}
              >
                <Text style={[styles.modalBtnText, { color: theme.text }]}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: "#8B7CFF" }]}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={[styles.modalBtnText, { color: "#FFF" }]}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "flex-start",
    marginRight: 8,
    marginTop: 4,
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: "Frederick",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: "Fredoka-Regular",
    lineHeight: 20,
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  filtersWrapper: {
    marginBottom: 16,
  },
  filters: {
    paddingHorizontal: 20,
    gap: 10,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontFamily: "Fredoka-Bold",
  },
  scrollContent: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  card: {
    borderRadius: 24,
    padding: 15,
    marginBottom: 16,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  moodOrb: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cardMeta: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "Fredoka-Bold",
    marginBottom: 2,
  },
  cardDate: {
    fontSize: 12,
    fontFamily: "Fredoka-Regular",
  },
  moreBtn: {
    padding: 4,
  },
  cardContent: {
    fontSize: 14,
    fontFamily: "Fredoka-Regular",
    lineHeight: 20,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 11,
    fontFamily: "Fredoka-Bold",
  },
  bgDoodle: {
    position: "absolute",
    right: -10,
    bottom: -10,
    opacity: 0.8,
    transform: [{ rotate: "-15deg" }]
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Fredoka-Bold",
  },
  modalBody: {
    marginBottom: 32,
  },
  catChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  catChipText: {
    fontSize: 14,
    fontFamily: "Fredoka-Regular",
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    paddingBottom: 24,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  modalBtnText: {
    fontSize: 16,
    fontFamily: "Fredoka-Bold",
  },
  filterDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF6B6B",
  }
});
