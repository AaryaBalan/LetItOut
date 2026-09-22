import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { rewardCopingIntervention } from "../utils/algorithms/copingBandit";

/**
 * Interactive Coping Modal
 * Provides 60-90 second guided micro-interventions (Box breathing, Grounding, Self-compassion)
 */
export default function CopingModal({ visible, intervention, onClose }) {
  const { theme } = useTheme();

  // Breathing state
  const [phaseIndex, setPhaseIndex] = useState(0); // 0=Inhale, 1=Hold, 2=Exhale, 3=Hold
  const circleScale = useRef(new Animated.Value(1)).current;
  const breathTimer = useRef(null);

  // Grounding state
  const [groundingStep, setGroundingStep] = useState(0);

  const PHASES = [
    { text: "Inhale slowly...", duration: 4000, targetScale: 1.4 },
    { text: "Hold gently...", duration: 4000, targetScale: 1.4 },
    { text: "Exhale completely...", duration: 4000, targetScale: 1.0 },
    { text: "Rest & Hold...", duration: 4000, targetScale: 1.0 },
  ];

  const GROUNDING_ITEMS = [
    { label: "Look around and spot 5 things you can see", icon: "eye-outline" },
    { label: "Acknowledge 4 things you can physically touch", icon: "hand-left-outline" },
    { label: "Listen carefully for 3 distinct sounds around you", icon: "volume-medium-outline" },
    { label: "Notice 2 scents or take two deep fresh breaths", icon: "flower-outline" },
    { label: "Say 1 kind, forgiving sentence to yourself right now", icon: "heart-outline" },
  ];

  useEffect(() => {
    if (!visible || !intervention) return;

    if (intervention.id === "box_breathing") {
      let currentIdx = 0;
      setPhaseIndex(0);

      const runCycle = () => {
        const phase = PHASES[currentIdx];
        Animated.timing(circleScale, {
          toValue: phase.targetScale,
          duration: phase.duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }).start();

        breathTimer.current = setTimeout(() => {
          currentIdx = (currentIdx + 1) % 4;
          setPhaseIndex(currentIdx);
          runCycle();
        }, phase.duration);
      };

      runCycle();

      return () => {
        if (breathTimer.current) clearTimeout(breathTimer.current);
      };
    }
  }, [visible, intervention]);

  if (!intervention) return null;

  const handleFinish = (feltRelief = true) => {
    rewardCopingIntervention(intervention.id, feltRelief);
    if (onClose) onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => handleFinish(false)}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleGroup}>
              <View style={[styles.iconWrap, { backgroundColor: intervention.color + "22" }]}>
                <Ionicons name={intervention.icon} size={20} color={intervention.color} />
              </View>
              <View>
                <Text style={[styles.title, { color: theme.text }]}>{intervention.title}</Text>
                <Text style={[styles.tagline, { color: theme.textSecondary }]}>
                  {intervention.tagline} • {intervention.duration}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => handleFinish(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Intervention Content */}
          {intervention.id === "box_breathing" && (
            <View style={styles.breathingContainer}>
              <Animated.View
                style={[
                  styles.breathingOrb,
                  {
                    backgroundColor: intervention.color + "25",
                    borderColor: intervention.color,
                    transform: [{ scale: circleScale }],
                  },
                ]}
              >
                <Ionicons name="pulse" size={32} color={intervention.color} />
              </Animated.View>
              <Text style={[styles.phaseText, { color: theme.text }]}>
                {PHASES[phaseIndex].text}
              </Text>
              <Text style={[styles.phaseSubtext, { color: theme.textSecondary }]}>
                4 seconds rhythm • Calming your vagus nerve
              </Text>
            </View>
          )}

          {intervention.id === "grounding_54321" && (
            <ScrollView showsVerticalScrollIndicator={false} style={styles.groundingScroll}>
              <Text style={[styles.instructionText, { color: theme.textSecondary }]}>
                Tap each step as you notice it to anchor your mind back into the present:
              </Text>
              {GROUNDING_ITEMS.map((item, idx) => {
                const isCompleted = idx <= groundingStep;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.checklistRow,
                      {
                        backgroundColor: isCompleted
                          ? (theme.isDark ? "#172A22" : "#ECFDF5")
                          : theme.card,
                        borderColor: isCompleted ? "#10B981" : theme.border,
                      },
                    ]}
                    onPress={() => setGroundingStep(Math.max(groundingStep, idx + 1))}
                  >
                    <Ionicons
                      name={isCompleted ? "checkmark-circle" : item.icon}
                      size={20}
                      color={isCompleted ? "#10B981" : theme.textSecondary}
                    />
                    <Text
                      style={[
                        styles.checklistText,
                        {
                          color: isCompleted ? (theme.isDark ? "#A7F3D0" : "#065F46") : theme.text,
                          textDecorationLine: isCompleted ? "line-through" : "none",
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {intervention.id === "compassion_reframe" && (
            <View style={styles.compassionContainer}>
              <View style={[styles.quoteBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={28} color="#F59E0B" />
                <Text style={[styles.quoteText, { color: theme.text }]}>
                  "{intervention.description}"
                </Text>
              </View>
              <Text style={[styles.compassionReminder, { color: theme.textSecondary }]}>
                Take 3 slow breaths and remind yourself: You are allowed to be imperfect. You are worthy of love right now.
              </Text>
            </View>
          )}

          {/* Action Footer */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: intervention.color }]}
              onPress={() => handleFinish(true)}
            >
              <Ionicons name="sparkles" size={16} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>I feel a bit calmer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.skipBtn, { borderColor: theme.border }]}
              onPress={() => handleFinish(false)}
            >
              <Text style={[styles.skipBtnText, { color: theme.textSecondary }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  titleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 17,
    fontFamily: "Fredoka-Bold",
  },
  tagline: {
    fontSize: 12,
    fontFamily: "Fredoka-Regular",
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  breathingContainer: {
    alignItems: "center",
    paddingVertical: 24,
  },
  breathingOrb: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  phaseText: {
    fontSize: 20,
    fontFamily: "Fredoka-Bold",
    textAlign: "center",
  },
  phaseSubtext: {
    fontSize: 13,
    fontFamily: "Fredoka-Regular",
    textAlign: "center",
    marginTop: 6,
  },
  groundingScroll: {
    maxHeight: 280,
    marginVertical: 8,
  },
  instructionText: {
    fontSize: 13,
    fontFamily: "Fredoka-Regular",
    marginBottom: 12,
  },
  checklistRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  checklistText: {
    fontSize: 13,
    fontFamily: "Fredoka-Regular",
    flex: 1,
  },
  compassionContainer: {
    paddingVertical: 12,
  },
  quoteBox: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 10,
  },
  quoteText: {
    fontSize: 15,
    fontFamily: "Fredoka-Bold",
    textAlign: "center",
    lineHeight: 22,
  },
  compassionReminder: {
    fontSize: 13,
    fontFamily: "Fredoka-Regular",
    textAlign: "center",
    marginTop: 14,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  primaryBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontFamily: "Fredoka-Bold",
    fontSize: 14,
  },
  skipBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  skipBtnText: {
    fontFamily: "Fredoka-Bold",
    fontSize: 14,
  },
});
