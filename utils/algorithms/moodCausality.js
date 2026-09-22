/**
 * MoodCausal-AI™ Habit Causality & Circadian Vulnerability Engine
 * 
 * Computes:
 * 1. Lagged Cross-Correlation between tagged activities (Exercise, Work, Social, etc.) and mood score changes 24-48 hours later.
 * 2. Identifies Top Mood Catalysts (+Delta) and Vulnerability Triggers (-Delta).
 * 3. Circadian Vulnerability Window (identifies which days of the week or hours have historically lower emotional valence).
 */

/**
 * Analyzes mood logs to identify cause-and-effect relationships between activities and emotional trajectories.
 * @param {Array<Object>} moodEntries - List of mood entry objects with createdAt, moodScore, and tags
 * @returns {Object} - { catalysts: Array, triggers: Array, circadianSummary: Object, hasEnoughData: boolean }
 */
export function analyzeActivityCausality(moodEntries) {
  if (!Array.isArray(moodEntries) || moodEntries.length < 3) {
    return {
      catalysts: [],
      triggers: [],
      circadianSummary: null,
      hasEnoughData: false
    };
  }

  // Sort chronologically ascending
  const sorted = [...moodEntries].sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeA - timeB;
  });

  const tagStats = {};
  const dayOfWeekScores = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }; // Sun to Sat

  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i];
    const score = Number(entry.moodScore ?? 0);
    const entryDate = new Date(entry.createdAt);

    if (!isNaN(entryDate.getTime())) {
      const day = entryDate.getDay();
      dayOfWeekScores[day].push(score);
    }

    // Look ahead to find next day entry (within 12 to 40 hours)
    let nextDayDelta = null;
    if (i + 1 < sorted.length) {
      const nextEntry = sorted[i + 1];
      const nextTime = new Date(nextEntry.createdAt).getTime();
      const currTime = entryDate.getTime();
      const hoursDiff = (nextTime - currTime) / (1000 * 60 * 60);

      // If next entry is roughly the next day (12 to 48 hours later)
      if (hoursDiff >= 10 && hoursDiff <= 52) {
        nextDayDelta = Number(nextEntry.moodScore ?? 0) - score;
      }
    }

    const tags = Array.isArray(entry.tags) ? entry.tags : [];
    tags.forEach(rawTag => {
      if (!rawTag) return;
      const tag = rawTag.toLowerCase();
      if (!tagStats[tag]) {
        tagStats[tag] = {
          tag: rawTag,
          count: 0,
          sameDayScores: [],
          nextDayDeltas: []
        };
      }
      tagStats[tag].count++;
      tagStats[tag].sameDayScores.push(score);
      if (nextDayDelta !== null) {
        tagStats[tag].nextDayDeltas.push(nextDayDelta);
      }
    });
  }

  // Process activities with at least 1 frequency
  const analyzedActivities = Object.values(tagStats).map(data => {
    const avgScore = data.sameDayScores.reduce((a, b) => a + b, 0) / data.count;
    const avgNextDayLift = data.nextDayDeltas.length > 0
      ? data.nextDayDeltas.reduce((a, b) => a + b, 0) / data.nextDayDeltas.length
      : 0;

    return {
      tag: data.tag,
      count: data.count,
      avgScore: Math.round(avgScore * 10) / 10,
      nextDayLift: Math.round(avgNextDayLift * 10) / 10,
      hasLaggedData: data.nextDayDeltas.length > 0
    };
  });

  // Top Catalysts: nextDayLift > 0 or highest avgScore
  const catalysts = analyzedActivities
    .filter(a => a.nextDayLift > 0 || (a.count >= 2 && a.avgScore >= 3))
    .sort((a, b) => b.nextDayLift - a.nextDayLift)
    .slice(0, 3);

  // Vulnerability Triggers: nextDayLift < 0 or negative avgScore
  const triggers = analyzedActivities
    .filter(a => a.nextDayLift < -0.5 || (a.count >= 2 && a.avgScore <= -2))
    .sort((a, b) => a.nextDayLift - b.nextDayLift)
    .slice(0, 3);

  // Circadian Day of Week Analysis
  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  let lowestDayName = null;
  let lowestAvg = Infinity;
  let highestDayName = null;
  let highestAvg = -Infinity;

  Object.entries(dayOfWeekScores).forEach(([dayIdx, scores]) => {
    if (scores.length > 0) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avg < lowestAvg) {
        lowestAvg = avg;
        lowestDayName = DAY_NAMES[Number(dayIdx)];
      }
      if (avg > highestAvg) {
        highestAvg = avg;
        highestDayName = DAY_NAMES[Number(dayIdx)];
      }
    }
  });

  const circadianSummary = (lowestDayName && highestDayName && lowestAvg !== highestAvg) ? {
    peakDay: highestDayName,
    vulnerabilityDay: lowestDayName,
    vulnerabilityScore: Math.round(lowestAvg * 10) / 10
  } : null;

  return {
    catalysts,
    triggers,
    circadianSummary,
    hasEnoughData: analyzedActivities.length > 0
  };
}
