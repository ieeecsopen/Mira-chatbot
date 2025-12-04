/**
 * Sinhala Grammar Correction Module
 * Post-processing to fix common Sinhala grammar and spelling mistakes
 */

// Common spelling corrections
const SPELLING_CORRECTIONS: Record<string, string> = {
  // Common misspellings
  'කියන්නෙ': 'කියන්නේ',
  'යන්නෙ': 'යන්නේ',
  'එන්නෙ': 'එන්නේ',
  'කරන්නෙ': 'කරන්නේ',
  'බලන්නෙ': 'බලන්නේ',
  'දෙන්නෙ': 'දෙන්නේ',
  'ගන්නෙ': 'ගන්නේ',
  
  // යේ/ය් corrections
  'කියලය': 'කියලා',
  'ගිහිල්ලය': 'ගිහිල්ලා',
  'ආවය': 'ආවා',
  'ගියය': 'ගියා',
  
  // Common word fixes
  'පුලුවන': 'පුළුවන්',
  'වෙන්න': 'වෙන්න',
  'කරන': 'කරන්න',
  'බලන': 'බලන්න',
  
  // ං/න් corrections
  'සිංහල': 'සිංහල',
  'ලංකා': 'ලංකා',
  
  // Double letter corrections
  'මමම': 'මම',
  'ඔයාා': 'ඔයා',
  'එකක්ක්': 'එකක්',
  
  // Common typos
  'ඇත්ත්': 'ඇත්ත',
  'නැත්ත්': 'නැත්ත',
  'හොන්ද': 'හොඳ',
  'හොද': 'හොඳ',
  
  // Formal/informal corrections
  'කරන්නෙ නැ': 'කරන්නේ නැත',
  'දන්නෙ නැ': 'දන්නේ නැත',
  'පුලුවං': 'පුළුවන්',
};

// Grammar rules for sentence structure
interface GrammarRule {
  pattern: RegExp;
  replacement: string;
  description: string;
}

const GRAMMAR_RULES: GrammarRule[] = [
  // Fix double spaces
  {
    pattern: /\s{2,}/g,
    replacement: ' ',
    description: 'Remove extra spaces'
  },
  
  // Fix punctuation spacing
  {
    pattern: /\s+([.,!?;:])/g,
    replacement: '$1',
    description: 'Remove space before punctuation'
  },
  
  // Add space after punctuation if missing
  {
    pattern: /([.,!?;:])([^\s\d])/g,
    replacement: '$1 $2',
    description: 'Add space after punctuation'
  },
  
  // Fix repeated hal kirima
  {
    pattern: /්{2,}/g,
    replacement: '්',
    description: 'Remove duplicate virama'
  },
  
  // Fix repeated vowel signs
  {
    pattern: /([\u0DCF-\u0DDF\u0DF2\u0DF3])\1+/g,
    replacement: '$1',
    description: 'Remove duplicate vowel signs'
  },
  
  // Normalize quotation marks
  {
    pattern: /[""]/g,
    replacement: '"',
    description: 'Normalize quotes'
  },
  
  // Fix common particle errors: ද -> ද?
  {
    pattern: /(\S+ද)\s*$/gm,
    replacement: '$1?',
    description: 'Add question mark after ද particle'
  },
];

// Formal writing improvements
const FORMAL_REPLACEMENTS: Record<string, string> = {
  // Informal to formal
  'මං': 'මම',
  'උඹ': 'ඔබ',
  'උඹලා': 'ඔබලා',
  'තෝ': 'ඔබ',
  'ගෑණු': 'කාන්තා',
  'මිනිහා': 'පුරුෂයා',
  'කොල්ලා': 'තරුණයා',
  'කෙල්ල': 'තරුණිය',
  'යකෝ': '',  // Remove slang
  'මචං': '',  // Remove slang
  'බං': '',   // Remove slang
  
  // Colloquial to standard
  'කොහොමද': 'කෙසේද',
  'මොකද': 'කුමක්ද',
  'මොකක්ද': 'කුමක්ද',
  'ඇයි': 'මන්ද',
  'එහෙනම්': 'එසේනම්',
  'මෙහෙනම්': 'මෙසේනම්',
  'ඔන්න': 'එන්න',
  'ගිහින්': 'ගොස්',
  'කියලා': 'කියා',
  'ගහලා': 'ගසා',
  'දාලා': 'දමා',
  'අරන්': 'ගෙන',
  
  // Common abbreviations expansion
  'නෑ': 'නැත',
  'බෑ': 'බැහැ',
  'ඕනෑ': 'අවශ්‍යයි',
  'ඕන': 'අවශ්‍යයි',
  'එපා': 'අවශ්‍ය නැත',
};

