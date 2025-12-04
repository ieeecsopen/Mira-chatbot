/**
 * Singlish to Sinhala Converter
 * Converts romanized Sinhala (Singlish) to Sinhala Unicode script
 */

// Vowel mappings (standalone vowels)
const VOWELS: Record<string, string> = {
  'a': 'අ',
  'aa': 'ආ',
  'ae': 'ඇ',
  'aae': 'ඈ',
  'i': 'ඉ',
  'ii': 'ඊ',
  'ee': 'ඊ',
  'u': 'උ',
  'uu': 'ඌ',
  'oo': 'ඌ',
  'e': 'එ',
  'ei': 'ඒ',
  'ai': 'ඓ',
  'o': 'ඔ',
  'oe': 'ඕ',
  'au': 'ඖ',
  'ru': 'ඍ',
  'ruu': 'ඎ',
};

// Vowel signs (used after consonants) - matra/pilla
const VOWEL_SIGNS: Record<string, string> = {
  'a': '',        // Inherent vowel, no sign needed
  'aa': 'ා',
  'ae': 'ැ',
  'aae': 'ෑ',
  'i': 'ි',
  'ii': 'ී',
  'ee': 'ී',
  'u': 'ු',
  'uu': 'ූ',
  'oo': 'ූ',
  'e': 'ෙ',
  'ei': 'ේ',
  'ai': 'ෛ',
  'o': 'ො',
  'oe': 'ෝ',
  'au': 'ෞ',
  'ru': 'ෘ',
  'ruu': 'ෲ',
};

// Consonant mappings
const CONSONANTS: Record<string, string> = {
  // Velars
  'k': 'ක',
  'kh': 'ඛ',
  'g': 'ග',
  'gh': 'ඝ',
  'ng': 'ඞ',
  
  // Palatals
  'ch': 'ච',
  'chh': 'ඡ',
  'j': 'ජ',
  'jh': 'ඣ',
  'ny': 'ඤ',
  'gn': 'ඥ',
  
  // Retroflexes
  'tt': 'ට',
  'tth': 'ඨ',
  'dd': 'ඩ',
  'ddh': 'ඪ',
  'nn': 'ණ',
  
  // Dentals
  't': 'ත',
  'th': 'ථ',
  'd': 'ද',
  'dh': 'ධ',
  'n': 'න',
  
  // Labials
  'p': 'ප',
  'ph': 'ඵ',
  'b': 'බ',
  'bh': 'භ',
  'm': 'ම',
  
  // Semi-vowels
  'y': 'ය',
  'r': 'ර',
  'l': 'ල',
  'w': 'ව',
  'v': 'ව',
  
  // Sibilants
  'sh': 'ශ',
  'sha': 'ෂ',
  's': 'ස',
  
  // Aspirate
  'h': 'හ',
  
  // Other
  'f': 'ෆ',
  'll': 'ළ',
  'x': 'ක්ෂ',
};

// Hal kirima (virama) - removes inherent vowel
const VIRAMA = '්';

// Special combinations and common words
const SPECIAL_WORDS: Record<string, string> = {
  // Common greetings
  'ayubowan': 'ආයුබෝවන්',
  'kohomada': 'කොහොමද',
  'bohoma': 'බොහොම',
  'sthuthi': 'ස්තුති',
  'istuti': 'ස්තුති',
  'subha': 'සුභ',
  'udaasanak': 'උදෑසනක්',
  
  // Common words
  'mama': 'මම',
  'oya': 'ඔයා',
  'api': 'අපි',
  'mokakda': 'මොකක්ද',
  'koheda': 'කොහෙද',
  'hari': 'හරි',
  'naha': 'නෑ',
  'ow': 'ඔව්',
  'ne': 'නෑ',
  'nae': 'නෑ',
  'karanna': 'කරන්න',
  'kiyanna': 'කියන්න',
  'balanna': 'බලන්න',
  'yanna': 'යන්න',
  'enna': 'එන්න',
  'denna': 'දෙන්න',
  'ganna': 'ගන්න',
  'hadanna': 'හදන්න',
  'puluwanda': 'පුළුවන්ද',
  'puluwan': 'පුළුවන්',
  'baehae': 'බෑ',
  'behe': 'බෑ',
  'epa': 'එපා',
  'kawuda': 'කවුද',
  'mokada': 'මොකද',
  'ayi': 'ඇයි',
  'aay': 'ආය්',
  'mehema': 'මෙහෙම',
  'ehema': 'එහෙම',
  'thamai': 'තමයි',
  'witharai': 'විතරයි',
  'widiha': 'විදිහ',
  'kawadawath': 'කවදාවත්',
  'hamadaama': 'හැමදාම',
  'ikmanin': 'ඉක්මනින්',
  'passe': 'පස්සේ',
  'kalin': 'කලින්',
  'daan': 'දැන්',
  'dan': 'දැන්',
  'ada': 'අද',
  'heta': 'හෙට',
  'iye': 'ඊයේ',
  'sathiya': 'සතිය',
  'maasaya': 'මාසය',
  'awurudu': 'අවුරුදු',
  
  // Question words
  'kohomad': 'කොහොමද',
  'mokakd': 'මොකක්ද',
  'kawda': 'කවුද',
  'kohed': 'කොහෙද',
  'kawadad': 'කවදාද',
  'aeyi': 'ඇයි',
  
  // Technology terms
  'computer': 'පරිගණකය',
  'internet': 'අන්තර්ජාලය',
  'phone': 'දුරකථනය',
  'email': 'විද්‍යුත් තැපෑල',
  
  // Numbers
  'eka': 'එක',
  'deka': 'දෙක',
  'thuna': 'තුන',
  'hathara': 'හතර',
  'paha': 'පහ',
  'haya': 'හය',
  'hatha': 'හත',
  'ata': 'අට',
  'nawaya': 'නවය',
  'dahaya': 'දහය',
};

