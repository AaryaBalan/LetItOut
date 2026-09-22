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
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path, Text as SvgText, G, Defs, LinearGradient, Stop } from "react-native-svg";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import Loading from "../../components/Loading";
import { db } from "../../config/firebase";
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, orderBy, limit } from "firebase/firestore";
import { MOOD_OPTIONS } from "../../components/MoodSelector";
import { analyzeActivityCausality } from "../../utils/algorithms/moodCausality";

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
    const q = query(
      collection(db, "moodEntries"), 
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(2000)
    );
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
          key,
          label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          dateStr: d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" }),
          entries: [],
          avg: 0,
          happyCount: 0,
          sadCount: 0
        };
      }
      byDay[key].entries.push(e);
      if (e.moodType === 'amazing' || e.moodType === 'good') byDay[key].happyCount++;
      if (e.moodType === 'awful' || e.moodType === 'bad') byDay[key].sadCount++;
    });

    const sortedKeys = Object.keys(byDay).sort();

    let topPos = null;
    let topChal = null;

    sortedKeys.forEach((key) => {
      const day = byDay[key];
      day.avg = day.entries.reduce((sum, e) => sum + (e.moodScore || 0), 0) / day.entries.length;
      
      if (!topPos) {
        topPos = day;
      } else {
        if (day.avg > topPos.avg) {
          topPos = day;
        } else if (day.avg === topPos.avg) {
          if (day.happyCount > topPos.happyCount) {
            topPos = day;
          } else if (day.happyCount === topPos.happyCount && day.key > topPos.key) {
            topPos = day;
          }
        }
      }

      if (!topChal) {
        topChal = day;
      } else {
        if (day.avg < topChal.avg) {
          topChal = day;
        } else if (day.avg === topChal.avg) {
          if (day.sadCount > topChal.sadCount) {
            topChal = day;
          } else if (day.sadCount === topChal.sadCount && day.key > topChal.key) {
            topChal = day;
          }
        }
      }
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

  const causalInsights = useMemo(() => {
    return analyzeActivityCausality(entries);
  }, [entries]);

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

  const renderDonut = () => {
    let currentAngle = -Math.PI / 2;

    const createPieSlice = (cx, cy, r, startAngle, sliceAngle) => {
      if (sliceAngle === 0) return "";
      if (sliceAngle >= 2 * Math.PI - 0.001) {
        return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r}`;
      }
      const endAngle = startAngle + sliceAngle;
      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;
      return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
    };

    return (
      <View style={styles.donutMock}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100">
          <Circle cx="50" cy="50" r="50" fill={theme.isDark ? "#2A2A2A" : "#E5E7EB"} />
          {breakdown.map((slice) => {
            if (slice.rawPct === 0) return null;
            const sliceAngle = slice.rawPct * 2 * Math.PI;
            const pathData = createPieSlice(50, 50, 50, currentAngle, sliceAngle);
            currentAngle += sliceAngle;
            
            return (
              <Path
                key={slice.label}
                d={pathData}
                fill={slice.color}
              />
            );
          })}
        </Svg>
      </View>
    );
  };

  const renderLineChart = () => {
    const validPoints = lineChartData.map((val, i) => ({ val, i }));
    if (validPoints.length === 0) return null;

    const isDense = validPoints.length > 40;
    let pointSpacing = 60;
    if (validPoints.length > 40) pointSpacing = 20;
    if (validPoints.length > 90) pointSpacing = 10;
    if (validPoints.length > 180) pointSpacing = 6;
    
    const screenWidth = Dimensions.get('window').width;
    const minChartWidth = screenWidth - 36;
    const chartWidth = Math.max(minChartWidth, validPoints.length * pointSpacing);

    const xMin = 8;
    const xMax = chartWidth - 8;

    let pathD = "";
    validPoints.forEach((p, idx) => {
      const x = xMin + (p.i * ((xMax - xMin) / Math.max(1, validPoints.length - 1)));
      // Map val (-10 to 10) to y (90 to 10): ratio is (val + 10)/20
      const ratio = (p.val + 10) / 20;
      const y = 90 - (ratio * 80);
      pathD += idx === 0 ? `M${x},${y}` : ` L${x},${y}`;
    });

    const lastX = xMin + ((validPoints.length - 1) * ((xMax - xMin) / Math.max(1, validPoints.length - 1)));
    let fillD = pathD + ` L${lastX},100 L${xMin},100 Z`;
    if (validPoints.length === 1) fillD = "";

    return (
      <View style={[styles.lineChartWrapper, { marginHorizontal: -16 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Svg height="130" width={chartWidth} viewBox={`0 0 ${chartWidth} 130`}>
            <Defs>
              <LinearGradient id="lineGrad" x1="0" y1="10" x2="0" y2="90" gradientUnits="userSpaceOnUse">
                <Stop offset="0" stopColor="#66BB6A" />
                <Stop offset="0.35" stopColor="#66BB6A" />
                <Stop offset="0.5" stopColor="#FFCA28" />
                <Stop offset="0.65" stopColor="#FF6B6B" />
                <Stop offset="1" stopColor="#FF6B6B" />
              </LinearGradient>
              <LinearGradient id="fillGrad" x1="0" y1="10" x2="0" y2="100" gradientUnits="userSpaceOnUse">
                <Stop offset="0" stopColor="rgba(102, 187, 106, 0.3)" />
                <Stop offset="0.35" stopColor="rgba(102, 187, 106, 0.2)" />
                <Stop offset="0.5" stopColor="rgba(255, 202, 40, 0.15)" />
                <Stop offset="0.65" stopColor="rgba(255, 107, 107, 0.15)" />
                <Stop offset="1" stopColor="rgba(255, 107, 107, 0.15)" />
              </LinearGradient>
            </Defs>
            {fillD ? <Path d={fillD} fill="url(#fillGrad)" /> : null}
            <Path d={pathD} fill="none" stroke="url(#lineGrad)" strokeWidth={isDense ? "2.5" : "4"} strokeLinecap="round" strokeLinejoin="round" />
            {!isDense && validPoints.map((p) => {
              const x = xMin + (p.i * ((xMax - xMin) / Math.max(1, validPoints.length - 1)));
              const ratio = (p.val + 10) / 20;
              const y = 90 - (ratio * 80);

              let circleColor = "#FFCA28";
              if (p.val > 0) circleColor = "#66BB6A";
              else if (p.val < 0) circleColor = "#FF6B6B";

              return (
                <Circle key={p.i} cx={x} cy={y} r="5" fill={theme.card} stroke={circleColor} strokeWidth="3" />
              );
            })}
          </Svg>
        </ScrollView>
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
            <Ionicons name="sparkles-outline" size={24} color="#8B5CF6" />
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
          
          {loading ? (
             <View style={{ height: 130, justifyContent: "center", alignItems: "center" }}>
               <Loading size="large" text="Loading insights..." />
             </View>
          ) : last7DaysEntries.length > 0 ? renderLineChart() : (
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

        {/* MoodCausal-AI™ Habit Patterns */}
        {causalInsights.hasEnoughData && (
          <View style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, marginTop: 12 }]}>
            <View style={styles.chartHeader}>
              <Text style={[styles.chartTitle, { color: theme.text }]}>MoodCausal-AI™ Habit Patterns</Text>
              <Ionicons name="git-network-outline" size={22} color="#10B981" />
            </View>
            <Text style={{ fontSize: 13, fontFamily: "Fredoka-Regular", color: theme.textSecondary, marginBottom: 14 }}>
              Lagged cross-correlation identifying which daily habits lift or suppress your mood 24-48h later.
            </Text>

            {/* Catalysts */}
            {causalInsights.catalysts.length > 0 && (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontFamily: "Fredoka-Bold", color: "#10B981", textTransform: "uppercase", marginBottom: 6 }}>
                  🌟 Mood Catalysts (Lifting Habits)
                </Text>
                {causalInsights.catalysts.map(item => (
                  <View key={item.tag} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: theme.input, padding: 10, borderRadius: 12, marginBottom: 6 }}>
                    <Text style={{ fontSize: 14, fontFamily: "Fredoka-Bold", color: theme.text, textTransform: "capitalize" }}>{item.tag}</Text>
                    <Text style={{ fontSize: 13, fontFamily: "Fredoka-Bold", color: "#10B981" }}>
                      {item.nextDayLift > 0 ? `+${item.nextDayLift} next-day` : `Avg ${item.avgScore > 0 ? '+' : ''}${item.avgScore}`}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Triggers */}
            {causalInsights.triggers.length > 0 && (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontFamily: "Fredoka-Bold", color: "#EF4444", textTransform: "uppercase", marginBottom: 6 }}>
                  ⚠️ Vulnerability Triggers
                </Text>
                {causalInsights.triggers.map(item => (
                  <View key={item.tag} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: theme.input, padding: 10, borderRadius: 12, marginBottom: 6 }}>
                    <Text style={{ fontSize: 14, fontFamily: "Fredoka-Bold", color: theme.text, textTransform: "capitalize" }}>{item.tag}</Text>
                    <Text style={{ fontSize: 13, fontFamily: "Fredoka-Bold", color: "#EF4444" }}>
                      {item.nextDayLift < 0 ? `${item.nextDayLift} drop` : `Avg ${item.avgScore}`}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Circadian Rhythm */}
            {causalInsights.circadianSummary && (
              <View style={{ backgroundColor: theme.input, padding: 12, borderRadius: 14, marginTop: 4 }}>
                <Text style={{ fontSize: 12, fontFamily: "Fredoka-Bold", color: theme.textSecondary }}>🕒 Circadian Rhythm Pattern</Text>
                <Text style={{ fontSize: 13, fontFamily: "Fredoka-Regular", color: theme.text, marginTop: 4 }}>
                  Peak emotional resilience occurs on <Text style={{ fontFamily: "Fredoka-Bold", color: "#10B981" }}>{causalInsights.circadianSummary.peakDay}s</Text>, while vulnerability tends to dip on <Text style={{ fontFamily: "Fredoka-Bold", color: "#EF4444" }}>{causalInsights.circadianSummary.vulnerabilityDay}s</Text>.
                </Text>
              </View>
            )}
          </View>
        )}

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
