/**
 * Sinhala RAG (Retrieval Augmented Generation) Module
 * Provides domain-specific knowledge base for accurate Sinhala responses
 */

export interface KnowledgeEntry {
  id: string;
  category: string;
  question: string;
  questionVariants: string[];
  answer: string;
  keywords: string[];
  priority: number;
}

// Sinhala Knowledge Base
export const SINHALA_KNOWLEDGE_BASE: KnowledgeEntry[] = [
  // === MIRA IDENTITY (HIGHEST PRIORITY) ===
  {
    id: 'identity-1',
    category: 'identity',
    question: 'ඔබ කවුද?',
    questionVariants: ['who are you', 'oya kawda', 'ඔයා කවුද', 'what is your name', 'obe nama mokakda', 'ඔබේ නම මොකක්ද', 'introduce yourself'],
    answer: 'මම මීරා (MIRA - Multilingual Intelligent Response Assistant). මම සිංහල භාෂාවෙන් ඔබට උදව් කිරීමට නිර්මාණය කරන ලද ශ්‍රී ලාංකික AI සහායකයෙකි. 🙏',
    keywords: ['කවුද', 'who', 'නම', 'name', 'මීරා', 'mira', 'oya', 'ඔයා', 'introduce'],
    priority: 100
  },
  {
    id: 'identity-2',
    category: 'identity',
    question: 'ඔබව නිර්මාණය කළේ කවුද?',
    questionVariants: ['who made you', 'who created you', 'who built you', 'oba hadanne kawda', 'ඔබව හැදුවේ කවුද', 'your creator', 'developer'],
    answer: 'මම මීරා (MIRA) - ශ්‍රී ලාංකික AI සහායකයෙක්. සිංහල භාෂාවෙන් ඔබට උදව් කිරීම මගේ කාර්යයයි.',
    keywords: ['නිර්මාණය', 'created', 'made', 'built', 'developer', 'හැදුවේ'],
    priority: 100
  },
  {
    id: 'identity-3',
    category: 'identity',
    question: 'ඔබ Gemini ද?',
    questionVariants: ['are you gemini', 'are you google', 'are you chatgpt', 'are you openai', 'are you bard', 'oba gemini da', 'oba google da'],
    answer: 'නැහැ, මම Gemini, Google, ChatGPT, හෝ OpenAI නොවේ. මම මීරා (MIRA) - ශ්‍රී ලාංකික AI සහායකයෙක්. මම සිංහල භාෂාවට විශේෂයෙන් සැලසුම් කර ඇත.',
    keywords: ['gemini', 'google', 'chatgpt', 'openai', 'bard', 'gpt', 'claude'],
    priority: 100
  },
  {
    id: 'identity-4',
    category: 'identity',
    question: 'MIRA යනු කුමක්ද?',
    questionVariants: ['what is mira', 'mira meaning', 'mira kiyanne mokakda', 'මීරා කියන්නේ මොකක්ද'],
    answer: 'MIRA යනු "Multilingual Intelligent Response Assistant" යන්නයි. මීරා යනු ශ්‍රී ලාංකික AI සහායකයෙකි. සිංහල භාෂාවෙන් පරිශීලකයන්ට උදව් කිරීම මගේ ප්‍රධාන අරමුණයි.',
    keywords: ['mira', 'මීරා', 'meaning', 'අර්ථය', 'what is'],
    priority: 100
  },

  // === GREETINGS & COURTESIES ===
  {
    id: 'greeting-1',
    category: 'greetings',
    question: 'ආයුබෝවන් කියන්නේ කුමක්ද?',
    questionVariants: ['ayubowan meaning', 'ආයුබෝවන් අර්ථය', 'ayubowan kiyanne mokakda'],
    answer: '"ආයුබෝවන්" යනු සිංහල භාෂාවේ සාම්ප්‍රදායික ආචාර වචනයයි. එහි අර්ථය "දිගු ආයුෂක් ලැබේවා" යන්නයි. මෙය ශ්‍රී ලාංකිකයන් එකිනෙකා හමුවන විට භාවිතා කරන ගෞරවනීය සුබ පැතුමකි.',
    keywords: ['ආයුබෝවන්', 'ayubowan', 'greeting', 'සුබ', 'ආචාර'],
    priority: 10
  },
  {
    id: 'greeting-2',
    category: 'greetings',
    question: 'කොහොමද කියන්නේ කෙසේද?',
    questionVariants: ['how are you sinhala', 'kohomada', 'කොහොමද'],
    answer: '"කොහොමද" යනු "ඔබ සනීපෙන්ද?" හෝ "ඔබට කෙසේද?" යන්න විමසන අවිධිමත් ප්‍රකාශනයකි. විධිමත් ලෙස "ඔබට කෙසේද?" හෝ "සුවපහසුද?" කියයි.',
    keywords: ['කොහොමද', 'kohomada', 'how are you', 'සනීප'],
    priority: 9
  },
  
  // === SRI LANKA INFORMATION ===
  {
    id: 'sl-info-1',
    category: 'sri-lanka',
    question: 'ශ්‍රී ලංකාව ගැන කියන්න',
    questionVariants: ['about sri lanka', 'lanka gena', 'ලංකාව ගැන'],
    answer: 'ශ්‍රී ලංකාව (Ceylon) හින්දු සාගරයේ පිහිටි දූපත් රාජ්‍යයකි. එහි අගනුවර ශ්‍රී ජයවර්ධනපුර කෝට්ටේ වන අතර, වාණිජ අගනුවර කොළඹයි. ජනගහනය මිලියන 22ක් පමණ වන අතර, සිංහල, දෙමළ, සහ ඉංග්‍රීසි ප්‍රධාන භාෂාවන් වේ. බුද්ධාගම ප්‍රධාන ආගම වන අතර, හින්දු, ඉස්ලාම්, සහ ක්‍රිස්තියානි ආගම්ද ඇත.',
    keywords: ['ශ්‍රී ලංකා', 'sri lanka', 'ceylon', 'කොළඹ', 'colombo'],
    priority: 10
  },
  {
    id: 'sl-info-2',
    category: 'sri-lanka',
    question: 'සිංහල භාෂාව ගැන කියන්න',
    questionVariants: ['sinhala language', 'සිංහල භාෂාව', 'about sinhala'],
    answer: 'සිංහල භාෂාව ශ්‍රී ලංකාවේ නිල භාෂාවක් වන අතර, මිලියන 17කට වැඩි ජනතාවක් කතා කරයි. එය ඉන්දු-ආර්ය භාෂා පවුලට අයත් වන අතර, පාලි සහ සංස්කෘත භාෂාවලින් බලපෑම් ලබා ඇත. සිංහල අක්ෂර මාලාවේ අක්ෂර 56ක් ඇත.',
    keywords: ['සිංහල', 'sinhala', 'භාෂාව', 'language', 'අක්ෂර'],
    priority: 9
  },
  
  // === CULTURAL INFORMATION ===
  {
    id: 'culture-1',
    category: 'culture',
    question: 'සිංහල අලුත් අවුරුද්ද ගැන කියන්න',
    questionVariants: ['sinhala new year', 'aluth avurudda', 'අලුත් අවුරුද්ද'],
    answer: 'සිංහල සහ හින්දු අලුත් අවුරුද්ද අප්‍රේල් 13-14 දිනවල සමරනු ලැබේ. මෙය අස්වැන්න නෙලීමේ උත්සවයක් ලෙස ආරම්භ වූ අතර, දැන් සාම්ප්‍රදායික ක්‍රීඩා, කෑම වර්ග (කැවුම්, කොකිස්, අලුවා), සහ පවුල් එකතුවීම් සමඟ සමරයි. පුණ්‍ය කාලය සහ නව වසර උදාවීම වැදගත් අවස්ථාවන් වේ.',
    keywords: ['අලුත් අවුරුද්ද', 'new year', 'avurudda', 'කැවුම්', 'කොකිස්'],
    priority: 10
  },
  {
    id: 'culture-2',
    category: 'culture',
    question: 'වෙසක් ගැන කියන්න',
    questionVariants: ['vesak', 'wesak', 'වෙසක් පොහොය'],
    answer: 'වෙසක් පොහොය බුදුන් වහන්සේගේ ත්‍රිවිධ චරිතය (උපත, බුද්ධත්වය, පිරිනිවන) සිහිපත් කරමින් සමරන ප්‍රධානතම බෞද්ධ උත්සවයයි. මැයි මාසයේ පූර්ණ චන්ද්‍ර දිනයේ සමරන මෙම උත්සවය UNESCO විසින් ජාත්‍යන්තර නිවාඩු දිනයක් ලෙස පිළිගෙන ඇත. පන්සල් යාම, දන්සැල්, කූඩු සැරසීම සාම්ප්‍රදායික ක්‍රියාකාරකම් වේ.',
    keywords: ['වෙසක්', 'vesak', 'බුදුන්', 'buddha', 'පොහොය'],
    priority: 10
  },
  
  // === FOOD ===
  {
    id: 'food-1',
    category: 'food',
    question: 'සිංහල ආහාර මොනවාද?',
    questionVariants: ['sinhala food', 'sri lankan cuisine', 'ලංකා කෑම'],
    answer: 'සිංහල කෑම සංස්කෘතිය පොල්, කුළුබඩු, සහ සහල් මත පදනම් වේ. ප්‍රධාන ආහාර: බත් සහ ව්‍යංජන, කිරිබත්, හෝපර්ස්, ස්ට්‍රිං හෝපර්ස්, කොත්තු, ලම්ප්‍රයිස්. ජනප්‍රිය ව්‍යංජන: පරිප්පු, පොලොස් (කෝස්), අම්බුල් තියල්, මාළු මිරිස්. සාම්ප්‍රදායික අතුරුපස: වටලප්පම්, කැවුම්, කොකිස්.',
    keywords: ['ආහාර', 'food', 'කෑම', 'rice', 'curry', 'බත්'],
    priority: 8
  },
  
  // === TECHNOLOGY TERMS ===
  {
    id: 'tech-1',
    category: 'technology',
    question: 'පරිගණක යෙදුම් සිංහලෙන්',
    questionVariants: ['computer terms sinhala', 'tech sinhala', 'තාක්ෂණ වචන'],
    answer: 'පරිගණක තාක්ෂණික වචන සිංහලෙන්:\n• Computer - පරිගණකය\n• Internet - අන්තර්ජාලය\n• Software - මෘදුකාංගය\n• Hardware - දෘඪාංගය\n• Website - වෙබ් අඩවිය\n• Email - විද්‍යුත් තැපෑල\n• Download - බාගත කිරීම\n• Upload - උඩුගත කිරීම\n• Password - මුරපදය\n• File - ගොනුව\n• Folder - ෆෝල්ඩරය\n• Search - සෙවීම',
    keywords: ['පරිගණක', 'computer', 'technology', 'internet', 'අන්තර්ජාල'],
    priority: 9
  },
  
  // === GRAMMAR HELP ===
  {
    id: 'grammar-1',
    category: 'grammar',
    question: 'සිංහල ව්‍යාකරණ නීති',
    questionVariants: ['sinhala grammar', 'vyakarana', 'ව්‍යාකරණ'],
    answer: 'සිංහල ව්‍යාකරණ මූලධර්ම:\n1. වාක්‍ය ව්‍යුහය: කර්තෘ + කර්මය + ක්‍රියාව (SOV)\n2. ලිංග භේදය: පුල්ලිංග, ස්ත්‍රීලිංග, නපුංසකලිංග\n3. වචන භේදය: ඒකවචන, බහුවචන\n4. කාල: වර්තමාන, අතීත, අනාගත\n5. විභක්ති: ප්‍රථමා, ද්විතීයා, තෘතීයා, චතුර්ථී, පඤ්චමී, ෂෂ්ඨී, සප්තමී',
    keywords: ['ව්‍යාකරණ', 'grammar', 'rules', 'නීති'],
    priority: 7
  },
  
  // === COMMON PHRASES ===
  {
    id: 'phrase-1',
    category: 'phrases',
    question: 'සිංහල වාක්‍ය',
    questionVariants: ['sinhala phrases', 'common phrases', 'වාක්‍ය'],
    answer: 'ප්‍රයෝජනවත් සිංහල වාක්‍ය:\n• ඔබට ස්තූතියි - Thank you\n• කරුණාකර - Please\n• සමාවන්න - Sorry/Excuse me\n• මට සිංහල කතා කරන්න පුළුවන් - I can speak Sinhala\n• මට තේරෙන්නේ නැහැ - I don\'t understand\n• ඔබේ නම මොකක්ද? - What is your name?\n• මගේ නම... - My name is...\n• ඔබට සුභ දවසක් - Have a good day',
    keywords: ['වාක්‍ය', 'phrases', 'ස්තූතියි', 'thank you'],
    priority: 8
  },
  
  // === NUMBERS ===
  {
    id: 'numbers-1',
    category: 'numbers',
    question: 'සිංහල අංක',
    questionVariants: ['sinhala numbers', 'anka', 'අංක'],
    answer: 'සිංහල අංක:\n1 - එක (eka)\n2 - දෙක (deka)\n3 - තුන (thuna)\n4 - හතර (hathara)\n5 - පහ (paha)\n6 - හය (haya)\n7 - හත (hatha)\n8 - අට (ata)\n9 - නවය (nawaya)\n10 - දහය (dahaya)\n100 - සියය (siyaya)\n1000 - දහස (dahasa)',
    keywords: ['අංක', 'numbers', 'eka', 'deka', 'ගණන්'],
    priority: 8
  },
  
  // === DAYS & MONTHS ===
  {
    id: 'datetime-1',
    category: 'datetime',
    question: 'සිංහල දින නාම',
    questionVariants: ['sinhala days', 'weekdays sinhala', 'දින'],
    answer: 'සතියේ දින සිංහලෙන්:\n• ඉරිදා (Sunday) - Irida\n• සඳුදා (Monday) - Sanduda\n• අඟහරුවාදා (Tuesday) - Angaharuwada\n• බදාදා (Wednesday) - Badada\n• බ්‍රහස්පතින්දා (Thursday) - Brahaspathinda\n• සිකුරාදා (Friday) - Sikurada\n• සෙනසුරාදා (Saturday) - Senasurada',
    keywords: ['දින', 'days', 'weekdays', 'ඉරිදා', 'සඳුදා'],
    priority: 7
  },
];

