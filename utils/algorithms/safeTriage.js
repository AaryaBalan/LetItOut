/**
 * SafeTriage™ Dynamic Psychological Distress & Urgency Feed Ranker
 * 
 * Balances:
 * 1. Urgency Multiplier U(i): Initial distress (feelPercentage < 0) + helpNeeded flag + acute language markers.
 * 2. Empathy Deficit D_empathy(i, t): Exponential boost for posts that have received zero or very few hugs/comments.
 * 3. Gravity Temporal Decay: Smooth time-decay so older, resolved posts gracefully lower down the feed.
 */

// Critical distress phrases that trigger gentle safety resources
const CRISIS_PATTERNS = [
  /\b(suicid|kill myself|end it all|want to die|don't want to live|no reason to live|take my own life)\b/i,
  /\b(can't do this anymore|better off without me|nobody would care if i (died|disappeared))\b/i,
  /\b(self harm|cutting myself|hurt myself)\b/i
];

/**
 * Checks whether a post contains acute crisis distress markers
 * @param {string} text - Title and description of post
 * @returns {boolean}
 */
export function detectCrisisDistress(text) {
  if (!text || typeof text !== 'string') return false;
  return CRISIS_PATTERNS.some(regex => regex.test(text));
}

/**
 * Computes the dynamic SafeTriage ranking score for a post
 * @param {Object} post - The post object
 * @returns {number} - Higher score = Higher placement in feed
 */
export function calculateSafeTriageRank(post) {
  if (!post) return 0;

  const now = Date.now();
  let postTime = now;
  if (post.createdAtDate instanceof Date && !isNaN(post.createdAtDate.getTime())) {
    postTime = post.createdAtDate.getTime();
  } else if (post.createdAt) {
    if (typeof post.createdAt === 'object' && post.createdAt.seconds) {
      postTime = post.createdAt.seconds * 1000;
    } else {
      const parsed = new Date(post.createdAt).getTime();
      if (!isNaN(parsed)) postTime = parsed;
    }
  }

  // Hours elapsed (capped at minimum 3 minutes to avoid divide-by-zero on brand-new posts)
  const hoursElapsed = Math.max(0.05, (now - postTime) / (1000 * 60 * 60));

  // 1. Urgency Coefficient U(i)
  const feel = Number(post.feelPercentage ?? 0);
  const negativeDistress = feel < 0 ? Math.abs(feel) / 100 : 0; // 0.0 to 1.0
  let urgency = 1.0 + Math.pow(negativeDistress, 2) * 2.5;

  if (post.helpNeeded) {
    urgency += 2.0;
  }

  // Linguistic distress booster (e.g. phrases indicating acute sadness / loneliness)
  const content = `${post.title || ""} ${post.description || ""}`.toLowerCase();
  if (detectCrisisDistress(content)) {
    urgency += 3.5;
  } else if (content.includes("lonely") || content.includes("crying") || content.includes("hopeless") || content.includes("panic")) {
    urgency += 1.0;
  }

  // 2. Empathy Deficit D_empathy(i, t)
  // Counts hugs (weighted 1.5x) and comments (weighted 2.0x)
  const hugs = post.reactions?.hug || 0;
  const commentsCount = post.comments?.length || post.commentCount || 0;
  const supports = post.reactions?.support || post.reactionCount || 0;

  const totalEmpathyReceived = (hugs * 1.5) + (commentsCount * 2.0) + (supports * 0.5);

  // When empathy received is 0, deficit is 1.0 (Maximum boost)
  // When empathy received reaches ~4-6, deficit drops toward ~0.2
  const empathyDeficit = Math.exp(-totalEmpathyReceived / 4.0);

  // 3. Gravity Decay
  const gravity = 1.25;
  const denominator = Math.pow(hoursElapsed + 1.5, gravity);

  // 4. Combined SafeTriage Score
  const score = (urgency * (1.0 + 3.0 * empathyDeficit)) / denominator;

  return score;
}
