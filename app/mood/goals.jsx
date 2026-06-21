import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";

const TABS = ["All Goals", "In Progress", "Completed"];

const MOCK_GOALS = [
  {
    id: "1",
    title: "Journal 5 days this week",
    progress: 4,
    total: 5,
    unit: "days",
    status: "in_progress",
    icon: "book-outline",
    color: "#8B7CFF"
  },
  {
    id: "2",
    title: "Keep mood above 0",
    progress: 4,
    total: 7,
    unit: "days",
    status: "in_progress",
    icon: "happy-outline",
    color: "#66BB6A"
  },
  {
    id: "3",
    title: "Help 3 people this week",
    progress: 2,
    total: 3,
    unit: "people",
    status: "in_progress",
    icon: "people-outline",
    color: "#FFC857"
  },
  {
    id: "4",
    title: "7 day mood streak",
    completedDate: "18 May 2026",
    status: "completed",
    icon: "flame-outline",
    color: "#FF6B6B"
  },
  {
    id: "5",
    title: "Exercise 3 times",
    completedDate: "16 May 2026",
    status: "completed",
    icon: "barbell-outline",
    color: "#8B7CFF"
  }
];

export default function GoalsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("All Goals");

  const renderGoal = (goal) => {
    if (goal.status === "completed") {
      return (
        <View key={goal.id} style={[styles.goalCard, { backgroundColor: goal.color + "1A" }]}>
          <View style={[styles.iconBox, { backgroundColor: goal.color + "30" }]}>
            <Ionicons name={goal.icon} size={24} color={goal.color} />
          </View>
          <View style={styles.goalMeta}>
            <Text style={[styles.goalTitle, { color: theme.text }]}>{goal.title}</Text>
            <Text style={[styles.goalSub, { color: theme.textSecondary }]}>Completed on {goal.completedDate}</Text>
          </View>
          <View style={[styles.checkCircle, { backgroundColor: "#66BB6A" }]}>
            <Ionicons name="checkmark" size={16} color="#FFF" />
          </View>
        </View>
      );
    }

    const progressPct = Math.round((goal.progress / goal.total) * 100);

    return (
      <View key={goal.id} style={[styles.goalCard, { backgroundColor: theme.isDark ? "#1A1A1A" : "#FFFFFF", borderColor: theme.border, borderWidth: 1 }]}>
        <View style={styles.goalHeader}>
          <View style={[styles.iconBox, { backgroundColor: goal.color + "1A" }]}>
            <Ionicons name={goal.icon} size={24} color={goal.color} />
          </View>
          <View style={styles.goalMeta}>
            <Text style={[styles.goalTitle, { color: theme.text }]}>{goal.title}</Text>
            <Text style={[styles.goalSub, { color: theme.textSecondary }]}>{goal.progress} / {goal.total} {goal.unit}</Text>
          </View>
          <TouchableOpacity>
            <Ionicons name="ellipsis-vertical" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
        <View style={styles.progressRow}>
          <View style={[styles.progressBarBg, { backgroundColor: theme.isDark ? "#2D2D2D" : "#F3F4F6" }]}>
            <View style={[styles.progressBarFill, { width: `${progressPct}%`, backgroundColor: goal.color }]} />
          </View>
          <Text style={[styles.progressText, { color: theme.textSecondary }]}>{progressPct}%</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.isDark ? "#000" : "#FAFAFC" }]} edges={["top"]}>
      <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.iconBtn, { backgroundColor: "#8B7CFF", borderWidth: 0 }]}>
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Title Area */}
        <View style={styles.titleArea}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.pageTitle, { color: theme.text }]}>My Goals</Text>
            <Text style={[styles.pageSubtitle, { color: theme.textSecondary }]}>
              Small steps. Big changes.{"\n"}Stay consistent, stay kind to yourself.
            </Text>
          </View>
          <MaterialCommunityIcons name="flag-triangle" size={64} color="#8B7CFF" style={{ opacity: 0.5 }} />
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {TABS.map(tab => (
            <TouchableOpacity 
              key={tab} 
              style={[styles.tab, activeTab === tab && { borderBottomColor: "#8B7CFF", borderBottomWidth: 2 }]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, { color: activeTab === tab ? "#8B7CFF" : theme.textSecondary }]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Goal Lists */}
        {activeTab !== "Completed" && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>In Progress</Text>
            {MOCK_GOALS.filter(g => g.status === "in_progress").map(renderGoal)}
          </View>
        )}

        {activeTab !== "In Progress" && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Completed</Text>
            {MOCK_GOALS.filter(g => g.status === "completed").map(renderGoal)}
          </View>
        )}

        {/* Summary Card */}
        <View style={[styles.summaryCard, { backgroundColor: "#F3EEFF" }]}>
          <Text style={[styles.summaryTitle, { color: "#1A1A1A" }]}>Your Progress</Text>
          <View style={styles.summaryStats}>
            <View style={styles.statCol}>
              <Text style={[styles.statNum, { color: "#1A1A1A" }]}>3</Text>
              <Text style={[styles.statLabel, { color: "#666" }]}>In Progress</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={[styles.statNum, { color: "#1A1A1A" }]}>2</Text>
              <Text style={[styles.statLabel, { color: "#666" }]}>Completed</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={[styles.statNum, { color: "#1A1A1A" }]}>5</Text>
              <Text style={[styles.statLabel, { color: "#666" }]}>Total Goals</Text>
            </View>
            <MaterialCommunityIcons name="flower" size={40} color="#8B7CFF" style={{ position: 'absolute', right: -10, bottom: -10, opacity: 0.8 }} />
          </View>
        </View>

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
    paddingTop: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: { paddingHorizontal: 20 },
  titleArea: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 12,
    marginBottom: 32,
  },
  pageTitle: {
    fontSize: 32,
    fontFamily: "Fredoka-Bold",
    marginBottom: 8,
  },
  pageSubtitle: {
    fontSize: 14,
    fontFamily: "Fredoka-Regular",
    lineHeight: 20,
  },
  tabsContainer: {
    flexDirection: "row",
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  tabText: {
    fontSize: 14,
    fontFamily: "Fredoka-Bold",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Fredoka-Bold",
    marginBottom: 16,
  },
  goalCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    flexDirection: "column",
  },
  goalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  goalMeta: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 15,
    fontFamily: "Fredoka-Bold",
    marginBottom: 4,
  },
  goalSub: {
    fontSize: 12,
    fontFamily: "Fredoka-Regular",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    fontFamily: "Fredoka-Bold",
    width: 30,
    textAlign: "right",
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  summaryCard: {
    borderRadius: 24,
    padding: 24,
    marginTop: 12,
    overflow: "hidden",
  },
  summaryTitle: {
    fontSize: 15,
    fontFamily: "Fredoka-Bold",
    marginBottom: 20,
  },
  summaryStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingRight: 40,
  },
  statCol: {},
  statNum: {
    fontSize: 24,
    fontFamily: "Fredoka-Bold",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Fredoka-Regular",
  }
});