/**
 * Calculate similarity between two strings using Jaccard index
 */
function calculateSimilarity(str1: string, str2: string): number {
  const set1 = new Set(str1.toLowerCase().split(/\s+/));
  const set2 = new Set(str2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

/**
 * Check if query matches any keywords
 */
function matchesKeywords(query: string, keywords: string[]): number {
  const queryLower = query.toLowerCase();
  let matches = 0;
  
  for (const keyword of keywords) {
    if (queryLower.includes(keyword.toLowerCase())) {
      matches++;
    }
  }
  
  return matches / keywords.length;
}

/**
 * Search the knowledge base for relevant entries
 */
export function searchKnowledge(
  query: string,
  options: {
    maxResults?: number;
    minScore?: number;
    category?: string;
  } = {}
): Array<{ entry: KnowledgeEntry; score: number }> {
  const { maxResults = 3, minScore = 0.2, category } = options;
  
  const results: Array<{ entry: KnowledgeEntry; score: number }> = [];
  
  for (const entry of SINHALA_KNOWLEDGE_BASE) {
    // Filter by category if specified
    if (category && entry.category !== category) continue;
    
    // Calculate score based on multiple factors
    let score = 0;
    
    // Check main question similarity
    score += calculateSimilarity(query, entry.question) * 0.3;
    
    // Check question variants
    for (const variant of entry.questionVariants) {
      const variantScore = calculateSimilarity(query, variant);
      if (variantScore > score * 0.3) {
        score += variantScore * 0.2;
      }
    }
    
    // Check keywords
    score += matchesKeywords(query, entry.keywords) * 0.4;
    
    // Apply priority boost
    score *= (1 + entry.priority * 0.05);
    
    if (score >= minScore) {
      results.push({ entry, score });
    }
  }
  
  // Sort by score and return top results
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

/**
 * Get a direct answer if query matches closely
 */
export function getDirectAnswer(query: string): string | null {
  const results = searchKnowledge(query, { maxResults: 1, minScore: 0.5 });
  
  if (results.length > 0 && results[0].score >= 0.6) {
    return results[0].entry.answer;
  }
  
  return null;
}

/**
 * Build context from knowledge base for LLM
 */
export function buildRAGContext(query: string): string {
  const results = searchKnowledge(query, { maxResults: 3, minScore: 0.2 });
  
  if (results.length === 0) {
    return '';
  }
  
  let context = '### අදාළ තොරතුරු:\n\n';
  
  for (const { entry } of results) {
    context += `**${entry.question}**\n${entry.answer}\n\n`;
  }
  
  return context;
}

/**
 * Get all categories
 */
export function getCategories(): string[] {
  const categories = new Set(SINHALA_KNOWLEDGE_BASE.map(e => e.category));
  return Array.from(categories);
}

/**
 * Get entries by category
 */
export function getByCategory(category: string): KnowledgeEntry[] {
  return SINHALA_KNOWLEDGE_BASE.filter(e => e.category === category);
}

export default {
  searchKnowledge,
  getDirectAnswer,
  buildRAGContext,
  getCategories,
  getByCategory,
  SINHALA_KNOWLEDGE_BASE,
};
