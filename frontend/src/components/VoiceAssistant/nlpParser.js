// Natural Language Understanding (NLU) & Intent Parser
// Multi-lingual entity extraction for English, Telugu, and Hindi

// Map of Devanagari & Telugu digits to standard Arabic numerals
const INDIC_DIGIT_MAP = {
  "०": "0", "१": "1", "२": "2", "३": "3", "४": "4",
  "५": "5", "६": "6", "७": "7", "८": "8", "९": "9",
  "౦": "0", "౧": "1", "౨": "2", "౩": "3", "౪": "4",
  "౫": "5", "౬": "6", "౭": "7", "౮": "8", "౯": "9",
};

// Word numbers in English, Telugu, and Hindi
const WORD_NUMBERS = {
  // English
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90, hundred: 100, thousand: 1000, lakh: 100000,

  // Telugu
  సున్నా: 0, ఒకటి: 1, రెండు: 2, మూడు: 3, నాలుగు: 4, ఐదు: 5,
  ఆరు: 6, ఏడు: 7, ఎనిమిది: 8, తొమ్మిది: 9, పది: 10,
  పదకొండు: 11, పన్నెండు: 12, పదమూడు: 13, పద్నాలుగు: 14, పదిహేను: 15,
  పదహారు: 16, పదిహేడు: 17, పద్దెనిమిది: 18, పందొమ్మిది: 19, ఇరవై: 20,
  ముప్పై: 30, నలభై: 40, యాభై: 50, అరవై: 60, డెబ్బై: 70,
  ఎనభై: 80, తొంబై: 90, వంద: 100, వేలు: 1000, వేల: 1000, లక్ష: 100000,

  // Hindi
  शून्य: 0, एक: 1, दो: 2, तीन: 3, चार: 4, पांच: 5, पाँच: 5,
  छह: 6, सात: 7, आठ: 8, नौ: 9, दस: 10,
  ग्यारह: 11, बारह: 12, तेरह: 13, चौदह: 14, पंद्रह: 15,
  सोलह: 16, सत्रह: 17, अठारह: 18, उन्नीस: 19, बीस: 20,
  तीस: 30, चालीस: 40, पचास: 50, साठ: 60, सत्तर: 70,
  अस्सी: 80, नब्बे: 90, सौ: 100, हज़ार: 1000, हजार: 1000, लाख: 100000,
};

const looksLikeFreshCommand = (norm) => {
  // A new top-level command (update/add/delete/show/...) must never be
  // swallowed as a conversational answer to a previous pendingAction.
  // This prevents stale product reuse (e.g. "Update Mouse..." reusing Laptop).
  return (
    norm.startsWith("add ") ||
    norm.includes("add a product") ||
    norm.includes("add product") ||
    norm.includes("new product") ||
    norm.includes("create product") ||
    norm.includes("update ") ||
    norm.startsWith("update") ||
    norm.includes("delete") ||
    norm.includes("remove") ||
    norm.includes("increase") ||
    norm.includes("decrease") ||
    norm.includes("reduce") ||
    norm.includes("add stock") ||
    norm.includes("show") ||
    norm.includes("open") ||
    norm.includes("generate") ||
    norm.includes("go to")
  );
};

// Normalize text by replacing Indian script digits and lowercasing
export function normalizeText(rawText = "") {
  let text = String(rawText || "").toLowerCase().trim();
  for (const [indic, arab] of Object.entries(INDIC_DIGIT_MAP)) {
    text = text.replaceAll(indic, arab);
  }
  return text;
}

// Convert numbers in words or digits from text
export function extractNumbers(text) {
  const norm = normalizeText(text);
  const numbers = [];

  // Match digits (with optional decimals and commas e.g. 50,000 or 50000 or 50k)
  const digitRegex = /\b(\d+(?:[,.]\d+)?)\s*(k|lakh|thousand|వేలు|हज़ार|हजार)?\b/gi;
  let match;
  while ((match = digitRegex.exec(norm)) !== null) {
    let val = parseFloat(match[1].replace(/,/g, ""));
    const unit = (match[2] || "").toLowerCase();
    if (unit === "k" || unit === "thousand" || unit === "వేలు" || unit === "हज़ार" || unit === "हजार") {
      val *= 1000;
    } else if (unit === "lakh" || unit === "లక్ష" || unit === "लाख") {
      val *= 100000;
    }
    numbers.push(val);
  }

  // Also check single word numbers if no digits found
  if (numbers.length === 0) {
    const tokens = norm.split(/\s+/);
    for (let i = 0; i < tokens.length; i++) {
      const word = tokens[i];
      if (WORD_NUMBERS[word] !== undefined) {
        let val = WORD_NUMBERS[word];
        // Check next word for multiplier like thousand / వేలు / हज़ार
        if (i + 1 < tokens.length && WORD_NUMBERS[tokens[i + 1]] >= 100) {
          val = val * WORD_NUMBERS[tokens[i + 1]];
          i++;
        }
        numbers.push(val);
      }
    }
  }

  return numbers;
}

// Product synonyms across English, Telugu, Hindi
const PRODUCT_SYNONYMS = [
  { canon: "Laptop", match: ["laptop", "laptops", "ల్యాప్టాప్", "ల్యాప్‌టాప్", "లాప్‌టాప్", "लैपटॉप"] },
  { canon: "Wireless Keyboard", match: ["wireless keyboard", "keyboard", "keyboards", "కీబోర్డ్", "కీబోర్డు", "कीबोर्ड"] },
  { canon: "Mouse", match: ["mouse", "mice", "మౌస్", "మాઉસ", "माउस"] },
  { canon: "Smartphone", match: ["smartphone", "smart phone", "phone", "mobile", "స్మార్ట్‌ఫోన్", "ఫోన్", "స్మార్ట్ ఫోన్", "स्मार्टफोन", "फोन", "मोबाइल"] },
  { canon: "Tablet", match: ["tablet", "tablets", "tab", "టాబ్లెట్", "ట్యాబ్", "टैबलेट", "टैब"] },
  { canon: "Wireless Earbuds", match: ["wireless earbuds", "earbuds", "earbud", "ఇయర్‌బడ్స్", "ఇయర్ బడ్స్", "ईयरबड्स", "ईयरबड"] },
  { canon: "Smart Watch", match: ["smart watch", "smartwatch", "watch", "స్మార్ట్ వాచ్", "స్మార్ట్‌వాచ్", "వాచ్", "स्मार्ट वॉच", "स्मार्टवॉच", "घड़ी"] },
];

export function findProductInText(text, knownProducts = []) {
  const norm = normalizeText(text);

  // Check known products from DB first — use LONGEST match so "Touch Pad Phone"
  // always wins over "Phone" and never falls through to the synonym table.
  let bestMatch = null;
  let bestLen = 0;
  for (const prod of knownProducts) {
    const pName = prod.name.toLowerCase();
    if (norm.includes(pName) && pName.length > bestLen) {
      bestMatch = prod.name;
      bestLen = pName.length;
    }
  }
  if (bestMatch) return bestMatch;

  // Check synonym mappings (only if DB lookup failed)
  for (const item of PRODUCT_SYNONYMS) {
    for (const syn of item.match) {
      // Word boundary check or substring in script
      const regex = new RegExp(`(^|[\\s,.])${syn}([\\s,.]|$)`, "i");
      if (regex.test(norm) || norm.includes(syn)) {
        return item.canon;
      }
    }
  }

  // Regex extraction for "product named X", "product called X", "ల్యాప్టాప్ అనే ప్రొడక్ట్", "X नाम का प्रोडक्ट"
  const patterns = [
    /(?:product\s+(?:named|called)\s+)([\w\s]+?)(?:\s+(?:with|quantity|price|qty)|$)/i,
    /(?:product\s+)([\w\s]+?)(?:\s+(?:with|quantity|price|qty|to)|$)/i,
    /([\w\s]+?)\s+(?:అనే\s+ప్రొడక్ట్|ప్రొడక్ట్ను|ప్రొడక్ట్)/i,
    /([\u0900-\u097F\w\s]+?)\s+(?:नाम\s+का\s+प्रोडक्ट|प्रोडक्ट\s+को|प्रोडक्ट)/i,
  ];

  for (const pat of patterns) {
    const m = norm.match(pat);
    if (m && m[1]) {
      const extracted = m[1].replace(/^(a|an|the|new)\s+/i, "").trim();
      if (extracted.length > 1 && !["new", "a", "called", "named"].includes(extracted)) {
        return extracted.charAt(0).toUpperCase() + extracted.slice(1);
      }
    }
  }

  return null;
}


// DB-ONLY product match: checks the product list loaded from MySQL and NEVER
// falls back to the hardcoded synonym table. Used whenever the user is
// providing a NEW product name so their exact name ("Touch Pad Phone") is
// never replaced by a predefined canonical name ("Smartphone").
export function findKnownProductInText(text, knownProducts = []) {
  const norm = normalizeText(text);
  for (const prod of knownProducts || []) {
    const pName = String((prod && prod.name) || prod || "")
      .toLowerCase()
      .trim();
    if (pName && norm.includes(pName)) {
      return (prod && prod.name) || prod;
    }
  }
  return null;
}

