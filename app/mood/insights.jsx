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
import Svg, { Circle, Line, Path } from "react-native-svg";
import { useTheme } from "../../context/ThemeContext";

const BREAKDOWN = [
  { label: "Amazing", count: 2, pct: "28%", color: "#66BB6A" },
  { label: "Good", count: 3, pct: "42%", color: "#FFC857" },
  { label: "Okay", count: 1, pct: "14%", color: "#8B7CFF" },
  { label: "Bad", count: 1, pct: "14%", color: "#FF6B6B" },
  { label: "Awful", count: 0, pct: "0%", color: "#D32F2F" },
];

export default function InsightsScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.isDark ? "#000" : "#FAFAFC" }]}
      edges={["top"]}
    >
      <StatusBar barStyle={theme.isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Insights</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            Understand your mood patterns{"\n"}and what influences them.
          </Text>
        </View>
        <TouchableOpacity style={[styles.dropdownBtn, { backgroundColor: theme.isDark ? "#1A1A1A" : "#FFFFFF", borderColor: theme.border }]}>
          <Text style={[styles.dropdownText, { color: theme.text }]}>This Week</Text>
          <Ionicons name="chevron-down" size={16} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Average Mood Card */}
        <View style={[styles.chartCard, { backgroundColor: theme.isDark ? "#1A1A1A" : "#F3EEFF" }]}>
          <View style={styles.chartHeader}>
            <Text style={[styles.chartTitle, { color: theme.isDark ? theme.text : "#4A4A4A" }]}>Average Mood</Text>
            <Ionicons name="sparkles-outline" size={24} color="#8B7CFF" />
          </View>
          <View>
            <Text style={[styles.bigNum, { color: theme.text }]}>3.8<Text style={{ fontSize: 16 }}>/5</Text></Text>
            <Text style={[styles.moodLabel, { color: "#FFC857" }]}>Good</Text>
          </View>
          
          {/* Mock Line Chart */}
          <View style={styles.lineChartWrapper}>
            <Svg height="100" width="100%" viewBox="0 0 300 100">
              <Path d="M10,70 L50,60 L90,80 L130,30 L170,50 L210,30 L250,45 M250,45 L290,40" fill="none" stroke="#8B7CFF" strokeWidth="3" />
              {[10, 50, 90, 130, 170, 210, 250, 290].map((cx, i) => (
                <Circle key={i} cx={cx} cy={[70, 60, 80, 30, 50, 30, 45, 40][i]} r="5" fill="#8B7CFF" />
              ))}
            </Svg>
            <View style={styles.chartXAxis}>
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <Text key={i} style={[styles.axisText, { color: theme.isDark ? theme.textSecondary : "#666" }]}>{d}</Text>
              ))}
            </View>
          </View>
        </View>

        {/* Mood Breakdown */}
        <View style={[styles.card, { backgroundColor: theme.isDark ? "#1A1A1A" : "#FFFFFF", borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Mood Breakdown</Text>
          <View style={styles.breakdownRow}>
            {/* Mock Donut */}
            <View style={styles.donutMock}>
              <View style={[styles.donutSlice, { borderTopColor: "#FFC857", borderRightColor: "#66BB6A", borderBottomColor: "#8B7CFF", borderLeftColor: "#FF6B6B" }]} />
              <View style={[styles.donutInner, { backgroundColor: theme.isDark ? "#1A1A1A" : "#FFFFFF" }]}>
                <MaterialCommunityIcons name="emoticon-happy" size={32} color="#FFC857" />
              </View>
            </View>
            
            <View style={styles.legend}>
              {BREAKDOWN.map(item => (
                <View key={item.label} style={styles.legendItem}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text style={[styles.legendLabel, { color: theme.textSecondary }]}>{item.label}</Text>
                  </View>
                  <Text style={[styles.legendValue, { color: theme.text }]}>
                    {item.count} <Text style={{ color: theme.textTertiary }}>({item.pct})</Text>
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Top Days */}
        <View style={[styles.dayCard, { backgroundColor: "#E8F5E9" }]}>
          <View>
            <Text style={[styles.dayCardLabel, { color: "#2E7D32" }]}>Top Positive Day</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Text style={[styles.dayCardTitle, { color: "#1B5E20" }]}>Wednesday</Text>
              <View style={[styles.scoreBadge, { backgroundColor: "rgba(102, 187, 106, 0.2)" }]}>
                <Text style={[styles.scoreText, { color: "#2E7D32" }]}>4.6</Text>
              </View>
            </View>
          </View>
          <Ionicons name="leaf-outline" size={48} color="#66BB6A" style={styles.dayDoodle} />
        </View>

        <View style={[styles.dayCard, { backgroundColor: "#FFEBEE" }]}>
          <View>
            <Text style={[styles.dayCardLabel, { color: "#C62828" }]}>Top Challenging Day</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Text style={[styles.dayCardTitle, { color: "#B71C1C" }]}>Tuesday</Text>
              <View style={[styles.scoreBadge, { backgroundColor: "rgba(255, 107, 107, 0.2)" }]}>
                <Text style={[styles.scoreText, { color: "#C62828" }]}>2.1</Text>
              </View>
            </View>
          </View>
          <Ionicons name="rainy-outline" size={48} color="#FF6B6B" style={styles.dayDoodle} />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
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
    fontFamily: "Fredoka-Bold",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: "Fredoka-Regular",
    lineHeight: 20,
  },
  dropdownBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  dropdownText: {
    fontSize: 13,
    fontFamily: "Fredoka-Bold",
  },
  scrollContent: { paddingHorizontal: 20 },
  chartCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  chartTitle: {
    fontSize: 15,
    fontFamily: "Fredoka-Bold",
  },
  bigNum: {
    fontSize: 36,
    fontFamily: "Fredoka-Bold",
  },
  moodLabel: {
    fontSize: 16,
    fontFamily: "Fredoka-Bold",
  },
  lineChartWrapper: {
    marginTop: 20,
  },
  chartXAxis: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingHorizontal: 10,
  },
  axisText: {
    fontSize: 11,
    fontFamily: "Fredoka-Regular",
  },
  card: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: "Fredoka-Bold",
    marginBottom: 20,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  donutMock: {
    width: 120,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 24,
  },
  donutSlice: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 60,
    borderWidth: 20,
  },
  donutInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  legend: {
    flex: 1,
    gap: 12,
  },
  legendItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 12,
    fontFamily: "Fredoka-Regular",
  },
  legendValue: {
    fontSize: 12,
    fontFamily: "Fredoka-Bold",
  },
  dayCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    overflow: "hidden",
  },
  dayCardLabel: {
    fontSize: 13,
    fontFamily: "Fredoka-Bold",
    marginBottom: 8,
  },
  dayCardTitle: {
    fontSize: 20,
    fontFamily: "Fredoka-Bold",
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scoreText: {
    fontSize: 13,
    fontFamily: "Fredoka-Bold",
  },
  dayDoodle: {
    position: "absolute",
    right: 10,
    bottom: -10,
    opacity: 0.8,
  }
});
