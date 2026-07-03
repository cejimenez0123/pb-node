// utils/moderateContent.js
const Filter = require("bad-words");

const filter = new Filter();
filter.removeWords(
  "damn",
  "hell",
  "shit",
  "fuck",
  "fucking",
  "ass",
  "asshole",
  "bitch",
  "bastard",
  "crap",
  "piss",
  "dick",
  "cock",
  "prick",
  "douche",
  "goddamn",
  "bloody",
  "bugger",
  "twat"
);

// Keep this list focused on clear-cut terms: slurs, explicit sexual terms, obvious hate speech.
// Avoid ordinary words that trigger false positives (e.g. "kill" in "kill the lights").
const BLOCKED_TERMS = [
  // slurs and hate speech — fill in your actual list
  // explicit sexual terms
  // obvious harassment terms
];

const BLOCKED_PATTERNS = BLOCKED_TERMS.map(
  (term) => new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i")
);

function checkContent(text) {
  if (!text || !text.trim()) {
    return { flagged: false };
  }
  const flagged = filter.isProfane(text);
    //   const normalized = text.toLowerCase();
    //   const matched = BLOCKED_PATTERNS.find((pattern) => pattern.test(normalized));

  return {
    flagged: flagged,
    // flagged: !!matched,
    reason: matched ? "blocked_term" : null,
  };
}

module.exports = checkContent;