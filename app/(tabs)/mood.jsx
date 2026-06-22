import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Svg, { Circle, G, Path } from "react-native-svg";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Animated,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Loading from "../../components/Loading";
import MoodTimeline from "../../components/MoodTimeline";
import { MOOD_OPTIONS } from "../../components/MoodSelector";
import { db } from "../../config/firebase";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

// Convert JS getDay() (0=Sun) to Mon-first index (0=Mon)
const toMonFirst = (jsDay) => (jsDay === 0 ? 6 : jsDay - 1);

export default function MoodDashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [allEntries, setAllEntries] = useState([]);
  const [orbScale] = useState(new Animated.Value(1));

  // Breathing animation for the mood orb
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbScale, {
          toValue: 1.06,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(orbScale, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Real-time listener for mood entries
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "moodEntries"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const entries = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAllEntries(entries);
        setLoading(false);
      },
      (err) => {
        console.error("Mood entries listener error:", err);
        setLoading(false);
      }
    );

    return unsub;
  }, [user]);

  // ─── Derived data ────────────────────────────────────────────
  const today = new Date();
  const todayStr = today.toDateString();

  const todayEntry = allEntries.find(
    (e) => new Date(e.createdAt).toDateString() === todayStr
  );

  // Build this-week timeline data (Mon–Sun)
  const mondayOffset = toMonFirst(today.getDay());
  const monday = new Date(today);
  monday.setDate(today.getDate() - mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const weekTimeline = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dStr = d.toDateString();
    const entry = allEntries.find(
      (e) => new Date(e.createdAt).toDateString() === dStr
    );
    return {
      dayLabel: DAY_LABELS[i],
      dateLabel: String(d.getDate()),
      moodType: entry?.moodType || null,
      moodScore: entry?.moodScore ?? null,
      isToday: dStr === todayStr,
    };
  });

  // Week stats
  const endOfToday = new Date(today);
  endOfToday.setHours(23, 59, 59, 999);

  const weekEntries = allEntries.filter((e) => {
    const d = new Date(e.createdAt);
    return d >= monday && d <= endOfToday;
  });

  const avgScore =
    weekEntries.length > 0
      ? weekEntries.reduce((s, e) => s + (e.moodScore || 0), 0) /
        weekEntries.length
      : 0;

  // Convert -10..+10 to 1..5 scale
  const avgMood5 = ((avgScore + 10) / 20) * 4 + 1;

  // Streak calculation
  const calcStreak = () => {
    let streak = 0;
    const check = new Date(today);
    while (true) {
      const dStr = check.toDateString();
      const found = allEntries.some(
        (e) => new Date(e.createdAt).toDateString() === dStr
      );
      if (!found) break;
      streak++;
      check.setDate(check.getDate() - 1);
    }
    return streak;
  };
  const streak = calcStreak();

  // ─── Helpers ─────────────────────────────────────────────────
  const getMoodMeta = (type) =>
    MOOD_OPTIONS.find((m) => m.id === type) || MOOD_OPTIONS[2];

  const getMoodLabel5 = (v) => {
    if (v >= 4.5) return "Amazing";
    if (v >= 3.5) return "Good";
    if (v >= 2.5) return "Okay";
    if (v >= 1.5) return "Bad";
    return "Awful";
  };

  const getMoodColor5 = (v) => {
    if (v >= 4.5) return "#66BB6A";
    if (v >= 3.5) return "#FFC857";
    if (v >= 2.5) return "#8B7CFF";
    if (v >= 1.5) return "#FF6B6B";
    return "#D32F2F";
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor: theme.isDark ? "#000" : "#FAFAFC",
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
        edges={["top"]}
      >
        <Loading size="large" />
      </SafeAreaView>
    );
  }

  const todayMood = todayEntry ? getMoodMeta(todayEntry.moodType) : null;

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: theme.background },
      ]}
      edges={["top"]}
    >
      <StatusBar
        barStyle={theme.isDark ? "light-content" : "dark-content"}
        backgroundColor={theme.isDark ? "#000" : "#FAFAFC"}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Header ─────────────────────────────────── */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              Mood{"\n"}Tracker
            </Text>
            <Text style={[styles.headerSub, { color: theme.textSecondary }]}>
              Track your mood.{"\n"}Understand yourself.{"\n"}Grow with every
              day.
            </Text>
          </View>
          
          {/* Smiling Cloud Doodle SVG */}
          <View style={{ width: 140, height: 140, justifyContent: 'center', alignItems: 'center', marginLeft: 20 }}>
            <Svg width="100%" height="100%" viewBox="0 0 100 100">
              {/* Hand-drawn Sparkles & Squiggles */}
              {/* Top Left Diamond */}
              <Path d="M 30 10 Q 32 15 35 15 Q 32 15 30 20 Q 28 15 25 15 Q 28 15 30 10" stroke={theme.text} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              {/* Top Right Diamond */}
              <Path d="M 75 8 Q 76 12 78 12 Q 76 12 75 16 Q 74 12 72 12 Q 74 12 75 8" stroke={theme.text} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              {/* Left Squiggle */}
              <Path d="M 15 40 Q 18 38 20 40 Q 22 42 20 44 Q 18 42 15 40" stroke={theme.text} strokeWidth="1.5" fill="none" strokeLinecap="round" />
              {/* Right Squiggle */}
              <Path d="M 85 50 Q 88 48 90 50 Q 92 52 90 54 Q 88 52 85 50" stroke={theme.text} strokeWidth="1.5" fill="none" strokeLinecap="round" />
              {/* Bottom Left Curly */}
              <Path d="M 22 75 Q 26 70 28 75 Q 26 80 22 75 Q 18 70 20 78" stroke={theme.text} strokeWidth="1.5" fill="none" strokeLinecap="round" />
              {/* Bottom Right Curly */}
              <Path d="M 85 75 Q 82 70 80 75 Q 82 80 85 75 Q 88 70 86 78" stroke={theme.text} strokeWidth="1.5" fill="none" strokeLinecap="round" />
              {/* Top Right Lines */}
              <Path d="M 90 25 L 85 30 M 95 30 L 90 35" stroke={theme.text} strokeWidth="1.5" strokeLinecap="round" />
              {/* Bottom Left Lines */}
              <Path d="M 35 90 L 40 85 M 30 85 L 35 80" stroke={theme.text} strokeWidth="1.5" strokeLinecap="round" />
              {/* Bottom Right Arrow/Line */}
              <Path d="M 65 90 L 60 85 M 65 90 L 70 85" stroke={theme.text} strokeWidth="1.5" strokeLinecap="round" />
              
              {/* Cloud Base */}
              <G fill={theme.isDark ? "#9A8CFF" : "#C7BBF5"}>
                <Circle cx="40" cy="38" r="15" />
                <Circle cx="60" cy="38" r="15" />
                <Circle cx="28" cy="55" r="16" />
                <Circle cx="72" cy="55" r="16" />
                <Circle cx="40" cy="70" r="14" />
                <Circle cx="60" cy="70" r="14" />
                <Circle cx="50" cy="55" r="18" />
              </G>
              
              {/* Pink Blush */}
              <Circle cx="35" cy="58" r="4" fill="#E8BEE0" opacity={theme.isDark ? "0.6" : "0.8"} />
              <Circle cx="65" cy="58" r="4" fill="#E8BEE0" opacity={theme.isDark ? "0.6" : "0.8"} />
              
              {/* Closed Happy Eyes */}
              <Path d="M 40 50 Q 42 46 44 50" fill="none" stroke={theme.text} strokeWidth="2.5" strokeLinecap="round" />
              <Path d="M 56 50 Q 58 46 60 50" fill="none" stroke={theme.text} strokeWidth="2.5" strokeLinecap="round" />
              
              {/* U Smile */}
              <Path d="M 46 60 Q 50 66 54 60" fill="none" stroke={theme.text} strokeWidth="2.5" strokeLinecap="round" />
            </Svg>
          </View>
        </View>

        {/* ── Today's Mood Hero ──────────────────────── */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: theme.isDark ? "#1A1A1A" : "#FFF",
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.heroTop}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons
                name="calendar-outline"
                size={16}
                color={theme.textSecondary}
              />
              <Text style={[styles.heroLabel, { color: theme.text }]}>
                Today's Mood
              </Text>
            </View>
            <Text style={[styles.heroDate, { color: theme.textTertiary }]}>
              Today,{" "}
              {today.toLocaleDateString("en-US", {
                day: "numeric",
                month: "short",
              })}
            </Text>
          </View>

          <View style={styles.heroBody}>
            {todayMood ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                <Animated.View
                  style={[
                    styles.moodOrb,
                    {
                      backgroundColor: todayMood.color,
                      transform: [{ scale: orbScale }],
                    },
                  ]}
                >
                  <MaterialCommunityIcons name={todayMood.icon} size={38} color="#FFFFFF" />
                </Animated.View>
                <View>
                  <Text style={[styles.moodText, { color: theme.text }]}>
                    {todayMood.label}
                  </Text>
                  <Text
                    style={[styles.scoreText, { color: todayMood.color }]}
                  >
                    {todayEntry.moodScore > 0 ? "+" : ""}
                    {todayEntry.moodScore} Score
                  </Text>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                <View
                  style={[
                    styles.moodOrb,
                    {
                      backgroundColor: theme.input,
                    },
                  ]}
                >
                  <Ionicons name="ellipse-outline" size={32} color={theme.textTertiary} />
                </View>
                <View>
                  <Text style={[styles.moodText, { color: theme.textSecondary }]}>
                    Not logged yet
                  </Text>
                  <Text
                    style={[styles.scoreText, { color: theme.textTertiary }]}
                  >
                    Tap to log today's mood
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.editBtn,
                { backgroundColor: theme.input },
              ]}
              onPress={() => router.push("/mood/log")}
            >
              <Ionicons name="pencil" size={18} color="#8B7CFF" />
            </TouchableOpacity>
          </View>

          {streak > 0 && (
            <View style={[styles.streakBar, { backgroundColor: theme.input }]}>
              <Ionicons name="flame" size={16} color="#FF6B6B" />
              <Text style={[styles.streakText, { color: theme.text }]}>
                {streak} day streak!
              </Text>
            </View>
          )}
        </View>

        {/* ── This Week ──────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              This Week
            </Text>
            <TouchableOpacity onPress={() => router.push("/mood/history")}>
              <Text style={styles.viewAll}>View all</Text>
            </TouchableOpacity>
          </View>
          <MoodTimeline entries={weekTimeline} />
        </View>

        {/* ── Mood Summary ───────────────────────────── */}
        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Mood Summary
            </Text>
            <Text style={styles.viewAll}>This week</Text>
          </View>

          <View style={styles.summaryBody}>
            <View>
              <Text
                style={[styles.summaryLabel, { color: theme.textSecondary }]}
              >
                Avg Mood
              </Text>
              <Text style={[styles.bigNumber, { color: theme.text }]}>
                {avgMood5.toFixed(1)}{" "}
                <Text style={{ fontSize: 16, color: theme.textTertiary }}>
                  / 5
                </Text>
              </Text>
              <Text
                style={{
                  color: getMoodColor5(avgMood5),
                  fontFamily: "Fredoka-Bold",
                  fontSize: 13,
                  marginTop: 2,
                }}
              >
                {getMoodLabel5(avgMood5)}
              </Text>
            </View>

            {/* Mini bar chart */}
            <View style={styles.miniChart}>
              {weekTimeline.map((d, i) => {
                const h =
                  d.moodScore !== null
                    ? Math.max(8, ((d.moodScore + 10) / 20) * 50)
                    : 8;
                const c =
                  d.moodType
                    ? getMoodMeta(d.moodType).color
                    : theme.input;
                return (
                  <View key={i} style={styles.barCol}>
                    <View
                      style={[styles.bar, { height: h, backgroundColor: c }]}
                    />
                    <Text
                      style={[styles.barLabel, { color: theme.textTertiary }]}
                    >
                      {d.dayLabel}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── Quick Actions ──────────────────────────── */}
        <Text
          style={[
            styles.sectionTitle,
            { color: theme.text, marginTop: 8, marginBottom: 12 },
          ]}
        >
          Quick Actions
        </Text>
        <View style={styles.quickGrid}>
          <TouchableOpacity
            style={[styles.qAction, { backgroundColor: "#8B7CFF" }]}
            onPress={() => router.push("/mood/log")}
          >
            <Ionicons name="add-circle" size={24} color="#FFF" />
            <Text style={styles.qActionPrimary}>Log Mood</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.qActionSec,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
            onPress={() => router.push("/mood/journal")}
          >
            <Ionicons name="book" size={24} color="#FFC857" />
            <Text style={[styles.qActionText, { color: theme.text }]}>
              Journal
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.qActionSec,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
            onPress={() => router.push("/mood/insights")}
          >
            <Ionicons name="bar-chart" size={24} color="#66BB6A" />
            <Text style={[styles.qActionText, { color: theme.text }]}>
              Insights
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.qActionSec,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
            onPress={() => router.push("/mood/goals")}
          >
            <Ionicons name="flag" size={24} color="#FF6B6B" />
            <Text style={[styles.qActionText, { color: theme.text }]}>
              Goals
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 14 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  headerTitle: {
    fontSize: 36,
    fontFamily: "Frederick",
    lineHeight: 40,
    marginBottom: 8,
    marginLeft:10
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "Fredoka-Regular",
    lineHeight: 18,
    marginLeft: 10
  },
  
  // Doodle
  headerDoodle: {
    width: 100,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  doodleEyes: {
    position: "absolute",
    top: 42,
    flexDirection: "row",
    width: 28,
    justifyContent: "space-between",
  },
  doodleEye: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#4A4A4A",
  },
  doodleSmile: {
    position: "absolute",
    top: 40,
    width: 18,
    height: 16,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "transparent",
    borderBottomColor: "#4A4A4A",
  },
  doodleSparkle: {
    position: "absolute",
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },

  // Hero
  heroCard: {
    borderRadius: 24,
    padding: 16,
    marginBottom: 28,
    borderWidth: 1,
    shadowColor: "#8B7CFF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  heroLabel: { fontSize: 14, fontFamily: "Fredoka-Bold" },
  heroDate: { fontSize: 13, fontFamily: "Fredoka-Regular" },
  heroBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  moodOrb: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },

  moodText: { fontSize: 30, fontFamily: "Frederick", marginBottom: 2 },
  scoreText: { fontSize: 14, fontFamily: "Fredoka-Bold" },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  streakBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  streakText: { fontSize: 13, fontFamily: "Fredoka-Bold" },

  // Sections
  section: { marginBottom: 28 },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontFamily: "Fredoka-Bold" },
  viewAll: { fontSize: 14, fontFamily: "Fredoka-Regular", color: "#8B7CFF" },

  // Summary
  summaryCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 28,
    borderWidth: 1,
  },
  summaryBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  summaryLabel: { fontSize: 13, fontFamily: "Fredoka-Regular", marginBottom: 4 },
  bigNumber: { fontSize: 32, fontFamily: "Fredoka-Bold" },
  miniChart: { flexDirection: "row", alignItems: "flex-end", gap: 8, height: 60 },
  barCol: { alignItems: "center", gap: 4 },
  bar: { width: 10, borderRadius: 5 },
  barLabel: { fontSize: 9, fontFamily: "Fredoka-Regular" },

  // Quick Actions
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  qAction: {
    width: "48%",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#8B7CFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  qActionSec: {
    width: "48%",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
  },
  qActionPrimary: {
    fontSize: 15,
    fontFamily: "Fredoka-Bold",
    color: "#FFF",
  },
  qActionText: { fontSize: 15, fontFamily: "Fredoka-Bold" },
});
