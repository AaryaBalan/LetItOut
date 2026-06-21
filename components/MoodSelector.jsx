import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const MOOD_OPTIONS = [
  { id: "amazing", label: "Amazing", icon: "emoticon-excited", color: "#66BB6A", bg: "#E8F5E9", darkBg: "#1B3A26" },
  { id: "good", label: "Good", icon: "emoticon-happy", color: "#FFC857", bg: "#FFF8E1", darkBg: "#3A3520" },
  { id: "okay", label: "Okay", icon: "emoticon-neutral", color: "#8B7CFF", bg: "#F3EEFF", darkBg: "#2A2540" },
  { id: "bad", label: "Bad", icon: "emoticon-sad", color: "#FF6B6B", bg: "#FFEBEE", darkBg: "#3A2020" },
  { id: "awful", label: "Awful", icon: "emoticon-angry", color: "#D32F2F", bg: "#FFCDD2", darkBg: "#3A1515" },
];

export { MOOD_OPTIONS };

export default function MoodSelector({ selected, onSelect, size = "normal" }) {
  const { theme } = useTheme();
  const isSmall = size === "small";

  return (
    <View style={styles.container}>
      {MOOD_OPTIONS.map((mood) => {
        const isSelected = selected === mood.id;
        return (
          <TouchableOpacity
            key={mood.id}
            style={[
              styles.card,
              isSmall && styles.cardSmall,
              {
                backgroundColor: theme.isDark ? '#1A1A1A' : '#FFFFFF',
                borderColor: theme.border,
              },
              isSelected && {
                borderColor: mood.color,
                backgroundColor: theme.isDark ? mood.darkBg : mood.bg,
              },
            ]}
            onPress={() => onSelect(mood.id)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons 
              name={mood.icon} 
              size={isSmall ? 26 : 38} 
              color={mood.color}
              style={[
                styles.iconMargin,
                isSelected && { transform: [{ scale: 1.15 }] }
              ]} 
            />
            <Text
              style={[
                styles.label,
                isSmall && styles.labelSmall,
                { color: isSelected ? mood.color : theme.textSecondary },
              ]}
            >
              {mood.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  card: {
    width: "18%",
    aspectRatio: 0.8,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    padding: 4,
  },
  cardSmall: {
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  iconMargin: {
    marginBottom: 8,
  },
  label: {
    fontSize: 10,
    fontFamily: "Fredoka-Bold",
  },
  labelSmall: {
    fontSize: 8,
  },
});