/**
 * Apply spelling corrections
 */
function applySpellingCorrections(text: string): string {
  let result = text;
  
  for (const [wrong, correct] of Object.entries(SPELLING_CORRECTIONS)) {
    const regex = new RegExp(wrong, 'g');
    result = result.replace(regex, correct);
  }
  
  return result;
}

/**
 * Apply grammar rules
 */
function applyGrammarRules(text: string): string {
  let result = text;
  
  for (const rule of GRAMMAR_RULES) {
    result = result.replace(rule.pattern, rule.replacement);
  }
  
  return result;
}

/**
 * Convert to formal Sinhala (optional)
 */
export function toFormalSinhala(text: string): string {
  let result = text;
  
  for (const [informal, formal] of Object.entries(FORMAL_REPLACEMENTS)) {
    // Use word boundaries to avoid partial replacements
    const regex = new RegExp(`(^|\\s)${informal}($|\\s|[.,!?])`, 'g');
    result = result.replace(regex, `$1${formal}$2`);
  }
  
  return result.trim();
}

/**
 * Check for common grammar issues and return suggestions
 */
export interface GrammarSuggestion {
  original: string;
  suggestion: string;
  position: number;
  rule: string;
}

export function checkGrammar(text: string): GrammarSuggestion[] {
  const suggestions: GrammarSuggestion[] = [];
  
  // Check spelling
  for (const [wrong, correct] of Object.entries(SPELLING_CORRECTIONS)) {
    let pos = text.indexOf(wrong);
    while (pos !== -1) {
      suggestions.push({
        original: wrong,
        suggestion: correct,
        position: pos,
        rule: 'spelling'
      });
      pos = text.indexOf(wrong, pos + 1);
    }
  }
  
  return suggestions;
}

/**
 * Main grammar correction function
 * Applies all corrections and returns cleaned text
 */
export function correctGrammar(text: string, options: {
  spelling?: boolean;
  grammar?: boolean;
  formal?: boolean;
} = {}): string {
  const { 
    spelling = true, 
    grammar = true, 
    formal = false 
  } = options;
  
  let result = text;
  
  // Apply spelling corrections
  if (spelling) {
    result = applySpellingCorrections(result);
  }
  
  // Apply grammar rules
  if (grammar) {
    result = applyGrammarRules(result);
  }
  
  // Convert to formal if requested
  if (formal) {
    result = toFormalSinhala(result);
  }
  
  return result.trim();
}

/**
 * Enhance Sinhala text with proper punctuation and formatting
 */
export function enhanceSinhalaText(text: string): string {
  let result = text;
  
  // Ensure proper sentence ending
  if (result && !/[.!?။]$/.test(result.trim())) {
    // Add period if sentence doesn't end with punctuation
    result = result.trim() + '.';
  }
  
  // Capitalize first letter of sentences (for mixed content)
  result = result.replace(/(^|[.!?]\s+)([a-z])/g, (_, prefix, letter) => 
    prefix + letter.toUpperCase()
  );
  
  return result;
}

/**
 * Validate Sinhala text
 * Returns true if text appears to be valid Sinhala
 */
export function isValidSinhala(text: string): boolean {
  if (!text) return false;
  
  // Check for Sinhala character range
  const sinhalaPattern = /[\u0D80-\u0DFF]/;
  
  // Check for invalid character combinations
  const invalidPatterns = [
    /්{3,}/,  // Too many viramas
    /[\u0DCF-\u0DDF]{2,}/,  // Multiple vowel signs in a row
  ];
  
  return sinhalaPattern.test(text) && 
         !invalidPatterns.some(p => p.test(text));
}

export default {
  correctGrammar,
  toFormalSinhala,
  checkGrammar,
  enhanceSinhalaText,
  isValidSinhala,
};
