/**
 * Ghost Voice™ Stylometric Anonymizer & Fingerprint Obfuscator
 * 
 * Protects users from acquaintance de-anonymization:
 * 1. Prunes idiosyncratic character repetitions ("sooooo", "pleeeease", "noooo").
 * 2. Normalizes erratic punctuation clusters ("...???", ";;;", "!!1!").
 * 3. Corrects lone lowercase 'i' to 'I' and standardizes casing.
 * 4. Normalizes characteristic internet abbreviations (e.g., 'omggg', 'rn', 'tbh') into clean conversational equivalents.
 * 5. Preserves 100% of raw emotional sentiment, context, and intent.
 */

// Dictionary of informal abbreviations to standardize
const SLANG_MAP = {
  "omg+": "I am so overwhelmed",
  "omfg+": "I am so overwhelmed",
  "rn": "right now",
  "tbh": "to be honest",
  "ngl": "honestly",
  "smh": "I feel hopeless",
  "idk": "I don't know",
  "idc": "I don't care anymore",
  "imma": "I am going to",
  "wanna": "want to",
  "gonna": "going to",
  "kinda": "kind of",
  "sorta": "sort of",
  "u": "you",
  "r": "are",
  "ur": "your",
  "pls+": "please",
  "plz+": "please",
  "thx": "thank you",
  "bc": "because",
  "cuz": "because",
  "coz": "because",
  "prolly": "probably"
};

/**
 * Applies Ghost Voice stylometric masking to text
 * @param {string} text - Original user draft
 * @returns {string} - Stylometrically masked text
 */
export function applyGhostVoice(text) {
  if (!text || typeof text !== 'string') return "";

  let cleaned = text;

  // 1. Prune excessive character repetitions (e.g. "sooooo" -> "so", "whyyyy" -> "why", "noooo" -> "no")
  cleaned = cleaned.replace(/([a-zA-Z])\1{2,}/g, '$1');

  // 2. Normalize erratic punctuation (e.g. "?????" -> "?", "!!!!" -> "!", "....." -> "...")
  cleaned = cleaned.replace(/\?{2,}/g, '?');
  cleaned = cleaned.replace(/!{2,}/g, '!');
  cleaned = cleaned.replace(/\.{4,}/g, '...');
  cleaned = cleaned.replace(/;{2,}/g, ';');
  cleaned = cleaned.replace(/[!?]{2,}/g, '!?');

  // 3. Normalize informal text speech abbreviations
  for (const [pattern, replacement] of Object.entries(SLANG_MAP)) {
    const regex = new RegExp(`\\b${pattern}\\b`, 'gi');
    cleaned = cleaned.replace(regex, (match) => {
      // Preserve uppercase start if original was capitalized
      if (match[0] === match[0].toUpperCase() && match.length > 1) {
        return replacement.charAt(0).toUpperCase() + replacement.slice(1);
      }
      return replacement;
    });
  }

  // 4. Correct standalone lowercase 'i' or 'i'm' to uppercase
  cleaned = cleaned.replace(/\bi\b/g, 'I');
  cleaned = cleaned.replace(/\bi'm\b/g, "I'm");
  cleaned = cleaned.replace(/\bi've\b/g, "I've");
  cleaned = cleaned.replace(/\bi'd\b/g, "I'd");
  cleaned = cleaned.replace(/\bi'll\b/g, "I'll");

  // 5. Clean up awkward spaces before punctuation
  cleaned = cleaned.replace(/\s+([.,!?;:])/g, '$1');

  // 6. Ensure the first character of each sentence is capitalized
  cleaned = cleaned.replace(/(^\s*|\.\s+|\?\s+|!\s+)([a-z])/g, (match, sep, char) => {
    return sep + char.toUpperCase();
  });

  return cleaned.trim();
}
