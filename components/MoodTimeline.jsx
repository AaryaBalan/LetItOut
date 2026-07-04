import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { MOOD_OPTIONS } from "./MoodSelector";

export default function MoodTimeline({ entries = [], onDayPress }) {
  const { theme } = useTheme();

  const getMoodColor = (moodType) => {
    const mood = MOOD_OPTIONS.find((m) => m.id === moodType);
    return mood ? mood.color : "#E5E7EB";
  };

  const getMoodIcon = (moodType) => {
    const mood = MOOD_OPTIONS.find((m) => m.id === moodType);
    return mood ? mood.icon : "";
  };

  return (
    <View style={styles.container}>
      {entries.map((day, idx) => (
        <View
          key={idx}
          style={[
            styles.dayColumn,
            day.isToday && styles.activeDayColumn,
            day.isToday && {
              backgroundColor: theme.isDark ? "#2D2D2D" : "#F3EEFF",
              borderColor: "#8B7CFF",
            },
          ]}
        >
          <Text
            style={[
              styles.dayLabel,
              { color: day.isToday ? "#8B7CFF" : theme.textSecondary },
            ]}
          >
            {day.dayLabel}
          </Text>
          <Text
            style={[
              styles.dateLabel,
              { color: day.isToday ? "#8B7CFF" : theme.textTertiary },
            ]}
          >
            {day.dateLabel}
          </Text>

          {day.moodType ? (
            <View
              style={[
                styles.emojiCircle,
                { backgroundColor: getMoodColor(day.moodType) + "30" }, // Light background
              ]}
            >
              <MaterialCommunityIcons name={getMoodIcon(day.moodType)} size={22} color={getMoodColor(day.moodType)} />
            </View>
          ) : (
            <View
              style={[
                styles.emptyCircle,
                { backgroundColor: theme.isDark ? "#2D2D2D" : "#F3F4F6" },
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayColumn: {
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "transparent",
    minWidth: 44,
  },
  activeDayColumn: {
    borderWidth: 1,
  },
  dayLabel: {
    fontSize: 13,
    fontFamily: "Fredoka-Bold",
    marginBottom: 4,
  },
  dateLabel: {
    fontSize: 11,
    fontFamily: "Fredoka-Regular",
    marginBottom: 12,
  },
  emojiCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  emptyCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
});
