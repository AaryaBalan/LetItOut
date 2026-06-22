import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Loading from "../../components/Loading";
import { MOOD_OPTIONS } from "../../components/MoodSelector";
import { db } from "../../config/firebase";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

const WEEKDAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function MoodHistory() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [viewMonth, setViewMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "moodEntries"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return unsub;
  }, [user]);

  // ─── Calendar grid ─────────────────────────────────────────
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayJS = new Date(year, month, 1).getDay(); // 0=Sun
  const firstDayMon = firstDayJS === 0 ? 6 : firstDayJS - 1; // 0=Mon

  const entryMap = {};
  entries.forEach((e) => {
    const d = new Date(e.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!entryMap[key]) entryMap[key] = e; // first entry of the day
  });

  const calendarCells = [];
  // blank cells before first day
  for (let i = 0; i < firstDayMon; i++) {
    calendarCells.push({ blank: true, key: `b${i}` });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${month}-${d}`;
    const entry = entryMap[key] || null;
    const isToday =
      new Date().toDateString() === new Date(year, month, d).toDateString();
    calendarCells.push({ blank: false, day: d, entry, isToday, key });
  }

  const getMoodMeta = (type) =>
    MOOD_OPTIONS.find((m) => m.id === type) || null;

  const prevMonth = () =>
    setViewMonth(new Date(year, month - 1, 1));
  const nextMonth = () =>
    setViewMonth(new Date(year, month + 1, 1));

  // Entries for current month, sorted newest first
  const monthEntries = entries.filter((e) => {
    const d = new Date(e.createdAt);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const displayedEntries = selectedDate 
    ? monthEntries.filter(e => {
        const d = new Date(e.createdAt);
        return d.getDate() === selectedDate;
      })
    : monthEntries;

  const getTimeAgo = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.isDark ? "#000" : "#FAFAFC", justifyContent: "center", alignItems: "center" }]}
        edges={["top"]}
      >
        <Loading size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top"]}
    >
      <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Mood History</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* ── Month Navigation ────────────────────── */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.monthLabel, { color: theme.text }]}>
            {MONTH_NAMES[month]} {year}
          </Text>
          <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={22} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* ── Calendar Heatmap ────────────────────── */}
        <View style={[styles.calendarCard, { backgroundColor: theme.isDark ? "#1A1A1A" : "#FFF", borderColor: theme.border }]}>
          {/* Weekday headers */}
          <View style={styles.weekRow}>
            {WEEKDAY_HEADERS.map((h) => (
              <View key={h} style={styles.calCell}>
                <Text style={[styles.weekLabel, { color: theme.orimary }]}>{h}</Text>
              </View>
            ))}
          </View>

          {/* Day cells */}
          <View style={styles.gridWrap}>
            {calendarCells.map((cell) => {
              if (cell.blank) {
                return <View key={cell.key} style={styles.calCell} />;
              }
              const mood = cell.entry ? getMoodMeta(cell.entry.moodType) : null;
              const isSelected = selectedDate === cell.day;
              return (
                <TouchableOpacity
                  key={cell.key}
                  style={[
                    styles.calCell,
                    styles.dayCell,
                    mood && { backgroundColor: mood.color + (isSelected ? "60" : "30") },
                    cell.isToday && { borderColor: "#8B7CFF" },
                    isSelected && !cell.isToday && { borderColor: mood ? mood.color : theme.border }
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setSelectedDate(isSelected ? null : cell.day)}
                >
                  <Text style={[styles.cellDay, { color: cell.isToday ? "#8B7CFF" : theme.textSecondary }]}>
                    {cell.day}
                  </Text>
                  {mood ? (
                    <MaterialCommunityIcons name={mood.icon} size={28} color={mood.color} style={{ marginTop: 2 }} />
                  ) : (
                    <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.primary, opacity: 0.3, marginTop: 4 }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Legend ──────────────────────────────── */}
        <View style={styles.legend}>
          {MOOD_OPTIONS.map((m) => (
            <View key={m.id} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: m.color }]} />
              <Text style={[styles.legendText, { color: theme.textSecondary }]}>{m.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Daily Entries ───────────────────────── */}
        <View style={styles.entriesHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>
            {selectedDate ? `Entries for ${MONTH_NAMES[month]} ${selectedDate}` : 'Daily Entries'}
          </Text>
          {selectedDate && (
            <TouchableOpacity onPress={() => setSelectedDate(null)}>
              <Text style={{ color: "#8B7CFF", fontFamily: "Fredoka-Bold" }}>Clear Filter</Text>
            </TouchableOpacity>
          )}
        </View>

        {displayedEntries.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.isDark ? "#1A1A1A" : "#FFF", borderColor: theme.border }]}>
            <Ionicons name="happy-outline" size={40} color={theme.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No entries this month yet</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push("/mood/log")}
            >
              <Text style={styles.emptyBtnText}>Log Your Mood</Text>
            </TouchableOpacity>
          </View>
        ) : (
          displayedEntries.map((entry) => {
            const mood = getMoodMeta(entry.moodType);
            const d = new Date(entry.createdAt);
            return (
              <View
                key={entry.id}
                style={[styles.entryCard, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <View style={styles.entryHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={[styles.entryOrb, { backgroundColor: mood?.color || "#E5E7EB" }]}>
                      {mood ? (
                        <MaterialCommunityIcons name={mood.icon} size={24} color="#FFFFFF" />
                      ) : (
                        <Ionicons name="ellipse-outline" size={22} color="#FFFFFF" />
                      )}
                    </View>
                    <View>
                      <Text style={[styles.entryMood, { color: theme.text }]}>
                        {mood?.label || "Unknown"}{" "}
                        <Text style={{ color: mood?.color }}>
                          ({entry.moodScore > 0 ? "+" : ""}{entry.moodScore})
                        </Text>
                      </Text>
                      <Text style={[styles.entryDate, { color: theme.textTertiary }]}>
                        {d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })} · {getTimeAgo(entry.createdAt)}
                      </Text>
                    </View>
                  </View>
                </View>

                {entry.note && (
                  <Text style={[styles.entryNote, { color: theme.textSecondary }]} numberOfLines={3}>
                    "{entry.note}"
                  </Text>
                )}

                {entry.tags && entry.tags.length > 0 && (
                  <View style={styles.entryTags}>
                    {entry.tags.map((t) => (
                      <View key={t} style={[styles.entryTag, { backgroundColor: theme.isDark ? "#2D2D2D" : "#F3EEFF" }]}>
                        <Text style={[styles.entryTagText, { color: "#8B7CFF" }]}>{t}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
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
  headerTitle: { fontSize: 25, fontFamily: "Frederick" },
  scroll: { paddingHorizontal: 10 },

  // Month nav
  monthNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  navBtn: { padding: 4 },
  monthLabel: { fontSize: 20, fontFamily: "Fredoka-Bold" },

  // Calendar
  calendarCard: {
    borderRadius: 24,
    padding: 8,
    borderWidth: 1,
    marginBottom: 20,
  },
  weekRow: { flexDirection: "row", marginBottom: 8 },
  gridWrap: { flexDirection: "row", flexWrap: "wrap" },
  calCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 2,
    marginBottom: 5,
  },
  dayCell: { borderRadius: 10, borderWidth: 2, borderColor: "transparent", padding: 2 },
  todayCell: {},
  weekLabel: { fontSize: 11, fontFamily: "Fredoka-Bold" },

  cellDay: { fontSize: 13, fontFamily: "Fredoka-Bold" },

  // Legend
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 28,
    justifyContent: "center",
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, fontFamily: "Fredoka-Regular" },

  // Section
  entriesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontFamily: "Fredoka-Bold" },

  // Empty
  emptyCard: {
    borderRadius: 24,
    padding: 40,
    borderWidth: 1,
    alignItems: "center",
    gap: 12,
  },
  emptyText: { fontSize: 15, fontFamily: "Fredoka-Regular" },
  emptyBtn: {
    backgroundColor: "#8B7CFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    marginTop: 4,
  },
  emptyBtnText: { color: "#FFF", fontFamily: "Fredoka-Bold", fontSize: 14 },

  // Entry cards
  entryCard: {
    borderRadius: 24,
    padding: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  entryHeader: { marginBottom: 8 },
  entryOrb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  entryMood: { fontSize: 16, fontFamily: "Fredoka-Bold" },
  entryDate: { fontSize: 12, fontFamily: "Fredoka-Regular", marginTop: 2 },
  entryNote: {
    fontSize: 14,
    fontFamily: "Fredoka-Regular",
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 4,
  },
  entryTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  entryTag: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  entryTagText: { fontSize: 11, fontFamily: "Fredoka-Bold" },
});