/**
 * Check if character is a vowel letter
 */
function isVowel(char: string): boolean {
  return 'aeiou'.includes(char.toLowerCase());
}

/**
 * Find the longest matching pattern from position
 */
function findLongestMatch(
  text: string,
  pos: number,
  patterns: Record<string, string>
): [string, string] | null {
  const remaining = text.substring(pos).toLowerCase();
  
  // Sort patterns by length (longest first)
  const sortedKeys = Object.keys(patterns).sort((a, b) => b.length - a.length);
  
  for (const key of sortedKeys) {
    if (remaining.startsWith(key)) {
      return [key, patterns[key]];
    }
  }
  return null;
}

/**
 * Convert a single Singlish word to Sinhala
 */
function convertWord(word: string): string {
  // Check special words first
  const lowerWord = word.toLowerCase();
  if (SPECIAL_WORDS[lowerWord]) {
    return SPECIAL_WORDS[lowerWord];
  }
  
  let result = '';
  let pos = 0;
  const len = word.length;
  
  while (pos < len) {
    // Try to find a consonant
    const consonantMatch = findLongestMatch(word, pos, CONSONANTS);
    
    if (consonantMatch) {
      const [consonantKey, consonantVal] = consonantMatch;
      pos += consonantKey.length;
      
      // Look for a vowel sign after the consonant
      const vowelMatch = findLongestMatch(word, pos, VOWEL_SIGNS);
      
      if (vowelMatch) {
        const [vowelKey, vowelSign] = vowelMatch;
        result += consonantVal + vowelSign;
        pos += vowelKey.length;
      } else if (pos < len) {
        // Check if next is another consonant or end
        const nextConsonant = findLongestMatch(word, pos, CONSONANTS);
        if (nextConsonant || pos === len) {
          // Add virama (hal kirima) if followed by consonant
          result += consonantVal + VIRAMA;
        } else {
          // Just add consonant with inherent 'a'
          result += consonantVal;
        }
      } else {
        // End of word - add virama
        result += consonantVal + VIRAMA;
      }
    } else {
      // Try standalone vowel
      const vowelMatch = findLongestMatch(word, pos, VOWELS);
      
      if (vowelMatch) {
        const [vowelKey, vowelVal] = vowelMatch;
        result += vowelVal;
        pos += vowelKey.length;
      } else {
        // Keep original character (numbers, punctuation, already Sinhala)
        result += word[pos];
        pos++;
      }
    }
  }
  
  return result;
}

/**
 * Check if text contains Sinhala characters
 */
function containsSinhala(text: string): boolean {
  return /[\u0D80-\u0DFF]/.test(text);
}

/**
 * Check if word is likely Singlish (romanized Sinhala)
 */
function isSinglish(word: string): boolean {
  // If already contains Sinhala, not Singlish
  if (containsSinhala(word)) return false;
  
  // If it's a number or punctuation, skip
  if (/^[\d\s\.,!?]+$/.test(word)) return false;
  
  // Check if word matches common Singlish patterns
  const singlishPatterns = [
    /^[a-z]+$/i,  // All letters
    /aa|ae|ee|oo|ii|uu/i,  // Double vowels common in Singlish
    /th|dh|kh|gh|ch|sh|ng|ny/i,  // Aspirated consonants
  ];
  
  return singlishPatterns.some(pattern => pattern.test(word));
}

/**
 * Main conversion function
 * Converts Singlish text to Sinhala, preserving already-Sinhala text
 */
export function singlishToSinhala(text: string): string {
  if (!text) return text;
  
  // If text is already mostly Sinhala, return as-is
  if (containsSinhala(text)) {
    return text;
  }
  
  // Split by words while preserving whitespace and punctuation
  const tokens = text.split(/(\s+|[.,!?;:'"()-]+)/);
  
  const converted = tokens.map(token => {
    // Skip whitespace and punctuation
    if (/^\s+$/.test(token) || /^[.,!?;:'"()-]+$/.test(token)) {
      return token;
    }
    
    // Check if it looks like Singlish
    if (isSinglish(token)) {
      return convertWord(token);
    }
    
    return token;
  });
  
  return converted.join('');
}

/**
 * Detect if text is likely Singlish
 */
export function detectSinglish(text: string): boolean {
  if (!text || containsSinhala(text)) return false;
  
  const words = text.toLowerCase().split(/\s+/);
  const singlishWords = words.filter(word => 
    SPECIAL_WORDS[word] || 
    /aa|ae|ee|oo|ii|uu|th|dh|kh|gh|ch|sh/i.test(word)
  );
  
  // If more than 30% of words look like Singlish, probably is
  return singlishWords.length / words.length > 0.3;
}

export default {
  singlishToSinhala,
  detectSinglish,
};
