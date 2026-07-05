// utils/moderateContent.js
const Filter = require("bad-words");

const filter = new Filter();
filter.removeWords(
  "damn",
  "hell",
  "shit",
  "fuck",
  "heck",
  "bullshit",
  "fucking",
  "ass",
  "asshole",
  "bitch",
  "bastard",
  "crap",
  "piss",
  "dick",
  "cock",
  "cunt",
  "prick",
  "douche",
  "goddamn",
  "bloody",
  "bugger",
  "twat",
  "nigger",
  "nigga",
  
);

const BLOCKED_TERMS = [
  // slurs, hate speech, explicit sexual terms, harassment terms
];

const BLOCKED_PATTERNS = BLOCKED_TERMS.map(
  (term) => new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i")
);

function checkContent(text) {
  if (!text || !text.trim()) {
    return { flagged: false, reason: null };
  }

  const normalized = text.toLowerCase();
  const profane = filter.isProfane(text);
  const matched = BLOCKED_PATTERNS.find((pattern) => pattern.test(normalized));

  return {
    flagged: profane || !!matched,
    reason: matched ? "blocked_term" : profane ? "profane" : null,
  };
}

module.exports = checkContent;