// Preserve the user's typed casing. Voice input (and normalizeText) arrives
// lowercased, so a name with no capital letters at all is title-cased
// ("touch pad phone" -> "Touch Pad Phone"). Anything that already contains
// capitals is returned EXACTLY as typed ("Apple iPhone 15").
export function titleCaseIfLower(value) {
  const text = String(value || "").trim();
  if (!text) return text;
  if (/[A-Z]/.test(text)) return text;
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Confirmation detection (Yes/No)
export function parseConfirmation(text) {
  const norm = normalizeText(text);
  const yesWords = [
    "yes", "yeah", "yep", "confirm", "sure", "ok", "okay", "proceed", "do it",
    "go ahead", "please", "agreed", "correct", "right", "go", "done",
    "delete", "remove",
    "అవును", "హా", "సరే", "ఖచ్చితంగా", "చేయి", "తొలగించు",
    "हाँ", "हाँ जी", "पक्का", "करो", "ठीक है", "हटाओ", "हाँजी"
  ];
  const noWords = [
    "no", "nope", "cancel", "stop", "abort", "don't", "dont", "never mind",
    "వద్దు", "లేదు", "రద్దు", "ఆపు", "చేయవద్దు",
    "नहीं", "मत करो", "रद्द करो", "रहने दो", "ना", "रद्द"
  ];

  for (const word of yesWords) {
    if (norm === word || norm.startsWith(word + " ") || norm.endsWith(" " + word) || norm.includes(word)) {
      return true;
    }
  }
  for (const word of noWords) {
    if (norm === word || norm.startsWith(word + " ") || norm.endsWith(" " + word) || norm.includes(word)) {
      return false;
    }
  }
  return null;
}

// Month parsing for dates
const MONTHS = {
  january: 1, jan: 1, జనవరి: 1, जनवरी: 1,
  february: 2, feb: 2, ఫిబ్రవరి: 2, फरवरी: 2,
  march: 3, mar: 3, మార్చి: 3, मार्च: 3,
  april: 4, apr: 4, ఏప్రిల్: 4, अप्रैल: 4,
  may: 5, మే: 5, मई: 5,
  june: 6, jun: 6, జూన్: 6, जून: 6,
  july: 7, jul: 7, జూలై: 7, जुलाई: 7,
  august: 8, aug: 8, ఆగస్టు: 8, अगस्त: 8,
  september: 9, sep: 9, సెప్టెంబర్: 9, సెప్టెంబరు: 9, सितंबर: 9, सितम्बर: 9,
  october: 10, oct: 10, అక్టోబర్: 10, అక్టోబరు: 10, अक्टूबर: 10,
  november: 11, nov: 11, నవంబర్: 11, నవంబరు: 11, नवंबर: 11,
  december: 12, dec: 12, డిసెంబర్: 12, డిసెంబరు: 12, दिसंबर: 12,
};
// ---------------------------------------------------------------------------
// Date helpers (local-time, so "today"/"this month" are correct in IST)
// ---------------------------------------------------------------------------

// Format a Date as a local YYYY-MM-DD string. The previous implementation used
// toISOString() (UTC), which shifts "today" / month starts by a day in IST.
export function localISODate(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Find a month name in the text (English/Telugu/Hindi). Returns the earliest
// (and longest on ties) match so "september" wins over "sep".
function findMonthInText(norm) {
  let best = null;
  for (const [mName, mNum] of Object.entries(MONTHS)) {
    const idx = norm.indexOf(mName);
    if (idx !== -1) {
      if (best === null || idx < best.index || (idx === best.index && mName.length > best.name.length)) {
        best = { name: mName, num: mNum, index: idx };
      }
    }
  }
  return best;
}

// Parse a single date phrase such as "today", "yesterday", "1 September",
// "September 5 2026", "05-10-2026" or "2026-10-05". Returns {y, m, d} or null.
// When asMonthEnd is true and no day is spoken (e.g. "...to October"), the
// last day of that month is used.
export function parseDatePhrase(phrase, asMonthEnd = false) {
  const norm = normalizeText(phrase || "");
  if (!norm) return null;
  const now = new Date();
  let year = now.getFullYear();
  const yearMatch = norm.match(/\b(\d{4})\b/);
  if (yearMatch) year = parseInt(yearMatch[1], 10);

  if (norm.includes("today") || norm.includes("ఈరోజు") || norm.includes("आज")) {
    return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
  }
  if (norm.includes("yesterday") || norm.includes("నిన్న") || norm.includes("बीता कल") || norm.includes("बिता कल")) {
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    return { y: yest.getFullYear(), m: yest.getMonth() + 1, d: yest.getDate() };
  }

  // Numeric dates: YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY
  let m = norm.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return { y: parseInt(m[1], 10), m: parseInt(m[2], 10), d: parseInt(m[3], 10) };
  m = norm.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m) return { y: parseInt(m[3], 10), m: parseInt(m[2], 10), d: parseInt(m[1], 10) };
  m = norm.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return { y: parseInt(m[3], 10), m: parseInt(m[2], 10), d: parseInt(m[1], 10) };

  // "1 September" / "September 1" / "1st Oct 2026" / "సెప్టెంబర్ 5"
  const monthInfo = findMonthInText(norm);
  if (monthInfo) {
    const dayMatch = norm.match(/\b\d{1,2}\b/);
    const day = dayMatch
      ? parseInt(dayMatch[0], 10)
      : asMonthEnd
      ? new Date(year, monthInfo.num, 0).getDate()
      : 1;
    return { y: year, m: monthInfo.num, d: day };
  }
  return null;
}


// Date range parser
export function parseDateRange(text) {
  const norm = normalizeText(text);
  const now = new Date();
  const currentYear = now.getFullYear();

  // Explicit range: "from 1 September to 30 September", "from 1 October to 5
  // October", or the Telugu/Hindi forms "X నుండి Y వరకు" / "X से Y तक".
  const rangeEn = norm.match(/(?:from|నుండి|నుంచి)\s+(.+?)\s+(?:to|till|until|వరకు|तक)\s+(.+)$/);
  const rangeIndic = norm.match(/(.+?)\s+(?:నుండి|నుంచి|से)\s+(.+?)\s+(?:వరకు|तक)\b/);
  const rangeMatch = rangeEn || rangeIndic;
  if (rangeMatch) {
    const fromDate = parseDatePhrase(rangeMatch[1]);
    const toDate = parseDatePhrase(rangeMatch[2], true);
    if (fromDate && toDate) {
      const pad = (value) => String(value).padStart(2, "0");
      const label = `${pad(fromDate.d)}-${pad(fromDate.m)}-${fromDate.y} to ${pad(toDate.d)}-${pad(toDate.m)}-${toDate.y}`;
      return {
        from: localISODate(new Date(fromDate.y, fromDate.m - 1, fromDate.d)),
        to: localISODate(new Date(toDate.y, toDate.m - 1, toDate.d)),
        label,
      };
    }
  }

  // "today", "ఈరోజు", "आज"
  if (norm.includes("today") || norm.includes("ఈరోజు") || norm.includes("आज")) {
    const dStr = localISODate(now);
    return { from: dStr, to: dStr, label: "Today" };
  }

  // "yesterday", "నిన్న", "कल"
  if (norm.includes("yesterday") || norm.includes("నిన్న") || norm.includes("कल")) {
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    const dStr = localISODate(yest);
    return { from: dStr, to: dStr, label: "Yesterday" };
  }

  // "last 7 days", "గత 7 రోజులు", "पिछले 7 दिन"
  if (norm.includes("7 day") || norm.includes("last 7") || norm.includes("7 రోజు") || norm.includes("7 दिन")) {
    const past = new Date(now);
    past.setDate(past.getDate() - 6);
    return { from: localISODate(past), to: localISODate(now), label: "Last 7 Days" };
  }

  // "last N days" (e.g. "last 30 days")
  const lastN = norm.match(/last\s+(\d+)\s+days?/);
  if (lastN) {
    const days = parseInt(lastN[1], 10);
    const past = new Date(now);
    past.setDate(past.getDate() - (days - 1));
    return { from: localISODate(past), to: localISODate(now), label: `Last ${days} Days` };
  }

  // "this month", "ఈ నెల", "इस महीने"
  if (norm.includes("this month") || norm.includes("ఈ నెల") || norm.includes("इस महीने")) {
    const startOfMonth = new Date(currentYear, now.getMonth(), 1);
    return {
      from: localISODate(startOfMonth),
      to: localISODate(now),
      label: "This Month",
    };
  }

  // "monthly" (e.g. "Show monthly sales")
  if (norm.includes("monthly") || norm.includes("నెలవారీ") || norm.includes("मासिक")) {
    const startOfMonth = new Date(currentYear, now.getMonth(), 1);
    return {
      from: localISODate(startOfMonth),
      to: localISODate(now),
      label: "This Month",
    };
  }

  // "last month" / "previous month", "గత నెల", "पिछले महीने"
  if (
    norm.includes("last month") ||
    norm.includes("previous month") ||
    norm.includes("గత నెల") ||
    norm.includes("पिछले महीने") ||
    norm.includes("पिछले महीना")
  ) {
    const start = new Date(currentYear, now.getMonth() - 1, 1);
    const end = new Date(currentYear, now.getMonth(), 0);
    return {
      from: localISODate(start),
      to: localISODate(end),
      label: "Last Month",
    };
  }

  // Specific Month like "September", "సెప్టెంబర్", "सितंबर"
  for (const [mName, mNum] of Object.entries(MONTHS)) {
    if (norm.includes(mName)) {
      const monthEnd = new Date(currentYear, mNum, 0);
      const mStr = String(mNum).padStart(2, "0");
      const lastDay = String(monthEnd.getDate()).padStart(2, "0");
      return {
        from: `${currentYear}-${mStr}-01`,
        to: `${currentYear}-${mStr}-${lastDay}`,
        label: mName.charAt(0).toUpperCase() + mName.slice(1),
      };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Bill / invoice entity extraction
// ---------------------------------------------------------------------------

// Words that never belong to a customer name in a bill command. Covers the
// English command grammar plus Telugu/Hindi markers (యొక్క/का/की...).
const BILL_STOP_WORDS = new Set([
  "show", "display", "open", "generate", "create", "get", "find", "give", "me",
  "the", "a", "an", "bill", "bills", "invoice", "invoices", "latest", "last",
  "recent", "newest", "new", "today", "yesterday", "details", "detail", "of",
  "for", "with", "please", "id", "number", "no", "sale", "sales", "purchase",
  "purchases", "one",
  "చూపించు", "చూపు", "తెరవండి", "తెరువు", "బిల్లు", "బిల్లును", "ఇన్వాయిస్",
  "ఇన్‌వాయిస్", "రూపొందించు", "చివరి", "తాజా", "యొక్క", "కోసం", "వివరాలు",
  "నాకు", "ఐడి", "నంబర్", "ఈరోజు", "నిన్న", "కొనుగోలు", "అమ్మకం", "అమ్మకాలు",
  "ఒకటి",
  "दिखाओ", "दिखाएं", "खोलो", "बनाएं", "बनाओ", "बिल", "इनवॉइस",
  "का", "की", "के", "को", "से", "लिए", "नवीनतम", "विवरण", "मुझे",
  "आज", "कल", "खरीद", "बिक्री", "नंबर", "आईडी", "एक",
]);

// Extract entities from a bill/invoice command. Distinguishes:
//   - invoice number  : "Show invoice INV-2026-0005"
//   - invoice id      : "Show invoice number 5"
//   - sale id         : "Generate bill for sale 12"
//   - customer name   : "Show Seetha's bill" / "राम का बिल दिखाओ"
// so the voice layer never treats a person's name as an invoice number or id.
export function extractBillEntities(norm) {
  const latest =
    norm.includes("latest") ||
    norm.includes("last bill") ||
    norm.includes("recent") ||
    norm.includes("newest") ||
    norm.includes("చివరి") ||
    norm.includes("తాజా") ||
    norm.includes("नवीनतम") ||
    norm.includes("नवीन");

  // Invoice number pattern: INV-2026-0005 / inv 2026 0005 / inv2026-5
  const invMatch = norm.match(/inv[a-z]*\s*[-–]?\s*(\d{4})\s*[-–]?\s*(\d{1,6})/);
  if (invMatch) {
    const seq = String(parseInt(invMatch[2], 10)).padStart(4, "0");
    return {
      latest,
      invoiceNumber: `INV-${invMatch[1]}-${seq}`,
      invoiceId: null,
      saleId: null,
      customerRaw: null,
    };
  }

  // Explicit invoice id: "invoice number 5", "invoice 5"
  const invIdMatch = norm.match(
    /inv[a-z]*\s*(?:number|no|నంబర్|नंबर)?\s*[:#]?\s*(\d{1,6})/
  );
  if (invIdMatch) {
    return {
      latest,
      invoiceNumber: null,
      invoiceId: parseInt(invIdMatch[1], 10),
      saleId: null,
      customerRaw: null,
    };
  }

  // Explicit sale id: "sale 12", "sale id 12", "bill for sale 12"
  const saleMatch = norm.match(/sale\s*(?:id)?\s*[:#]?\s*(\d{1,6})/);
  if (saleMatch) {
    return {
      latest,
      invoiceNumber: null,
      invoiceId: null,
      saleId: parseInt(saleMatch[1], 10),
      customerRaw: null,
    };
  }

  // Customer name: strip the command grammar, keep the name tokens.
  const cleaned = norm
    .replace(/inv[a-z]*\s*[-–]?\s*\d{0,4}\s*[-–]?\s*\d{0,6}/g, " ")
    .replace(/['’]s\b|s'\b/g, " ")
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ");
  const nameTokens = cleaned
    .split(/\s+/)
    .filter(
      (token) =>
        token.length >= 2 &&
        !BILL_STOP_WORDS.has(token) &&
        !/^\d+$/.test(token)
    );
  return {
    latest,
    invoiceNumber: null,
    invoiceId: null,
    saleId: null,
    customerRaw: nameTokens.length > 0 ? nameTokens.join(" ") : null,
  };
}

// ---------------------------------------------------------------------------
// Customer / supplier name extraction (sales, purchases, purchase bills)
// ---------------------------------------------------------------------------

const normalizePersonValue = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/\s+/g, " ")
    .trim();

// Grammar words that can never be part of a customer/supplier name.
const NAME_STOP_WORDS = new Set([
  ...BILL_STOP_WORDS,
  "sell", "sold", "buy", "bought", "record", "do", "make", "units", "unit",
  "pieces", "piece", "each", "at", "rate", "rupees", "rupee", "rs", "inr",
  "and", "product", "products", "item", "items",
  "అమ్ము", "అమ్మండి", "అమ్మావి", "కొను", "చేయి", "చేయండి", "నమోదు",
  "ఉత్పత్తి", "ఐటెమ్",
  "बेचो", "बेच", "बेचें", "बिकवाओ", "खरीदो", "करो", "करें", "दो", "बनाओ",
  "उत्पाद", "आइटम",
]);

// Clean a raw name candidate: remove spoken product names, numbers, grammar
// words and punctuation; join the remaining tokens into a name string.
function cleanPersonName(text, knownProducts = []) {
  let cleaned = String(text || "").toLowerCase();
  for (const prod of knownProducts || []) {
    const prodName = normalizePersonValue(typeof prod === "string" ? prod : prod && prod.name);
    if (prodName) cleaned = cleaned.replaceAll(prodName, " ");
  }
  cleaned = cleaned
    .replace(/\d+/g, " ")
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ");
  const tokens = cleaned
    .split(/\s+/)
    .filter(
      (token) =>
        token.length >= 2 && !NAME_STOP_WORDS.has(token) && !/^\d+$/.test(token)
    );
  return tokens.length > 0 ? tokens.join(" ") : null;
}

// Customer name from a sale command:
//   "Sell 2 laptops to Ram" / "Create a sale for Ram" / "राम को 2 लैपटॉप बेचो"
//   / "సీత కి 2 ల్యాప్‌టాప్‌లు అమ్ము"
export function extractCustomerFromSale(norm, knownProducts = []) {
  let candidate = null;
  const enMatch = norm.match(/(?:\bto|\bfor)\s+(.+)$/);
  if (enMatch) candidate = enMatch[1];
  if (!candidate) {
    const hiMatch = norm.match(/(.+?)\s+(?:को|के लिए)\s+/);
    if (hiMatch) candidate = hiMatch[1];
  }
  if (!candidate) {
    const teMatch = norm.match(/(.+?)\s+(?:కి|కు|కోసం)\s+/);
    if (teMatch) candidate = teMatch[1];
  }
  if (!candidate) return null;
  // Cut at the first number so "for ram 2 laptops" keeps only "ram".
  candidate = candidate.split(/\d/)[0];
  return cleanPersonName(candidate, knownProducts);
}

// Supplier name from a purchase command:
//   "Purchase 10 laptops from ABC Suppliers" / "ABC నుండి ..." / "XYZ से ..."
export function extractSupplierFromPurchase(norm, knownProducts = []) {
  let candidate = null;
  const enMatch = norm.match(/\bfrom\s+(.+)$/);
  if (enMatch) candidate = enMatch[1];
  if (!candidate) {
    const indicMatch = norm.match(/(.+?)\s+(?:నుండి|నుంచి|से)\s+/);
    if (indicMatch) candidate = indicMatch[1];
  }
  if (!candidate) return null;
  // Cut at the first number so "from abc suppliers 10 laptops" keeps only
  // "abc suppliers".
  candidate = candidate.split(/\d/)[0];
  return cleanPersonName(candidate, knownProducts);
}

// Shared pending-answer routers (called first from parseVoiceCommand step 0
// AND from the position-based section 2 blocks, so bare answers like
// "Laptop" / "20" always complete the conversational add/update flow).
function parseAddPendingAnswer(norm, pending, knownProducts = [], rawText = "") {
  const numbers = extractNumbers(norm);

  if (pending.step === "CONFIRM_ADD") {
    const conf = parseConfirmation(norm);
    if (conf === true) {
      return { intent: "CONFIRM_ACTION", confirmed: true, pendingAction: pending };
    }
    if (conf === false) {
      return { intent: "CANCEL_ACTION", confirmed: false, pendingAction: pending };
    }
    return { intent: "CANCEL_ACTION", confirmed: false, pendingAction: pending };
  }
  if (pending.step === "CATEGORY") {
    const category = norm
      .replace(/\bcategory\b|\bis\b|\bas\b|వర్గం|श्रेणी/g, " ")
      .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (category) {
      return { intent: "PROVIDE_FIELD", field: "category", value: category, pendingAction: pending };
    }
    return null;
  }
  if (pending.step === "QUANTITY") {
    if (numbers.length > 0) {
      return { intent: "PROVIDE_FIELD", field: "quantity", value: numbers[0], pendingAction: pending };
    }
    return null;
  }
  if (pending.step === "PRICE") {
    if (numbers.length > 0) {
      return { intent: "PROVIDE_FIELD", field: "price", value: numbers[0], pendingAction: pending };
    }
    return null;
  }
  if (pending.step === "NAME") {
    // An existing DB product keeps its exact DB name; otherwise the user's
    // raw answer is used verbatim (NO synonym mapping, so "Touch Pad Phone"
    // can never become "Smartphone").
    const prodName =
      findKnownProductInText(norm, knownProducts) ||
      titleCaseIfLower(String(rawText || norm).trim());
    return { intent: "PROVIDE_FIELD", field: "name", value: prodName, pendingAction: pending };
  }
  return null;
}

function parseUpdatePendingAnswer(norm, pending, knownProducts = []) {
  void knownProducts;
  if (pending.step === "FIELD") {
    let field = null;
    if (
      norm.includes("quantity") ||
      norm.includes("stock") ||
      norm.includes("క్వాంటిటీ") ||
      norm.includes("స్టాక్") ||
      norm.includes("स्टॉक")
    ) {
      field = "quantity";
    } else if (
      norm.includes("price") ||
      norm.includes("ధర") ||
      norm.includes("कीमत") ||
      norm.includes("मूल्य")
    ) {
      field = "price";
    } else if (
      norm.includes("category") ||
      norm.includes("వర్గం") ||
      norm.includes("श्रेणी")
    ) {
      field = "category";
    }
    if (field) {
      // The utterance may already carry the value:
      //   "quantity 30" / "quantity to 30"  -> value 30
      //   "category electronics"            -> value "electronics"
      // Otherwise just confirm the field and ask for the value next turn.
      if (field === "category") {
        const rest = norm
          .replace(/\bcategory\b|\bis\b|\bas\b|\bto\b|వర్గం|श्रेणी/g, " ")
          .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
          .replace(/\s+/g, " ")
          .trim();
        if (rest) {
          return {
            intent: "PROVIDE_FIELD",
            field,
            value: rest,
            pendingAction: { ...pending, field, step: "VALUE" },
          };
        }
      } else {
        const nums = extractNumbers(norm);
        if (nums.length > 0) {
          return {
            intent: "PROVIDE_FIELD",
            field,
            value: nums[0],
            pendingAction: { ...pending, field, step: "VALUE" },
          };
        }
      }
      return {
        intent: "PROVIDE_FIELD",
        field,
        value: null,
        advanceToValue: true,
        pendingAction: { ...pending, field, step: "VALUE" },
      };
    }
    return null;
  }
  if (pending.step === "VALUE") {
    if (pending.field === "category") {
      const value = norm
        .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (value) {
        return { intent: "PROVIDE_FIELD", field: "category", value, pendingAction: pending };
      }
      return null;
    }
    const numbers = extractNumbers(norm);
    if (numbers.length > 0) {
      return { intent: "PROVIDE_FIELD", field: pending.field, value: numbers[0], pendingAction: pending };
    }
    return null;
  }
  return null;
}

// Multi-turn ADD PURCHASE answers ("Add a purchase from ABC Electronics" ->
// "Laptop" -> "10" -> "50000").
function parsePurchasePendingAnswer(norm, pending, knownProducts = [], rawText = "") {
  const numbers = extractNumbers(norm);

  if (pending.step === "PRODUCT") {
    // Prefer an existing DB product, then the synonym matcher, then the raw
    // answer (the backend validates that the product really exists).
    const prod =
      findKnownProductInText(norm, knownProducts) ||
      findProductInText(norm, knownProducts) ||
      titleCaseIfLower(String(rawText || norm).trim());
    if (prod) {
      return { intent: "PROVIDE_FIELD", field: "product", value: prod, pendingAction: pending };
    }
    return null;
  }
  if (pending.step === "QUANTITY") {
    if (numbers.length > 0) {
      return { intent: "PROVIDE_FIELD", field: "quantity", value: numbers[0], pendingAction: pending };
    }
    return null;
  }
  if (pending.step === "PRICE") {
    if (numbers.length > 0) {
      return { intent: "PROVIDE_FIELD", field: "price", value: numbers[0], pendingAction: pending };
    }
    return null;
  }
  return null;
}

function parsePendingAnswer(norm, context, knownProducts = [], rawText = "") {
  const pending = context.pendingAction;
  if (!pending) return null;
  if (pending.type === "ADD_PRODUCT") return parseAddPendingAnswer(norm, pending, knownProducts, rawText);
  if (pending.type === "UPDATE_PRODUCT") return parseUpdatePendingAnswer(norm, pending, knownProducts);
  if (pending.type === "ADD_PURCHASE") return parsePurchasePendingAnswer(norm, pending, knownProducts, rawText);
  return null;
}

// Multi-field product update extraction:
//   "Update Laptop quantity to 30" / "Update Laptop price to 60000"
//   "Update Laptop category to Electronics"
//   "Update Laptop quantity to 30 and price to 60000"
export function extractProductUpdate(norm, knownProducts = []) {
  const product = findProductInText(norm, knownProducts);
  const updates = {};

  // Category: "category to electronics" / "category electronics"
  // Commas must terminate the capture ("category Electronics, price 60000").
  const catMatch = norm.match(
    /\bcategory\b[:\s]*(?:is\s+|as\s+|to\s+|into\s+)?([a-z][a-z\s]*?)(?=\s*(?:,|\band\b|\bwith\b|\bqty\b|\bquantity\b|\bprice\b|\bstock\b|\bminimum\b)|\s*,?\s*\d|$)/
  );
  if (catMatch) {
    const value = catMatch[1]
      .replace(/[\s,]+$/g, "")
      .replace(/^(and|with)\s+/i, "")
      .replace(/\s+(and|with)$/i, "")
      .trim();
    if (value) updates.category = value;
  }

  const qtyMatch = norm.match(
    /\b(?:quantity|stock|qty)\s*(?:to|as|is|=|into)?\s*(\d+)/
  );
  const priceMatch = norm.match(/\bprice\s*(?:to|as|is|=|into)?\s*(\d+)/);
  if (qtyMatch) updates.quantity = parseInt(qtyMatch[1], 10);
  if (priceMatch) updates.price = parseInt(priceMatch[1], 10);

  // Fallback when "to" is not spoken: "update laptop price 60000"
  if (updates.quantity === undefined && updates.price === undefined && !updates.category) {
    const nums = extractNumbers(norm);
    if (norm.includes("price")) {
      if (nums.length > 0) updates.price = nums[nums.length - 1];
    } else if (norm.includes("quantity") || norm.includes("stock")) {
      if (nums.length > 0) updates.quantity = nums[nums.length - 1];
    }
  }
  return { product, updates };
}

// Extract a NEW product name from an add-product command (the product does
// NOT exist in the DB yet). The name comes from the RAW user text so the
// exact wording and casing are preserved ("Touch Pad Phone", "Wireless
// Bluetooth Headphones", "Apple iPhone 15"). The hardcoded synonym table is
// NEVER consulted here — user-entered names are never rewritten to predefined
// names ("phone" must not become "Smartphone").
// Returns { name, rest }: rest is the command minus the extracted name and is
// used for quantity/price extraction so digits inside the name ("iPhone 15")
// can never be mistaken for the price.
function extractNewProductSpec(norm, knownProducts = [], rawText = "") {
  const stripGrammarFrom = (text) => {
    let candidate = String(text || "").trim();
    candidate = candidate.replace(
      /^\s*(?:please\s+)?(?:add|create|new)\s+/i,
      " "
    );
    candidate = candidate.replace(
      /^\s*(?:a\s+|an\s+)?(?:new\s+)?(?:product|products)\s*/i,
      " "
    );
    candidate = candidate.replace(
      /^\s*(?:named|called|name\s+is|name)\s+/i,
      " "
    );
    candidate = candidate.replace(/^\s*(?:for|to|with|of)\s+/i, " ");
    // The name ends at the first comma or at the first field keyword, so
    // "Touch Pad Phone, category Mobile Accessories, quantity 10" keeps only
    // "Touch Pad Phone".
    const cut = candidate.search(
      /,|\b(?:with|category|qty|quantity|price|cost|rate|stock|minimum)\b/i
    );
    if (cut > 0) candidate = candidate.slice(0, cut);
    candidate = candidate
      .replace(/[^0-9\p{L}\p{M}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
    return candidate;
  };

  const raw = String(rawText || "").trim();

  // 1) An EXISTING database product keeps its exact DB name.
  const known = findKnownProductInText(norm, knownProducts);
  if (known) {
    const knownLower = String(known).toLowerCase();
    const idx = norm.indexOf(knownLower);
    const rest =
      idx >= 0
        ? norm.slice(0, idx) + " " + norm.slice(idx + knownLower.length)
        : norm;
    return { name: known, rest };
  }

  // 2) "add a product named Deskmat ..." — matched on the RAW text so the
  //    user's original casing is preserved.
  const namedSource = raw || norm;
  const named = namedSource.match(
    /\b(?:named|called|name\s+is|name)\s+([a-z0-9][a-z0-9\s]*?)(?=\s*,?\s*(?:with|category|qty|quantity|price|cost|rate|stock|minimum)\b|\s*,|\s+\d|$)/i
  );
  let name = null;
  if (named && named[1]) {
    const value = named[1]
      .replace(/[^0-9\p{L}\p{M}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (value.length > 1) name = value;
  }

  // 3) Otherwise strip the command grammar and cut at the first comma /
  //    field keyword (on the raw text: casing and digits survive).
  if (!name) {
    name = stripGrammarFrom(raw || norm) || null;
    if (name && name.length < 2) name = null;
    // Reject leftovers that are only grammar words ("Add a new product"
    // must still ask for the name instead of creating a product called "A").
    if (name && /^(?:a|an|the|add|create|new|product|products)$/i.test(name)) {
      name = null;
    }
  }
  if (!name) return { name: null, rest: norm };
  name = titleCaseIfLower(name);

  // Remove the extracted name from the normalized command so the remaining
  // spec part (category / quantity / price) is parsed from clean text.
  const nameLower = String(name).toLowerCase();
  let rest = norm;
  const idx = norm.indexOf(nameLower);
  if (idx >= 0) {
    rest = norm.slice(0, idx) + " " + norm.slice(idx + nameLower.length);
  }
  return { name, rest };
}

// Back-compat helper returning only the name.
function extractNewProductName(norm, knownProducts = [], rawText = "") {
  return extractNewProductSpec(norm, knownProducts, rawText).name;
}

// Extract quantity and price using keyword proximity
function extractProductEntities(norm) {
  let qty = null;
  let price = null;

  // Quantity patterns: e.g. "quantity 20", "qty 20", "20 క్వాంటిటీ", "10 मात्रा"
  const qtyPatterns = [
    /(?:quantity|qty|stock)\s+(\d+)/i,
    /(\d+)\s+(?:quantity|qty|units|పీసులు|క్వాంటిటీ|మాత్రా|मात्रा)/i,
    /(?:క్వాంటిటీతో|క్వాంటిటీ|మాత్ర)\s*(\d+)/i,
    /(\d+)\s*(?:క్వాంటిటీతో|క్వాంటిటీ|మాత్రా|मात्रा)/i,
  ];

  for (const pat of qtyPatterns) {
    const m = norm.match(pat);
    if (m && m[1]) {
      qty = parseInt(m[1], 10);
      break;
    }
  }

  // Price patterns: e.g. "price 50000", "50000 ధరకు", "50000 రూపాయల", "50000 रुपये कीमत"
  const pricePatterns = [
    /(?:price|cost|rate)\s+(?:to\s+)?(\d+)/i,
    /(\d+)\s*(?:ధరకు|ధర|రూపాయల|రూపాయలు|कीमत|रुपये|रुपए|रु)/i,
    /(?:ధర|ధరకు|కీమత్|कीमत)\s*(\d+)/i,
    /(?:rs|inr|₹)\s*(\d+)/i,
  ];

  for (const pat of pricePatterns) {
    const m = norm.match(pat);
    if (m && m[1]) {
      price = parseFloat(m[1]);
      break;
    }
  }

  // Fallback if patterns didn't match both
  const allNums = extractNumbers(norm);
  if (qty === null && price === null) {
    if (allNums.length >= 2) {
      if (allNums[0] > 1000 && allNums[1] <= 1000) {
        price = allNums[0];
        qty = allNums[1];
      } else {
        qty = allNums[0];
        price = allNums[1];
      }
    } else if (allNums.length === 1) {
      qty = allNums[0];
    }
  } else if (qty === null && allNums.length > 0) {
    qty = allNums.find((n) => n !== price) || allNums[0];
  } else if (price === null && allNums.length > 0) {
    price = allNums.find((n) => n !== qty) || null;
  }

  return { qty, price };
}

// MAIN INTENT PARSER
export function parseVoiceCommand(text, context = {}, knownProducts = []) {
  const norm = normalizeText(text);

  // 0. Pending multi-turn add/update answers MUST win over every global
  // branch below. Bare answers ("Laptop", "20", "Electronics", "30") would
  // otherwise match QUERY/SALE/stock branches first and the conversational
  // flow could never complete.
  const pendingType = context.pendingAction && context.pendingAction.type;
  if (
    (pendingType === "ADD_PRODUCT" ||
      pendingType === "UPDATE_PRODUCT" ||
      pendingType === "ADD_PURCHASE") &&
    !looksLikeFreshCommand(norm)
  ) {
    const routed = parsePendingAnswer(norm, context, knownProducts, text);
    if (routed) return routed;
  }

  // 1. If we are waiting for a confirmation (delete product/supplier/sale/purchase)
  if (context.pendingAction && context.pendingAction.type === "CONFIRM_DELETE") {
    const conf = parseConfirmation(norm);
    if (conf === true) {
      return { intent: "CONFIRM_ACTION", confirmed: true, pendingAction: context.pendingAction };
    } else if (conf === false) {
      return { intent: "CANCEL_ACTION", confirmed: false, pendingAction: context.pendingAction };
    } else {
      // Ambiguous response (not recognized as yes or no) — ask again so
      // the user gets a chance to confirm or cancel without a false "Deletion cancelled".
      return { intent: "ASK_CONFIRMATION", pendingAction: context.pendingAction };
    }
  }


  // 2. If we are in the middle of multi-turn conversational flow (e.g. ADD_PRODUCT missing fields)
  // A fresh top-level command must NEVER be swallowed as an answer — otherwise
  // stale product state leaks into the next command (STEP 8).
  // NOTE: this must run even when knownProducts is empty, otherwise bare
  // answers ("Laptop" / "20") fall through to the global parser and the
  // conversational add flow breaks. (Also routed first via step 0 above;
  // this copy keeps the position-based flow intact for readers.)
  if (
    context.pendingAction &&
    context.pendingAction.type === "ADD_PRODUCT" &&
    !looksLikeFreshCommand(norm)
  ) {
    const routed = parseAddPendingAnswer(norm, context.pendingAction, knownProducts, text);
    if (routed) return routed;
  }

  // 2b. Multi-turn: product update flow ("Update Laptop" -> ask field,
  // "quantity" -> ask value, "update to 30" -> apply)
  // A fresh top-level command ("update mouse ...", "add ...", "show ...")
  // must start a new parse instead of being eaten as the pending answer,
  // otherwise the previous product leaks into the next command (STEP 8).
  if (
    context.pendingAction &&
    context.pendingAction.type === "UPDATE_PRODUCT" &&
    !looksLikeFreshCommand(norm)
  ) {
    const routed = parseUpdatePendingAnswer(
      norm,
      context.pendingAction,
      knownProducts
    );
    if (routed) return routed;
  }

  // 2c. Multi-turn: sale details for a named customer
  // ("Create a sale for Ram" + "2 laptops 50000" -> addSaleForCustomer)
  if (context.pendingAction && context.pendingAction.type === "ADD_SALE") {
    const pending = context.pendingAction;
    if (pending.step === "DETAILS") {
      const prod = findProductInText(norm, knownProducts);
      const { qty, price } = extractProductEntities(norm);
      if (prod && qty !== null) {
        return {
          intent: "PROVIDE_FIELD",
          field: "details",
          value: null,
          product: prod,
          quantity: qty,
          price,
          customerName: pending.customerName,
          pendingAction: pending,
        };
      }
      // If the details don't contain a product, keep asking for the full
      // details (product + quantity + price).
      return { intent: "PROVIDE_FIELD", field: "details", value: null, pendingAction: pending };
    }
  }

  // 2d. Multi-turn: purchase bill for a named supplier
  if (context.pendingAction && context.pendingAction.type === "GENERATE_PURCHASE_BILL") {
    const pending = context.pendingAction;
    const prod = findProductInText(norm, knownProducts);
    const { qty, price } = extractProductEntities(norm);
    if (prod && qty !== null) {
      return {
        intent: "PROVIDE_FIELD",
        field: "details",
        value: null,
        product: prod,
        quantity: qty,
        price,
        pendingAction: pending,
      };
    }
    // Treat remaining purchase-bill answers as the supplier name fallback
    return { intent: "PROVIDE_FIELD", field: "supplier", value: norm.trim() || null, pendingAction: pending };
  }

  // 3. LOW STOCK & INVENTORY QUERIES (Check before general navigation!)
  if (
    norm.includes("low stock") ||
    norm.includes("low in stock") ||
    norm.includes("low-stock") ||
    norm.includes("తక్కువ స్టాక్") ||
    norm.includes("తక్కువ స్టాకు") ||
    norm.includes("కం స్టాక్") ||
    norm.includes("कम स्टॉक") ||
    norm.includes("reorder") ||
    norm.includes("reordering") ||
    norm.includes("రీఆర్డర్") ||
    norm.includes("रीऑर्डर") ||
    norm.includes("need to purchase") ||
    norm.includes("కొనుగోలు చేయాలా") ||
    norm.includes("खरीदने की आवश्यकता")
  ) {
    if (
      norm.includes("open") ||
      norm.includes("go to") ||
      norm.includes("page") ||
      norm.includes("తెరవండి") ||
      norm.includes("వెళ్ళు") ||
      norm.includes("खोलो")
    ) {
      return { intent: "NAVIGATE", path: "/low-stock-alerts", pageName: "Low Stock Alerts" };
    }
    return { intent: "QUERY_LOW_STOCK" };
  }

  // Lowest stock product query
  if (
    norm.includes("lowest stock") ||
    norm.includes("least stock") ||
    norm.includes("అతి తక్కువ స్టాక్") ||
    norm.includes("తక్కువ స్టాక్ ఉన్నది ఏది") ||
    norm.includes("सबसे कम स्टॉक")
  ) {
    return { intent: "QUERY_LOWEST_STOCK" };
  }

  // Out of stock
  if (
    norm.includes("out of stock") ||
    norm.includes("అవుట్ ఆఫ్ స్టాక్") ||
    norm.includes("స్టాక్ లేని") ||
    norm.includes("आउट ऑफ स्टॉक")
  ) {
    return { intent: "QUERY_OUT_OF_STOCK" };
  }

  // Products below quantity X
  if (
    (norm.includes("below") || norm.includes("less than") || norm.includes("కంటే తక్కువ") || norm.includes("से कम")) &&
    (norm.includes("quantity") || norm.includes("stock") || norm.includes("క్వాంటిటీ") || norm.includes("స్టాక్") || norm.includes("మాత్రా") || norm.includes("मात्रा"))
  ) {
    const nums = extractNumbers(norm);
    const threshold = nums.length > 0 ? nums[0] : 10;
    return { intent: "QUERY_PRODUCTS_BELOW_QUANTITY", threshold };
  }

  // Total products query
  if (
    norm.includes("how many products") ||
    norm.includes("total products") ||
    norm.includes("number of products") ||
    norm.includes("ఎన్ని ప్రొడక్ట్స్") ||
    norm.includes("మొత్తం ప్రొడక్ట్స్") ||
    norm.includes("నా దగ్గర ఎన్ని") ||
    norm.includes("कितने प्रोडक्ट्स") ||
    norm.includes("कुल प्रोडक्ट्स")
  ) {
    return { intent: "QUERY_TOTAL_PRODUCTS" };
  }

  // 4. NAVIGATION INTENTS (Specific pages)
  if (
    norm.includes("dashboard") ||
    norm.includes("డాష్‌బోర్డ్") ||
    norm.includes("డ్యాష్‌బోర్డ్") ||
    norm.includes("डैशबोर्ड")
  ) {
    return { intent: "NAVIGATE", path: "/dashboard", pageName: "Dashboard" };
  }

  if (
    norm.includes("go back") ||
    norm.includes("back") ||
    norm.includes("వెనక్కి") ||
    norm.includes("పీచే") ||
    norm.includes("पीछे") ||
    norm.includes("वापस")
  ) {
    return { intent: "NAVIGATE_BACK" };
  }

  if (
    norm.includes("logout") ||
    norm.includes("log out") ||
    norm.includes("లాగ్ అవుట్") ||
    norm.includes("లాగౌట్") ||
    norm.includes("लॉगआउट") ||
    norm.includes("लॉग आउट")
  ) {
    return { intent: "LOGOUT" };
  }

  // Show Inventory
  if (
    norm.includes("inventory") ||
    norm.includes("ఇన్వెంటరీ") ||
    norm.includes("इन्वेंट्री")
  ) {
    return { intent: "NAVIGATE", path: "/inventory", pageName: "Inventory" };
  }

  // AI Stock Prediction navigation or query
  if (
    norm.includes("prediction") ||
    norm.includes("predict") ||
    norm.includes("forecasting") ||
    norm.includes("forecast") ||
    norm.includes("ప్రిడిక్షన్") ||
    norm.includes("అంచనా") ||
    norm.includes("प्रेडिक्शन") ||
    norm.includes("पूर्वानुमान")
  ) {
    const prod = findProductInText(norm, knownProducts);
    if (prod && !norm.includes("open") && !norm.includes("go to") && !norm.includes("తెరవండి") && !norm.includes("खोलो")) {
      return { intent: "AI_PREDICT_PRODUCT", product: prod };
    }
    if (
      norm.includes("open") ||
      norm.includes("go to") ||
      norm.includes("show") ||
      norm.includes("తెరవండి") ||
      norm.includes("వెళ్ళు") ||
      norm.includes("खोलो")
    ) {
      return { intent: "NAVIGATE", path: "/ai-stock-prediction", pageName: "AI Stock Prediction" };
    }
    return { intent: "AI_PREDICT_RECOMMENDATIONS" };
  }

  // "Increase laptop stock by 5" / "Decrease laptop stock by 2"
  // (also Telugu పెంచు/తగ్గించు, Hindi बढ़ाओ/घटाओ). Must run BEFORE the
  // generic update/set-stock handlers so the delta is not mistaken for a
  // final stock value. Reuses the existing product list for name matching.
  const matchedProdEarly = findProductInText(norm, knownProducts);
  const isIncrease =
    norm.includes("increase") ||
    norm.includes("increment") ||
    norm.includes("add ") ||
    norm.includes("పెంచు") ||
    norm.includes("बढ़ा");
  const isDecrease =
    norm.includes("decrease") ||
    norm.includes("decrement") ||
    norm.includes("reduce") ||
    norm.includes("తగ్గించు") ||
    norm.includes("घटा");
  // A full add-product spec also contains "add" + a stock/quantity keyword
  // ("add laptop, electronics, 20 quantity, price 55000"). Price / category /
  // comma-list signals mark it as a NEW PRODUCT spec, never a stock delta.
  const looksLikeAddProductSpec =
    /\b(?:price|cost|rate|category)\b/.test(norm) ||
    norm.includes("ధర") ||
    norm.includes("కీమత్") ||
    norm.includes("वर्ग") ||
    norm.includes("श्रेणी") ||
    norm.includes("వర్గం") ||
    /,\s*\S/.test(norm);
  if (
    matchedProdEarly &&
    !looksLikeAddProductSpec &&
    (norm.includes("stock") ||
      norm.includes("quantity") ||
      norm.includes("స్టాక్") ||
      norm.includes("स्टॉक")) &&
    (isIncrease || isDecrease)
  ) {
    const nums = extractNumbers(norm);
    const delta = nums.length > 0 ? nums[nums.length - 1] : null;
    if (isDecrease) {
      return {
        intent: "UPDATE_PRODUCT_STOCK_DECREMENT",
        product: matchedProdEarly,
        decrement: delta,
      };
    }
    return {
      intent: "ADD_PRODUCT_STOCK_INCREMENT",
      product: matchedProdEarly,
      increment: delta,
    };
  }

  // "Add 5 keyboards" (shorthand stock addition)
  const addStockMatch = norm.match(/^(?:add|యాడ్|जोड़ो)\s+(\d+)\s+([\w\s]+)/i);
  if (addStockMatch) {
    const qty = parseInt(addStockMatch[1], 10);
    const prod = findProductInText(addStockMatch[2], knownProducts);
    if (prod) {
      return { intent: "ADD_PRODUCT_STOCK_INCREMENT", product: prod, increment: qty };
    }
  }

  // 4d. CUSTOMER MANAGEMENT (Add / Delete / Show customers).
  // MUST run BEFORE the add-product section so "add customer Ravi" is never
  // parsed as "add a new product named Ravi".
  const customerAddMatch = norm.match(
    /\b(?:add|create|new)(?:\s+a)?(?:\s+new)?\s+customer(?:\s+(?:named|called))?\s+(.+)/
  );
  const customerDeleteMatch = norm.match(
    /\b(?:delete|remove)(?:\s+the)?\s+customer\s+(.+)/
  );
  if (
    customerAddMatch ||
    customerDeleteMatch ||
    /\b(?:show|open|view)\s+(?:the\s+)?customers?\b/.test(norm)
  ) {
    if (customerDeleteMatch) {
      const name = cleanPersonName(customerDeleteMatch[1], knownProducts);
      if (name) return { intent: "DELETE_CUSTOMER", name };
    }
    if (customerAddMatch) {
      const name = cleanPersonName(customerAddMatch[1], knownProducts);
      if (name) return { intent: "ADD_CUSTOMER", name };
    }
    return { intent: "NAVIGATE", path: "/customers", pageName: "Customers" };
  }

  // 5. ADD PRODUCT (Check BEFORE price updates!)
  const isAddKeywordPresent =
    norm.includes("add a product") ||
    norm.includes("add product") ||
    norm.includes("create product") ||
    norm.includes("new product") ||
    norm.startsWith("add ") ||
    norm.includes("యాడ్ చేయి") ||
    norm.includes("జోడించు") ||
    norm.includes("జోడించండి") ||
    norm.includes("ప్రొడక్ట్ యాడ్") ||
    norm.includes("ప్రొడక్ట్ను యాడ్") ||
    norm.includes("కొత్త ప్రొడక్ట్") ||
    norm.includes("जोड़ो") ||
    norm.includes("जोड़ो") ||
    norm.includes("जोड़ें") ||
    norm.includes("जोड़ें") ||
    norm.includes("नया प्रोडक्ट");

  if (
    isAddKeywordPresent &&
    !norm.includes("supplier") &&
    !norm.includes("purchase") &&
    !norm.includes("sale") &&
    !norm.includes("సప్లయర్") &&
    !norm.includes("కొనుగోలు") &&
    !norm.includes("అమ్మకం") &&
    !norm.includes("सप्लायर") &&
    !norm.includes("खरीद") &&
    !norm.includes("बिक्री")
  ) {
    // Extract the NEW product name from the RAW command (exact name and
    // casing — "Touch Pad Phone" stays "Touch Pad Phone") plus the remaining
    // spec part used for quantity/price extraction, so digits inside the name
    // ("iPhone 15") can never become the price.
    const spec = extractNewProductSpec(norm, knownProducts, text);
    const prod = spec.name;
    const { qty, price } = extractProductEntities(spec.rest);
    // "category electronics" (also Telugu వర్గం / Hindi श्रेणी)
    // Commas must terminate the capture: "category Electronics, quantity 20"
    // otherwise the lazy class (no comma) can never satisfy the lookahead.
    const catMatch = norm.match(
      /\bcategory\b[:\s]*(?:is\s+|as\s+|to\s+|into\s+)?([a-z][a-z\s]*?)(?=\s*(?:,|\band\b|\bwith\b|\bqty\b|\bquantity\b|\bprice\b|\bstock\b|\bminimum\b)|\s*,?\s*\d|$)/
    );
    const productCategory =
      catMatch && catMatch[1]
        ? catMatch[1]
            .replace(/[\s,]+$/g, "")
            .replace(/^(and|with)\s+/i, "")
            .replace(/\s+(and|with)$/i, "")
            .trim() || null
        : null;

    // Comma-style spec without the "category" keyword ("add laptop,
    // electronics, 20 quantity, price 55000"): pull the category out of the
    // comma list after the extracted product name.
    let commaCategory = null;
    if (!productCategory && prod) {
      const commaCat = norm.match(/,\s*([a-z][a-z\s]*?),\s*\d/);
      if (commaCat) {
        const v = commaCat[1].replace(/\s+/g, " ").trim();
        if (v && v.length <= 40 && !/^(?:and|or|with)$/.test(v)) commaCategory = v;
      }
    }

    return {
      intent: "ADD_PRODUCT",
      product: prod,
      quantity: qty,
      price: price,
      category: productCategory || commaCategory || null,
    };
  }

  // 6. DELETE PRODUCT
  if (
    norm.includes("delete") ||
    norm.includes("remove") ||
    norm.includes("తొలగించు") ||
    norm.includes("డిలీట్") ||
    norm.includes("हटाओ") ||
    norm.includes("डिलीट")
  ) {
    if (!norm.includes("supplier") && !norm.includes("సప్లయర్") && !norm.includes("सप्लायर")) {
      const prod = findProductInText(norm, knownProducts);
      return { intent: "DELETE_PRODUCT", product: prod };
    }
  }

  // matchedProd is needed by sections 7–9 below (8b reads it), so compute it
  // up front — it was previously declared AFTER section 8b, causing a
  // ReferenceError (TDZ) for bare commands like "Update Laptop".
  const matchedProd = findProductInText(norm, knownProducts);

  // 7. UPDATE PRODUCT PRICE
  if (
    (norm.includes("price") || norm.includes("ధర") || norm.includes("కీమత్") || norm.includes("कीमत")) &&
    (norm.includes("update") || norm.includes("change") || norm.includes("set") || norm.includes("మార్చు") || norm.includes("కరో") || norm.includes("करो") || norm.includes("बदलो"))
  ) {
    const prod = findProductInText(norm, knownProducts);
    const multi = extractProductUpdate(norm, knownProducts);
    if (multi.updates.quantity !== undefined || multi.updates.category !== undefined) {
      return { intent: "UPDATE_PRODUCT", product: multi.product, updates: multi.updates };
    }
    const nums = extractNumbers(norm);
    return {
      intent: "UPDATE_PRODUCT_PRICE",
      product: multi.product || prod,
      price: nums.length > 0 ? nums[nums.length - 1] : null,
    };
  }

  // 8. UPDATE PRODUCT QUANTITY / STOCK / CATEGORY / MULTI-FIELD
  if (
    (norm.includes("update") || norm.includes("change") || norm.includes("set") || norm.includes("మార్చు") || norm.includes("करो") || norm.includes("बदलो")) &&
    (norm.includes("price") || norm.includes("quantity") || norm.includes("stock") || norm.includes("category") || norm.includes("ధర") || norm.includes("కీమత్") || norm.includes("कीमत") || norm.includes("वर्ग") || norm.includes("श्रेणी") || norm.includes("వర్గం") || norm.includes("క్వాంటిటీ") || norm.includes("స్టాక్") || norm.includes("మాత్రా") || norm.includes("मात्रा"))
  ) {
    const multi = extractProductUpdate(norm, knownProducts);
    if (multi.updates.price !== undefined || multi.updates.category !== undefined) {
      return { intent: "UPDATE_PRODUCT", product: multi.product, updates: multi.updates };
    }
    const prod = multi.product || findProductInText(norm, knownProducts);
    const nums = extractNumbers(norm);
    return {
      intent: "UPDATE_PRODUCT_STOCK",
      product: prod,
      quantity: nums.length > 0 ? nums[nums.length - 1] : null,
    };
  }

  // 8b. General product update: "Update Laptop category to Electronics",
  // "Update Mouse category to Peripherals", or a bare "Update Laptop"
  // (the assistant then asks which detail to change).
  if (
    (norm.includes("update") || norm.includes("change") || norm.includes("set") || norm.includes("మార్చు") || norm.includes("करो") || norm.includes("बदलो")) &&
    (matchedProd || norm.includes("category") || norm.includes("వర్గం") || norm.includes("श्रेणी"))
  ) {
    const { product, updates } = extractProductUpdate(norm, knownProducts);
    return { intent: "UPDATE_PRODUCT", product: product || matchedProd, updates };
  }

  // 9. PRODUCT STOCK QUERY: "How many laptops are available?" / "Show laptop stock"
  if (
    matchedProd &&
    (norm.includes("stock") ||
      norm.includes("available") ||
      norm.includes("how many") ||
      norm.includes("ఎంత ఉంది") ||
      norm.includes("ఉన్నాయి") ||
      norm.includes("స్టాక్") ||
      norm.includes("कितना है") ||
      norm.includes("उपलब्ध") ||
      norm.includes("स्टॉक") ||
      norm.includes("कितने"))
  ) {
    return { intent: "QUERY_PRODUCT_STOCK", product: matchedProd };
  }

  // 10. Suppliers
  if (
    norm.includes("supplier") ||
    norm.includes("suppliers") ||
    norm.includes("సప్లయర్") ||
    norm.includes("సప్లయర్స్") ||
    norm.includes("सप्लायर") ||
    norm.includes("सप्लायर्स")
  ) {
    if (norm.includes("delete") || norm.includes("remove") || norm.includes("తొలగించు") || norm.includes("हटाओ")) {
      const parts = norm.split(/supplier|సప్లయర్|सप्लायर/i);
      const name = parts[1] ? parts[1].replace(/delete|remove|తొలగించు|हटाओ/gi, "").trim() : "";
      return { intent: "DELETE_SUPPLIER", name };
    }
    if (norm.includes("add") || norm.includes("create") || norm.includes("యాడ్") || norm.includes("జోడించు") || norm.includes("जोड़ो")) {
      const parts = norm.split(/supplier|సప్లయర్|सप्लायर/i);
      const name = parts[1] ? parts[1].replace(/add|create|యాడ్|జోడించు|जोड़ो/gi, "").trim() : "";
      return { intent: "ADD_SUPPLIER", name };
    }
    return { intent: "NAVIGATE", path: "/suppliers", pageName: "Suppliers" };
  }

  // 11. Purchases
  if (
    norm.includes("purchase") ||
    norm.includes("purchases") ||
    norm.includes("కొనుగోలు") ||
    norm.includes("కొనుగోళ్లు") ||
    norm.includes("खरीद") ||
    norm.includes("पर्चेस")
  ) {
    if (norm.includes("bill") || norm.includes("bills") || norm.includes("బిల్లు") || norm.includes("बिल")) {
      return {
        intent: "GENERATE_PURCHASE_BILL",
        supplierRaw: cleanPersonName(norm, knownProducts),
      };
    }
    // "Show purchase report" / "Show monthly purchases report" -> open the
    // existing Reports & Analytics page on the purchases tab.
    if (
      norm.includes("report") ||
      norm.includes("reports") ||
      norm.includes("రిపోర్ట్") ||
      norm.includes("రిపోర్ట్స్") ||
      norm.includes("रिपोर्ट") ||
      norm.includes("रिपोर्ट्स")
    ) {
      return { intent: "GENERATE_REPORT", range: parseDateRange(norm), type: "purchases" };
    }
    if (norm.includes("today") || norm.includes("ఈరోజు") || norm.includes("आज")) {
      return { intent: "SHOW_TODAY_PURCHASES" };
    }
    if (norm.includes("add") || norm.includes("యాడ్") || norm.includes("జోడించు") || norm.includes("जोड़ो")) {
      const prod = findProductInText(norm, knownProducts);
      const nums = extractNumbers(norm);
      const { qty, price } = extractProductEntities(norm);
      return {
        intent: "ADD_PURCHASE",
        product: prod,
        quantity: qty !== null ? qty : nums.length > 0 ? nums[0] : null,
        price: price !== null ? price : nums.length > 1 ? nums[1] : null,
        supplierRaw: extractSupplierFromPurchase(norm, knownProducts),
      };
    }
    // "Show monthly purchases" -> dated purchases report.
    const purchaseRange = parseDateRange(norm);
    if (purchaseRange) {
      return { intent: "GENERATE_REPORT", range: purchaseRange, type: "purchases" };
    }
    return { intent: "NAVIGATE", path: "/purchases", pageName: "Purchases" };
  }

  // 12. Invoices & Bills
  if (
    norm.includes("bill") ||
    norm.includes("invoice") ||
    norm.includes("invoices") ||
    norm.includes("బిల్లు") ||
    norm.includes("ఇన్‌వాయిస్") ||
    norm.includes("बिल") ||
    norm.includes("इनवॉइस")
  ) {
    if (
      norm.includes("generate") ||
      norm.includes("create") ||
      norm.includes("latest") ||
      norm.includes("రూపొందించు") ||
      norm.includes("చివరి") ||
      norm.includes("बनाएं") ||
      norm.includes("नवीनतम") ||
      norm.includes("show") ||
      norm.includes("చూపించు") ||
      norm.includes("దिखाओ") ||
      norm.includes("दिखाओ")
    ) {
      // Extract the real entities: invoice number (INV-2026-0005), invoice id,
      // sale id, or the customer's name - never treat the spoken name as a
      // number, and never treat an invoice number as a sale id.
      const billEntities = extractBillEntities(norm);
      return {
        intent: "GENERATE_BILL",
        invoiceNumber: billEntities.invoiceNumber,
        invoiceId: billEntities.invoiceId,
        saleId: billEntities.saleId,
        customerRaw: billEntities.customerRaw,
        latest: billEntities.latest,
      };
    }
    return { intent: "NAVIGATE", path: "/invoices", pageName: "Invoices" };
  }

  // 13. Reports
  if (
    norm.includes("report") ||
    norm.includes("reports") ||
    norm.includes("రిపోర్ట్") ||
    norm.includes("రిపోర్ట్స్") ||
    norm.includes("रिपोर्ट") ||
    norm.includes("रिपोर्ट्स")
  ) {
    const range = parseDateRange(norm);
    // Detect the requested report type so the existing Reports & Analytics
    // page can pre-select the matching tab (sales / purchases / overall).
    const reportType =
      norm.includes("purchase") ||
      norm.includes("కొనుగోలు") ||
      norm.includes("కొనుగోళ్లు") ||
      norm.includes("खरीद") ||
      norm.includes("पर्चेस")
        ? "purchases"
        : norm.includes("sale") ||
          norm.includes("అమ్మకం") ||
          norm.includes("అమ్మకాలు") ||
          norm.includes("बिक्री") ||
          norm.includes("सेल्स")
        ? "sales"
        : null;
    if (!range && (norm.includes("profit") || norm.includes("cash flow") || norm.includes("లాభం") || norm.includes("मुनाफा"))) {
      return { intent: "QUERY_CASH_FLOW" };
    }
    // Always return a GENERATE_REPORT intent (range=null means all time, the
    // page's default view) so the voice layer opens the existing Reports &
    // Analytics page AND applies the requested filters to it.
    return { intent: "GENERATE_REPORT", range, type: reportType };
  }

  // 14. Sales
  if (
    norm.includes("sale") ||
    norm.includes("sales") ||
    norm.includes("sell") ||
    norm.includes("sold") ||
    norm.includes("అమ్మకం") ||
    norm.includes("అమ్మకాలు") ||
    norm.includes("అమ్ము") ||
    norm.includes("అమ్మండి") ||
    norm.includes("बिक्री") ||
    norm.includes("सेल्स") ||
    norm.includes("बेचो") ||
    norm.includes("बेच")
  ) {
    if (norm.includes("today") || norm.includes("ఈరోజు") || norm.includes("आज")) {
      return { intent: "QUERY_TODAY_SALES" };
    }
    // "Show total sales" / "Show monthly sales" -> open the existing Reports &
    // Analytics page showing the sales report.
    if (norm.includes("total") || norm.includes("మొత్తం") || norm.includes("कुल") || norm.includes("monthly") || norm.includes("నెలవారీ") || norm.includes("मासिक")) {
      return { intent: "GENERATE_REPORT", range: parseDateRange(norm), type: "sales" };
    }
    if (norm.includes("add") || norm.includes("create") || norm.includes("new") || norm.includes("sell") || norm.includes("sold") || norm.includes("యాడ్") || norm.includes("జోడించు") || norm.includes("అమ్ము") || norm.includes("అమ్మండి") || norm.includes("जोड़ो") || norm.includes("बेचो") || norm.includes("बेच")) {
      const prod = findProductInText(norm, knownProducts);
      const nums = extractNumbers(norm);
      const { qty, price } = extractProductEntities(norm);
      return {
        intent: "ADD_SALE",
        product: prod,
        quantity: qty !== null ? qty : nums.length > 0 ? nums[0] : 1,
        price: price !== null ? price : nums.length > 1 ? nums[1] : null,
        customerRaw: extractCustomerFromSale(norm, knownProducts),
      };
    }
    // "sales for September"
    const range = parseDateRange(norm);
    if (range) {
      return { intent: "GENERATE_REPORT", range, type: "sales" };
    }
    return { intent: "NAVIGATE", path: "/sales", pageName: "Sales" };
  }

  // 15. Open Products page (Explicit navigation)
  if (
    norm === "products" ||
    norm === "open products" ||
    norm === "go to products" ||
    norm === "show products" ||
    norm === "ప్రొడక్ట్స్" ||
    norm === "ప్రొడక్ట్స్ తెరవండి" ||
    norm === "ప్రొడక్ట్స్ పేజీ" ||
    norm === "प्रोडक्ट्स" ||
    norm === "प्रोडक्ट्स खोलो" ||
    norm === "प्रोडक्ट्स पेज" ||
    (norm.includes("products") && (norm.includes("open") || norm.includes("go to") || norm.includes("తెరవండి") || norm.includes("खोलो")))
  ) {
    return { intent: "NAVIGATE", path: "/products", pageName: "Products" };
  }

  // Fallback: unsupported or unrecognized
  return { intent: "UNKNOWN", raw: text };
}
