/**
 * ReframingScore™ (CBT Perspective Quality Metric)
 * 
 * Evaluates comments against original posts:
 * 1. Detects Cognitive Distortions in the post (Catastrophizing, Polarization, Negative Self-Labeling, Overgeneralization).
 * 2. Analyzes whether the comment addresses the distortion with constructive perspective-shifting, self-compassion, and agency.
 * 3. Penalizes toxic positivity or dismissive clichés ("just smile", "cheer up", "it's not that deep").
 * 4. Generates a Reframing Quality Index (0 to 100) and cognitive badge category.
 */

// Common cognitive distortion regex patterns
const DISTORTION_PATTERNS = {
  catastrophizing: [
    /\b(ruined|life is over|never get better|never be happy|can't go on|end of the world|everything is broken)\b/i,
    /\b(worst thing ever|hopeless|no point)\b/i
  ],
  polarization: [
    /\b(always|never|every single time|everyone hates me|nobody cares|complete disaster|total failure)\b/i
  ],
  selfLabeling: [
    /\b(i('?m| am) (a )?(loser|failure|worthless|stupid|ugly|useless|pathetic|broken|unlovable|burden))\b/i
  ],
  overgeneralization: [
    /\b(nothing ever works|nothing goes right|always happens to me|everyone else is happy)\b/i
  ]
};

// Constructive reframing and empathetic validation indicators in comments
const REFRAMING_PATTERNS = [
  /\b(one (test|mistake|day|moment) doesn't (define|mean)|not your fault|proud of you for)\b/i,
  /\b(give yourself (credit|grace|time)|step by step|take a breath|be gentle with yourself)\b/i,
  /\b(what helped me was|i went through something similar|when i felt that way|you are not alone)\b/i,
  /\b(reframe|another way to look at|remember that you|your feelings are valid)\b/i,
  /\b(focus on what you can control|break it down|tomorrow is a fresh|you have overcome)\b/i
];

// Toxic positivity or dismissive phrases that get penalized
const DISMISSIVE_PATTERNS = [
  /\b(just (smile|be happy|get over it|cheer up|stop crying))\b/i,
  /\b(it('?s| is) not that deep|first world problems|stop overreacting|could be worse)\b/i,
  /\b(everything happens for a reason|just think positive)\b/i
];

/**
 * Identifies cognitive distortions present in the post text
 * @param {string} postText 
 * @returns {Array<string>} - List of detected distortions
 */
export function detectDistortions(postText) {
  if (!postText || typeof postText !== 'string') return [];
  const text = postText.toLowerCase();
  const detected = [];

  for (const [distortion, patterns] of Object.entries(DISTORTION_PATTERNS)) {
    if (patterns.some(p => p.test(text))) {
      detected.push(distortion);
    }
  }
  return detected;
}

/**
 * Computes Cognitive Reframing Index (CRI) for a comment
 * @param {string} commentText - The text of the comment
 * @param {string} postText - The text of the original post
 * @param {number} [perspectiveRatingDelta=0] - Optional author rating shift delta (+/-)
 * @returns {Object} - { score: number, quality: string, badge: string|null, isReframing: boolean }
 */
export function computeReframingScore(commentText, postText = "", perspectiveRatingDelta = 0) {
  if (!commentText || typeof commentText !== 'string') {
    return { score: 0, quality: "None", badge: null, isReframing: false };
  }

  const commentLower = commentText.toLowerCase().trim();
  const distortionsInPost = detectDistortions(postText);
  let score = 30; // Baseline for any comment

  // 1. Check length & depth (thoughtful comments are rarely < 4 words)
  const wordCount = commentLower.split(/\s+/).length;
  if (wordCount >= 12) score += 15;
  if (wordCount >= 25) score += 10;
  if (wordCount < 4) score -= 15;

  // 2. Reframing & Empathy bonuses
  let reframingMatches = 0;
  REFRAMING_PATTERNS.forEach(pattern => {
    if (pattern.test(commentLower)) {
      reframingMatches++;
      score += 15;
    }
  });

  // 3. Distortion alignment bonus
  // If the post had catastrophizing or self-labeling and the comment directly provided grounding/perspective
  if (distortionsInPost.length > 0 && reframingMatches > 0) {
    score += 15;
  }

  // 4. Toxic Positivity Penalty
  DISMISSIVE_PATTERNS.forEach(pattern => {
    if (pattern.test(commentLower)) {
      score -= 35;
    }
  });

  // 5. Incorporate author's subjective perspective shift delta (if available from my-center)
  if (perspectiveRatingDelta > 0) {
    score += Math.min(30, perspectiveRatingDelta * 0.4);
  } else if (perspectiveRatingDelta < 0) {
    score -= Math.min(20, Math.abs(perspectiveRatingDelta) * 0.3);
  }

  // Normalize between 0 and 100
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));

  let quality = "Supportive";
  let badge = null;
  let isReframing = false;

  if (normalizedScore >= 75) {
    quality = "Perspective Catalyst";
    badge = "💡 Perspective Shift";
    isReframing = true;
  } else if (normalizedScore >= 60) {
    quality = "Empathetic Reframe";
    badge = "🌟 Insightful Reframe";
    isReframing = true;
  } else if (normalizedScore >= 45) {
    quality = "Gentle Comfort";
    badge = null;
    isReframing = false;
  } else {
    quality = "Casual";
    badge = null;
    isReframing = false;
  }

  return {
    score: normalizedScore,
    quality,
    badge,
    isReframing,
    distortionsAddressed: distortionsInPost
  };
}
