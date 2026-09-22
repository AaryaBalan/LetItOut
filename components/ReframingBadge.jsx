import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

/**
 * ReframingBadge component
 * Displays cognitive reframing indicators on impactful comments
 */
export default function ReframingBadge({ badge, quality, score }) {
  const { theme } = useTheme();

  if (!badge && !quality) return null;

  const isHighCatalyst = score >= 75 || quality === "Perspective Catalyst";
  const badgeText = badge || (isHighCatalyst ? "💡 Perspective Shift" : "🌟 Insightful Reframe");

  return (
    <View
      style={[
        styles.badgeContainer,
        {
          backgroundColor: isHighCatalyst
            ? (theme.isDark ? "#28233C" : "#EEF2FF")
            : (theme.isDark ? "#222D28" : "#ECFDF5"),
          borderColor: isHighCatalyst
            ? (theme.isDark ? "#6366F1" : "#818CF8")
            : (theme.isDark ? "#10B981" : "#34D399")
        }
      ]}
    >
      <Ionicons
        name={isHighCatalyst ? "bulb-outline" : "sparkles-outline"}
        size={12}
        color={isHighCatalyst ? "#6366F1" : "#10B981"}
      />
      <Text
        style={[
          styles.badgeLabel,
          {
            color: isHighCatalyst
              ? (theme.isDark ? "#C7D2FE" : "#4F46E5")
              : (theme.isDark ? "#A7F3D0" : "#059669")
          }
        ]}
      >
        {badgeText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: "flex-start",
    marginTop: 4,
    marginBottom: 4,
  },
  badgeLabel: {
    fontSize: 11,
    fontFamily: "Fredoka-Bold",
  }
});
