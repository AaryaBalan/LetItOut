let AsyncStorage = null;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage');
  if (AsyncStorage.default) AsyncStorage = AsyncStorage.default;
} catch (e) {
  // In-memory fallback for test environments or web
}

const memoryStorage = {};
const storageAdapter = {
  getItem: async (key) => {
    if (AsyncStorage && AsyncStorage.getItem) {
      return await AsyncStorage.getItem(key);
    }
    return memoryStorage[key] || null;
  },
  setItem: async (key, val) => {
    if (AsyncStorage && AsyncStorage.setItem) {
      return await AsyncStorage.setItem(key, val);
    }
    memoryStorage[key] = val;
  }
};

export const COPING_ARMS = {
  box_breathing: {
    id: "box_breathing",
    title: "4-4-4-4 Box Breathing",
    duration: "60 Seconds",
    tagline: "Nervous System Calming",
    icon: "water-outline",
    color: "#6366F1",
    description: "Inhale for 4 seconds, hold for 4, exhale for 4, and hold for 4 to immediately activate your parasympathetic calming response.",
    type: "breathing"
  },
  grounding_54321: {
    id: "grounding_54321",
    title: "5-4-3-2-1 Sensory Grounding",
    duration: "90 Seconds",
    tagline: "Anxiety & Panic De-escalation",
    icon: "leaf-outline",
    color: "#10B981",
    description: "Reconnect with the present moment by naming 5 things you see, 4 you can touch, 3 you hear, 2 you smell, and 1 kind thought.",
    type: "checklist"
  },
  compassion_reframe: {
    id: "compassion_reframe",
    title: "Friend's Perspective Reframe",
    duration: "60 Seconds",
    tagline: "Negative Self-Talk Reset",
    icon: "heart-outline",
    color: "#F59E0B",
    description: "If your dearest friend came to you with this exact feeling, what gentle words would you say to them? Now say them to yourself.",
    type: "prompt"
  }
};

const STORAGE_KEY = "LETITOUT_COPING_BANDIT_PRIORS_V1";

// Default Beta priors (alpha=success, beta=failure)
const DEFAULT_PRIORS = {
  box_breathing: { alpha: 2, beta: 1 },
  grounding_54321: { alpha: 2, beta: 1 },
  compassion_reframe: { alpha: 2, beta: 1 }
};

/**
 * Standard Beta distribution sampler using Johnk's generator or gamma ratio approximation
 */
function sampleBeta(alpha, beta) {
  // Box-Muller / Gamma approximation for Beta sampling
  const gamma = (a) => {
    let d = a - 1.0 / 3.0;
    let c = 1.0 / Math.sqrt(9.0 * d);
    while (true) {
      let z;
      do {
        z = Math.sqrt(-2.0 * Math.log(Math.max(1e-10, Math.random()))) * Math.cos(2.0 * Math.PI * Math.random());
      } while (1.0 + c * z <= 0);
      let v = Math.pow(1.0 + c * z, 3);
      let u = Math.random();
      if (u < 1.0 - 0.0331 * Math.pow(z, 4)) return d * v;
      if (Math.log(u) < 0.5 * Math.pow(z, 2) + d * (1.0 - v + Math.log(v))) return d * v;
    }
  };

  const x = gamma(alpha);
  const y = gamma(beta);
  return x / (x + y);
}

/**
 * Selects the optimal coping intervention using Thompson Sampling
 * @returns {Promise<Object>} The chosen coping intervention config
 */
export async function selectCopingIntervention() {
  let priors = DEFAULT_PRIORS;
  try {
    const saved = await storageAdapter.getItem(STORAGE_KEY);
    if (saved) {
      priors = { ...DEFAULT_PRIORS, ...JSON.parse(saved) };
    }
  } catch (err) {
    console.warn("Failed to load bandit priors:", err);
  }

  let bestArmId = "box_breathing";
  let maxSample = -Infinity;

  Object.keys(COPING_ARMS).forEach(armId => {
    const { alpha, beta } = priors[armId] || { alpha: 2, beta: 1 };
    const sample = sampleBeta(alpha, beta);
    if (sample > maxSample) {
      maxSample = sample;
      bestArmId = armId;
    }
  });

  return COPING_ARMS[bestArmId] || COPING_ARMS.box_breathing;
}

/**
 * Reinforces the bandit algorithm when the user completes or rates an intervention
 * @param {string} armId - ID of the intervention
 * @param {boolean} wasHelpful - Whether user felt relief or finished the exercise
 */
export async function rewardCopingIntervention(armId, wasHelpful) {
  if (!COPING_ARMS[armId]) return;

  try {
    let priors = DEFAULT_PRIORS;
    const saved = await storageAdapter.getItem(STORAGE_KEY);
    if (saved) {
      priors = { ...DEFAULT_PRIORS, ...JSON.parse(saved) };
    }

    if (!priors[armId]) {
      priors[armId] = { alpha: 2, beta: 1 };
    }

    if (wasHelpful) {
      priors[armId].alpha += 1;
    } else {
      priors[armId].beta += 1;
    }

    await storageAdapter.setItem(STORAGE_KEY, JSON.stringify(priors));
  } catch (err) {
    console.warn("Failed to update bandit priors:", err);
  }
}
