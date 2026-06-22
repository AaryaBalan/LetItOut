import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState, useMemo } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../config/firebase";
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from "firebase/firestore";
import { MOOD_OPTIONS } from "../../components/MoodSelector";
import Loading from "../../components/Loading";

const getMoodMeta = (type) => MOOD_OPTIONS.find((m) => m.id === type) || MOOD_OPTIONS[2];

export default function InsightsScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState("Last 7 Days");
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "moodEntries"), where("userId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const data = [];
      snap.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setEntries(data);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const {
    last7DaysEntries,
    avgMood5,
    avgMoodMeta,
    breakdown,
    topPositive,
    topChallenging,
    lineChartData,
    daysLabels
  } = useMemo(() => {
    const now = new Date();
    let startDate = new Date();

    if (timeframe === "Today") {
      startDate.setHours(0, 0, 0, 0);
    } else if (timeframe === "Last 7 Days") {
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
    } else if (timeframe === "Last 30 Days") {
      startDate.setDate(now.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
    } else if (timeframe === "Last 6 Months") {
      startDate.setMonth(now.getMonth() - 6);
      startDate.setHours(0, 0, 0, 0);
    } else if (timeframe === "Last Year") {
      startDate.setFullYear(now.getFullYear() - 1);
      startDate.setHours(0, 0, 0, 0);
    }

    const recent = entries.filter((e) => new Date(e.createdAt) >= startDate);

    let total = recent.length || 1;
    const moodCounts = { amazing: 0, good: 0, okay: 0, bad: 0, awful: 0 };
    recent.forEach((e) => {
      if (moodCounts[e.moodType] !== undefined) moodCounts[e.moodType]++;
    });

    const breakdownData = MOOD_OPTIONS.map((m) => ({
      label: m.label,
      count: moodCounts[m.id],
      pct: Math.round((moodCounts[m.id] / total) * 100) + "%",
      rawPct: moodCounts[m.id] / total,
      color: m.color,
      icon: m.icon,
    }));

    let avgScore = 0;
    if (recent.length > 0) {
      avgScore = recent.reduce((sum, e) => sum + (e.moodScore || 0), 0) / recent.length;
    }
    const calculatedAvgMood5 = ((avgScore + 10) / 20) * 4 + 1;
    let meta = MOOD_OPTIONS[2];
    if (calculatedAvgMood5 >= 4.5) meta = MOOD_OPTIONS[0];
    else if (calculatedAvgMood5 >= 3.5) meta = MOOD_OPTIONS[1];
    else if (calculatedAvgMood5 >= 2.5) meta = MOOD_OPTIONS[2];
    else if (calculatedAvgMood5 >= 1.5) meta = MOOD_OPTIONS[3];
    else meta = MOOD_OPTIONS[4];

    const byDay = {};
    recent.forEach((e) => {
      const d = new Date(e.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!byDay[key]) {
        byDay[key] = {
          label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          dateStr: d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" }),
          entries: [],
          avg: 0,
        };
      }
      byDay[key].entries.push(e);
    });

    const sortedKeys = Object.keys(byDay).sort();

    let topPos = null;
    let topChal = null;

    sortedKeys.forEach((key) => {
      const day = byDay[key];
      day.avg = day.entries.reduce((sum, e) => sum + (e.moodScore || 0), 0) / day.entries.length;
      if (!topPos || day.avg > topPos.avg) topPos = day;
      if (!topChal || day.avg < topChal.avg) topChal = day;
    });

    const dLabels = sortedKeys.map((key) => byDay[key].label);
    const lcData = sortedKeys.map((key) => byDay[key].avg);

    return {
      last7DaysEntries: recent,
      avgMood5: calculatedAvgMood5,
      avgMoodMeta: meta,
      breakdown: breakdownData,
      topPositive: topPos,
      topChallenging: topChal,
      lineChartData: lcData,
      daysLabels: dLabels
    };
  }, [entries, timeframe]);

  if (loading) return <Loading />;

  const generate1YearMockData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const moodScoring = { "amazing": 10, "good": 5, "okay": 0, "bad": -5, "awful": -10 };
      const moodTypes = Object.keys(moodScoring);
      const availableTags = ["Work", "Study", "Social", "Health", "Grateful", "Goals", "Family", "Exercise", "Love"];
      
      const goodTitles = ["Great workout!", "Promotion at work 🎉", "Lovely dinner with friends", "Aced my exam!", "Feeling so grateful", "Amazing weather today", "Productive coding session"];
      const goodDescs = ["I woke up full of energy and got so much done. Then I hung out with some friends and we laughed a lot. Feeling super blessed.", "Everything just clicked today. I crushed my tasks and felt really confident. Hope tomorrow is just as good!", "Took a long walk in the sun. It really cleared my mind and I feel so much happier now."];
      
      const okayTitles = ["Just a normal day", "Nothing special", "Got some chores done", "A bit tired but fine", "Quiet afternoon"];
      const okayDescs = ["Today was just average. Did my work, ate some food, watched a bit of TV. Not bad, not great.", "Feeling a little sluggish but I managed to push through and finish my tasks.", "Spent most of the day running errands. Exhausting but necessary."];

      const badTitles = ["Feeling overwhelmed", "Stressed about deadline", "Argued with a friend", "Caught a cold", "Really bad sleep", "Anxious today"];
      const badDescs = ["I couldn't focus at all today. My mind was racing and everything felt like it was going wrong. Just want to go to bed.", "Got into a stupid argument that ruined my mood for the rest of the day. Need some time alone.", "I feel so drained and unmotivated. Everything is piling up and I don't know where to start."];

      const promises = [];
      const now = new Date();
      
      for (let i = 0; i < 200; i++) {
        const randomDaysAgo = Math.floor(Math.random() * 365);
        const randomDate = new Date();
        randomDate.setDate(now.getDate() - randomDaysAgo);
        randomDate.setHours(Math.floor(Math.random() * 23), Math.floor(Math.random() * 59));
        
        const randomType = moodTypes[Math.floor(Math.random() * moodTypes.length)];
        const score = moodScoring[randomType];
        
        const numTags = Math.floor(Math.random() * 3) + 1;
        const shuffledTags = availableTags.sort(() => 0.5 - Math.random());
        const selectedTags = shuffledTags.slice(0, numTags);
        
        let title = "";
        let desc = "";
        if (score > 0) {
          title = goodTitles[Math.floor(Math.random() * goodTitles.length)];
          desc = goodDescs[Math.floor(Math.random() * goodDescs.length)];
        } else if (score < 0) {
          title = badTitles[Math.floor(Math.random() * badTitles.length)];
          desc = badDescs[Math.floor(Math.random() * badDescs.length)];
        } else {
          title = okayTitles[Math.floor(Math.random() * okayTitles.length)];
          desc = okayDescs[Math.floor(Math.random() * okayDescs.length)];
        }
        
        const mockDoc = {
          userId: user.uid,
          moodType: randomType,
          moodScore: score,
          title: title,
          description: desc,
          tags: selectedTags,
          createdAt: randomDate.toISOString(),
        };
        
        promises.push(addDoc(collection(db, "moodEntries"), mockDoc));
      }
      
      await Promise.all(promises);
      setLoading(false);
      alert("Successfully generated 200 mock entries over the last year!");
    } catch (err) {
      console.error(err);
      setLoading(false);
      alert("Error generating data");
    }
  };

  const deleteAllData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const promises = entries.map((entry) => deleteDoc(doc(db, "moodEntries", entry.id)));
      await Promise.all(promises);
      setLoading(false);
      alert("Successfully deleted all mood logs! Starting fresh.");
    } catch (err) {
      console.error(err);
      setLoading(false);
      alert("Error deleting data");
    }
  };

  // Create Donut Chart Ring SVG
  const renderDonut = () => {
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    return (
      <View style={styles.donutMock}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100">
          <Circle cx="50" cy="50" r={radius} fill="none" stroke={theme.isDark ? "#2A2A2A" : "#E5E7EB"} strokeWidth="20" />
          {breakdown.map((slice) => {
            if (slice.rawPct === 0) return null;
            const strokeLength = slice.rawPct * circumference;
            const gapLength = circumference - strokeLength;
            const dash = `${strokeLength} ${gapLength}`;
            const currentOffset = offset;
            offset -= strokeLength;
            return (
              <Circle
                key={slice.label}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth="20"
                strokeDasharray={dash}
                strokeDashoffset={currentOffset}
                transform="rotate(-90 50 50)"
                strokeLinecap="round"
              />
            );
          })}
        </Svg>
        <View style={[styles.donutInner, { backgroundColor: theme.card }]}>
          <MaterialCommunityIcons name={avgMoodMeta.icon} size={32} color={avgMoodMeta.color} />
        </View>
      </View>
    );
  };

  const renderLineChart = () => {
    const validPoints = lineChartData.map((val, i) => ({ val, i }));
    if (validPoints.length === 0) return null;

    // Filter labels to not overcrowd the x-axis
    const maxLabels = 7;
    const step = Math.max(1, Math.floor(validPoints.length / maxLabels));

    let pathD = "";
    validPoints.forEach((p, idx) => {
      const x = 10 + (p.i * (280 / Math.max(1, validPoints.length - 1)));
      // Map val (-10 to 10) to y (90 to 10): ratio is (val + 10)/20
      const ratio = (p.val + 10) / 20;
      const y = 90 - (ratio * 80);
      pathD += idx === 0 ? `M${x},${y}` : ` L${x},${y}`;
    });

    return (
      <View style={styles.lineChartWrapper}>
        <Svg height="100" width="100%" viewBox="0 0 300 100">
          <Path d={pathD} fill="none" stroke="#8B7CFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {validPoints.map((p) => {
            const x = 10 + (p.i * (280 / Math.max(1, validPoints.length - 1)));
            const ratio = (p.val + 10) / 20;
            const y = 90 - (ratio * 80);
            return <Circle key={p.i} cx={x} cy={y} r="5" fill="#8B7CFF" />
          })}
        </Svg>
        <View style={styles.chartXAxis}>
          {daysLabels.map((d, i) => {
            if (i % step !== 0 && i !== daysLabels.length - 1) return <View key={i} style={{ width: 20 }} />;
            return <Text key={i} style={[styles.axisText, { color: theme.textSecondary }]}>{d}</Text>;
          })}
        </View>
      </View>
    );
  };

  const renderDayCard = (dayData, title, type) => {
    if (!dayData || dayData.entries.length === 0) return null;
    const isPos = type === "positive";
    const bg = isPos ? (theme.isDark ? "#0A2010" : "#E8F5E9") : (theme.isDark ? "#2A0A0A" : "#FFEBEE");
    const titleColor = isPos ? (theme.isDark ? "#81C784" : "#1B5E20") : (theme.isDark ? "#E57373" : "#B71C1C");
    const labelColor = isPos ? (theme.isDark ? "#A5D6A7" : "#2E7D32") : (theme.isDark ? "#EF9A9A" : "#C62828");
    const badgeBg = isPos ? "rgba(102, 187, 106, 0.2)" : "rgba(255, 107, 107, 0.2)";
    const iconColor = isPos ? "#66BB6A" : "#FF6B6B";
    const iconName = isPos ? "leaf-outline" : "rainy-outline";

    return (
      <View style={[styles.dayCardWrapper, { backgroundColor: bg }]}>
        <View style={styles.dayCardTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.dayCardLabel, { color: labelColor }]}>{title}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 4 }}>
              <Text style={[styles.dayCardTitle, { color: titleColor }]}>{dayData.dateStr}</Text>
              <View style={[styles.scoreBadge, { backgroundColor: badgeBg }]}>
                <Text style={[styles.scoreText, { color: labelColor }]}>
                  {(((dayData.avg + 10) / 20) * 4 + 1).toFixed(1)}/5
                </Text>
              </View>
            </View>
          </View>
          <Ionicons name={iconName} size={48} color={iconColor} style={styles.dayDoodle} />
        </View>

        <View style={styles.dayEntries}>
          {dayData.entries.map((entry) => {
            const mood = getMoodMeta(entry.moodType);
            return (
              <View key={entry.id} style={[styles.entryItem, { backgroundColor: theme.isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.6)" }]}>
                <View style={[styles.entryOrb, { backgroundColor: mood.color, marginTop: 4 }]}>
                  <MaterialCommunityIcons name={mood.icon} size={18} color="#FFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <Text style={[styles.entryTitle, { color: theme.text }]} numberOfLines={2}>
                      {entry.title || "Mood Log"}
                    </Text>
                    <Text style={[styles.entryTime, { color: theme.textSecondary }]}>
                      {new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </View>
                  {entry.description ? (
                    <Text style={[styles.entryDesc, { color: theme.textSecondary }]} numberOfLines={3}>
                      {entry.description}
                    </Text>
                  ) : null}
                  {entry.tags && entry.tags.length > 0 && (
                    <View style={styles.entryTagsContainer}>
                      {entry.tags.map((t) => (
                        <View key={t} style={[styles.entryTag, { backgroundColor: theme.input }]}>
                          <Text style={[styles.entryTagText, { color: mood.color }]}>{t}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
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
          <Text style={[styles.headerTitle, { color: theme.text }]}>Insights</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            Understand your mood patterns{"\n"}and what influences them.
          </Text>
        </View>
        <View style={{ position: 'relative', zIndex: 100 }}>
          <TouchableOpacity 
            style={[styles.dropdownBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => setShowDropdown(!showDropdown)}
          >
            <Text style={[styles.dropdownText, { color: theme.text }]}>{timeframe}</Text>
            <Ionicons name="chevron-down" size={16} color={theme.text} />
          </TouchableOpacity>
          {showDropdown && (
            <View style={[styles.dropdownMenu, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {["Today", "Last 7 Days", "Last 30 Days", "Last 6 Months", "Last Year"].map((opt) => (
                <TouchableOpacity key={opt} style={styles.dropdownItem} onPress={() => { setTimeframe(opt); setShowDropdown(false); }}>
                  <Text style={[styles.dropdownItemText, { color: theme.text, fontFamily: timeframe === opt ? "Fredoka-Bold" : "Fredoka-Regular" }]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Average Mood Card */}
        <View style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
          <View style={styles.chartHeader}>
            <Text style={[styles.chartTitle, { color: theme.text }]}>Average Mood</Text>
            <Ionicons name="sparkles-outline" size={24} color="#8B7CFF" />
          </View>
          <View>
            <Text style={[styles.bigNum, { color: theme.text }]}>
              {last7DaysEntries.length ? avgMood5.toFixed(1) : "-"}
              <Text style={{ fontSize: 16 }}>/5</Text>
            </Text>
            <Text style={[styles.moodLabel, { color: avgMoodMeta.color }]}>
              {last7DaysEntries.length ? avgMoodMeta.label : "No data"}
            </Text>
          </View>
          
          {last7DaysEntries.length > 0 ? renderLineChart() : (
            <View style={{ height: 100, justifyContent: "center", alignItems: "center" }}>
              <Text style={{ color: theme.textSecondary, fontFamily: "Fredoka-Regular" }}>Not enough data to graph.</Text>
            </View>
          )}
        </View>

        {/* Mood Breakdown */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Mood Breakdown</Text>
          {last7DaysEntries.length > 0 ? (
            <View style={styles.breakdownRow}>
              {renderDonut()}
              <View style={styles.legend}>
                {breakdown.map(item => (
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
          ) : (
            <Text style={{ color: theme.textSecondary, textAlign: 'center', marginVertical: 20, fontFamily: "Fredoka-Regular" }}>No logs in the last 7 days.</Text>
          )}
        </View>

        {/* Top Days */}
        {renderDayCard(topPositive, "Top Positive Day", "positive")}
        {renderDayCard(topChallenging, "Top Challenging Day", "challenging")}

        <TouchableOpacity 
          style={{ backgroundColor: theme.text, padding: 16, borderRadius: 16, marginTop: 20, alignItems: "center" }}
          onPress={generate1YearMockData}
        >
          <Text style={{ color: theme.background, fontFamily: "Fredoka-Bold", fontSize: 16 }}>🛠️ Generate 1 Year Mock Data</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={{ backgroundColor: "#FF6B6B", padding: 16, borderRadius: 16, marginTop: 10, alignItems: "center" }}
          onPress={deleteAllData}
        >
          <Text style={{ color: "#FFF", fontFamily: "Fredoka-Bold", fontSize: 16 }}>🗑️ Clear All Mood Data</Text>
        </TouchableOpacity>

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
    fontSize: 28,
    fontFamily: "Frederick",
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  dropdownText: {
    fontSize: 13,
    fontFamily: "Fredoka-Bold",
  },
  dropdownMenu: {
    position: "absolute",
    top: 45,
    right: 0,
    width: 140,
    borderRadius: 16,
    borderWidth: 1,
    padding: 8,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dropdownItemText: {
    fontSize: 14,
  },
  scrollContent: { paddingHorizontal: 10 },
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
    paddingHorizontal: 5,
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
  donutInner: {
    position: "absolute",
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
  dayCardWrapper: {
    borderRadius: 24,
    marginBottom: 16,
    overflow: "hidden",
  },
  dayCardTop: {
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    position: "relative",
  },
  dayCardLabel: {
    fontSize: 13,
    fontFamily: "Fredoka-Bold",
  },
  dayCardTitle: {
    fontSize: 25,
    fontFamily: "Frederick",
  },
  scoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scoreText: {
    fontSize: 12,
    fontFamily: "Fredoka-Bold",
  },
  dayDoodle: {
    opacity: 0.8,
  },
  dayEntries: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  entryItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 16,
  },
  entryOrb: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  entryTitle: {
    fontSize: 15,
    fontFamily: "Fredoka-Bold",
    marginBottom: 2,
    flex: 1,
  },
  entryTime: {
    fontSize: 12,
    fontFamily: "Fredoka-Bold",
    marginLeft: 8,
  },
  entryDesc: {
    fontSize: 13,
    fontFamily: "Fredoka-Regular",
    marginBottom: 6,
    lineHeight: 18,
  },
  entryTagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  entryTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  entryTagText: {
    fontSize: 11,
    fontFamily: "Fredoka-Bold",
  },
});
