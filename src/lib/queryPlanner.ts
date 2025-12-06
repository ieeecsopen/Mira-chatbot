/**
 * Lightweight query planner that expands Sinhala/English prompts into
 * richer retrieval instructions. The planner performs:
 *  - normalization (trim + whitespace collapse)
 *  - key phrase extraction (ignores stopwords)
 *  - synonym & acronym expansion
 *  - compound query decomposition for multi-hop retrieval
 */

export interface QueryPlan {
    original: string;
    normalized: string;
    keyPhrases: string[];
    expansions: string[];
    subQueries: string[];
    reasoning: string[];
}

const STOP_WORDS = new Set([
    'the', 'is', 'are', 'a', 'an', 'of', 'to', 'for', 'in', 'on', 'with', 'about', 'and', 'or',
    'මොනවාද', 'කෙසේද', 'හොඳම', 'ගැන', 'කොහේද', 'දෙන්න', 'හැඳින්වන්න', 'ඔබ', 'මට', 'කියන්න'
]);

const SYNONYM_TABLE: Array<{ matches: string[]; expansions: string[] }> = [
    {
        matches: ['sri lanka', 'ශ්‍රී ලංකා', 'sl'],
        expansions: ['ශ්‍රී ලංකාව', 'Sri Lankan', 'Ceylon']
    },
    {
        matches: ['economy', 'විනිමය', 'gdp'],
        expansions: ['Gross Domestic Product', 'ආර්ථික වර්ධනය']
    },
    {
        matches: ['population', 'ජනගහනය'],
        expansions: ['population statistics', 'ජනගහන දත්ත']
    },
    {
        matches: ['history', 'ඉතිහාසය'],
        expansions: ['historical background', 'ඉතිහාසික තොරතුරු']
    },
    {
        matches: ['tourism', 'සංචාරක'],
        expansions: ['travel sector', 'සංචාරක කර්මාන්තය']
    },
    {
        matches: ['education', 'කාන්තා', 'school'],
        expansions: ['විදුහල්පති', 'උපාධි පද්ධතිය', 'Ministry of Education']
    },
];

const ACRONYM_MAP: Record<string, string> = {
    GDP: 'Gross Domestic Product',
    IT: 'Information Technology',
    ICT: 'Information and Communication Technology',
    SL: 'Sri Lanka',
    CBT: 'Computer Based Testing',
};

function normalize(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
}

function extractKeyPhrases(text: string): string[] {
    const simplified = text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .split(/\s+/)
        .filter(Boolean);

    const phrases = new Set<string>();
    const buffer: string[] = [];

    for (const token of simplified) {
        if (STOP_WORDS.has(token) || token.length < 3) {
            if (buffer.length > 0) {
                phrases.add(buffer.join(' '));
                buffer.length = 0;
            }
            continue;
        }
        buffer.push(token);
        if (buffer.length >= 3) {
            phrases.add(buffer.join(' '));
            buffer.length = 0;
        }
    }

    if (buffer.length > 0) {
        phrases.add(buffer.join(' '));
    }

    return Array.from(phrases).filter(p => p.length >= 3).slice(0, 5);
}

function expandSynonyms(text: string): { expansions: string[]; reasoning: string[] } {
    const lowered = text.toLowerCase();
    const expansions = new Set<string>();
    const reasoning: string[] = [];

    for (const entry of SYNONYM_TABLE) {
        if (entry.matches.some(match => lowered.includes(match))) {
            entry.expansions.forEach(e => expansions.add(e));
            reasoning.push(`Synonym expansion for "${entry.matches[0]}"`);
        }
    }

    return { expansions: Array.from(expansions).slice(0, 5), reasoning };
}

function expandAcronyms(text: string): { expansions: string[]; reasoning: string[] } {
    const expansions: string[] = [];
    const reasoning: string[] = [];

    for (const [acronym, full] of Object.entries(ACRONYM_MAP)) {
        const regex = new RegExp(`\\b${acronym}\\b`, 'i');
        if (regex.test(text)) {
            expansions.push(full);
            reasoning.push(`Acronym "${acronym}" expanded to "${full}"`);
        }
    }

    return { expansions, reasoning };
}

function splitCompoundQuery(text: string): { subQueries: string[]; reasoning: string[] } {
    const separators = ['?', ' and ', ' vs ', 'විරුද්ධව', ' / ', ';', '၊'];
    let parts = [text];

    for (const sep of separators) {
        parts = parts.flatMap(part => part.split(sep).map(normalize));
    }

    const subQueries = Array.from(new Set(parts.filter(p => p && p.length > 5 && p !== text))).slice(0, 3);
    const reasoning = subQueries.length > 0 ? ['Compound query split for multi-hop reasoning'] : [];
    return { subQueries, reasoning };
}

export function buildQueryPlan(query: string): QueryPlan {
    const normalized = normalize(query);
    const reasoning: string[] = [];

    const keyPhrases = extractKeyPhrases(normalized);
    if (keyPhrases.length > 0) {
        reasoning.push('Key phrases extracted for focused retrieval');
    }

    const synonymResult = expandSynonyms(normalized);
    const acronymResult = expandAcronyms(normalized);
    const compoundResult = splitCompoundQuery(normalized);

    reasoning.push(...synonymResult.reasoning, ...acronymResult.reasoning, ...compoundResult.reasoning);

    return {
        original: query,
        normalized,
        keyPhrases,
        expansions: Array.from(new Set([...synonymResult.expansions, ...acronymResult.expansions])),
        subQueries: compoundResult.subQueries,
        reasoning,
    };
}
