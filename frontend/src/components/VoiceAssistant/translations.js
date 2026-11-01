// Multilingual Translations and Dynamic Response Generators
// Supported Languages: English ('en'), Telugu ('te'), Hindi ('hi')

export const LANGUAGES = [
  { code: "en", label: "English", speechLang: "en-IN", flag: "🇬🇧" },
  { code: "te", label: "తెలుగు", speechLang: "te-IN", flag: "🇮🇳" },
  { code: "hi", label: "हिन्दी", speechLang: "hi-IN", flag: "🇮🇳" },
];

export const UI_STRINGS = {
  en: {
    title: "AI Voice Assistant",
    subtitle: "Speak or type commands to manage inventory",
    listening: "Listening...",
    processing: "Processing command...",
    speaking: "Speaking...",
    idle: "Click mic or type a command",
    typePlaceholder: "Type a command or click the mic...",
    send: "Send",
    clear: "Clear Chat",
    minimize: "Minimize",
    close: "Close",
    mute: "Mute Voice",
    unmute: "Unmute Voice",
    micTooltip: "Toggle Voice Assistant (Space / Click)",
    notSupportedTitle: "Speech Recognition Unsupported",
    notSupportedMsg:
      "Voice recognition is not supported in this browser. Please use Google Chrome, Microsoft Edge, or another Chromium browser, or type your commands manually.",
    loginRequired: "Please log in first to use the voice assistant.",
    you: "You",
    assistant: "Assistant",
    suggestionsTitle: "Quick Suggestions:",
    suggestions: [
      "Show inventory",
      "Which products are low in stock?",
      "Add a product named Keyboard with quantity 20 and price 800",
      "Show today's sales total",
      "Generate today's sales report",
      "Predict demand for Laptop",
      "Open Dashboard",
    ],
  },
  te: {
    title: "AI వాయిస్ అసిస్టెంట్",
    subtitle: "ఇన్వెంటరీ నిర్వహించడానికి మాట్లాడండి లేదా టైప్ చేయండి",
    listening: "వింటున్నాను...",
    processing: "కమాండ్ ప్రాసెస్ అవుతోంది...",
    speaking: "మాట్లాడుతున్నాను...",
    idle: "మైక్ క్లిక్ చేయండి లేదా కమాండ్ టైప్ చేయండి",
    typePlaceholder: "కమాండ్ టైప్ చేయండి లేదా మాట్లాడండి...",
    send: "పంపు",
    clear: "చాట్ క్లియర్ చేయి",
    minimize: "మినిమైజ్",
    close: "మూసివేయి",
    mute: "వాయిస్ మ్యూట్",
    unmute: "వాయిస్ అన్‌మ్యూట్",
    micTooltip: "వాయిస్ అసిస్టెంట్ ఆన్/ఆఫ్ చేయండి",
    notSupportedTitle: "వాయిస్ రికగ్నిషన్ సపోర్ట్ లేదు",
    notSupportedMsg:
      "ఈ బ్రౌజర్‌లో వాయిస్ రికగ్నిషన్ సపోర్ట్ చేయదు. దయచేసి గూగుల్ క్రోమ్ లేదా మైక్రోసాఫ్ట్ ఎడ్జ్ బ్రౌజర్ ఉపయోగించండి లేదా కింద టైప్ చేయండి.",
    loginRequired: "వాయిస్ అసిస్టెంట్ ఉపయోగించడానికి దయచేసి ముందుగా లాగిన్ అవ్వండి.",
    you: "మీరు",
    assistant: "అసిస్టెంట్",
    suggestionsTitle: "త్వరిత సూచనలు:",
    suggestions: [
      "ఇన్వెంటరీ చూపించు",
      "తక్కువ స్టాక్ ఉన్న ప్రొడక్ట్స్ ఏవి?",
      "ల్యాప్టాప్ స్టాక్ ఎంత ఉంది?",
      "ఈరోజు అమ్మకాలు ఎంత?",
      "రిపోర్ట్స్ తెరవండి",
      "డాష్‌బోర్డ్ తెరవండి",
    ],
  },
  hi: {
    title: "एआई वॉयस असिस्टेंट",
    subtitle: "इन्वेंट्री प्रबंधित करने के लिए बोलें या टाइप करें",
    listening: "सुन रहा हूँ...",
    processing: "कमांड प्रोसेस हो रही है...",
    speaking: "बोल रहा हूँ...",
    idle: "माइक पर क्लिक करें या कमांड टाइप करें",
    typePlaceholder: "कमांड टाइप करें या माइक पर क्लिक करें...",
    send: "भेजें",
    clear: "चैट साफ़ करें",
    minimize: "छोटा करें",
    close: "बंद करें",
    mute: "आवाज़ बंद करें",
    unmute: "आवाज़ चालू करें",
    micTooltip: "वॉयस असिस्टेंट चालू/बंद करें",
    notSupportedTitle: "वॉयस रिकग्निशन समर्थित नहीं है",
    notSupportedMsg:
      "इस ब्राउज़र में वॉयस रिकग्निशन समर्थित नहीं है। कृपया गूगल क्रोम या माइक्रोसॉफ्ट एज का उपयोग करें या नीचे टाइप करें।",
    loginRequired: "वॉयस असिस्टेंट का उपयोग करने के लिए कृपया पहले लॉगिन करें।",
    you: "आप",
    assistant: "असिस्टेंट",
    suggestionsTitle: "त्वरित सुझाव:",
    suggestions: [
      "इन्वेंट्री दिखाओ",
      "कम स्टॉक वाले प्रोडक्ट दिखाओ",
      "लैपटॉप का स्टॉक कितना है?",
      "आज की बिक्री कितनी है?",
      "रिपोर्ट्स खोलो",
      "डैशबोर्ड खोलो",
    ],
  },
};

export const MESSAGES = {
  notUnderstood: {
    en: "Sorry, I couldn't understand that. Please try again.",
    te: "క్షమించండి, నాకు అది అర్థం కాలేదు. దయచేసి మళ్లీ ప్రయత్నించండి.",
    hi: "क्षमा करें, मुझे समझ नहीं आया। कृपया पुनः प्रयास करें।",
  },
  unsupported: {
    en: "I don't support that operation yet. You can ask me to manage products, inventory, suppliers, purchases, sales, invoices, reports, or navigation.",
    te: "నేను ఇంకా ఆ ఆపరేషన్‌కు మద్దతు ఇవ్వడం లేదు. మీరు నన్ను ప్రొడక్ట్స్, ఇన్వెంటరీ, సప్లయర్స్, కొనుగోళ్లు, అమ్మకాలు, ఇన్వాయిస్‌లు, రిపోర్ట్‌లు లేదా నావిగేషన్ కోసం అడగవచ్చు.",
    hi: "मैं अभी उस ऑपरेशन का समर्थन नहीं करता। आप मुझसे प्रोडक्ट्स, इन्वेंट्री, सप्लायर्स, खरीद, बिक्री, इनवॉइस, रिपोर्ट्स या नेविगेशन के बारे में पूछ सकते हैं।",
  },
  productNotFound: {
    en: (name) => `I couldn't find a product named ${name}.`,
    te: (name) => `${name} అనే ప్రొడక్ట్ కనిపించలేదు.`,
    hi: (name) => `${name} नाम का प्रोडक्ट नहीं मिला।`,
  },
  askProductQuantity: {
    en: (name) => `What quantity should I add for ${name}?`,
    te: (name) => `${name} కోసం ఎంత క్వాంటిటీని జోడించాలి?`,
    hi: (name) => `${name} के लिए कितनी मात्रा जोड़नी है?`,
  },
  askProductPrice: {
    en: (name) => `What is the price for ${name}?`,
    te: (name) => `${name} ధర ఎంత?`,
    hi: (name) => `${name} की कीमत क्या है?`,
  },
  askProductName: {
    en: "What is the product name?",
    te: "ప్రొడక్ట్ పేరు ఏమిటి?",
    hi: "प्रोडक्ट का नाम क्या है?",
  },
  askUpdatePrice: {
    en: (name) => `What is the new price for ${name}?`,
    te: (name) => `${name} కోసం కొత్త ధర ఎంత?`,
    hi: (name) => `${name} के लिए नई कीमत क्या है?`,
  },
  askUpdateQuantity: {
    en: (name) => `What is the new quantity for ${name}?`,
    te: (name) => `${name} కోసం కొత్త క్వాంటిటీ ఎంత?`,
    hi: (name) => `${name} के लिए नई मात्रा क्या है?`,
  },
  askUpdateField: {
    en: (name) => `What would you like to update for ${name}? Say quantity, price, or category.`,
    te: (name) => `${name} కోసం ఏమి అప్డేట్ చేయాలి? క్వాంటిటీ, ధర లేదా వర్గం అని చెప్పండి.`,
    hi: (name) => `${name} के लिए क्या अपडेट करना है? मात्रा, कीमत या श्रेणी कहें।`,
  },
  askUpdateValue: {
    en: ({ name, field }) => `What is the new ${field} for ${name}?`,
    te: ({ name, field }) => `${name} కోసం కొత్త ${field} ఎంత?`,
    hi: ({ name, field }) => `${name} के लिए नया ${field} क्या है?`,
  },
  askConfirmDelete: {
    en: (name) => `Are you sure you want to delete ${name}?`,
    te: (name) => `మీరు ఖచ్చితంగా ${name} ను తొలగించాలనుకుంటున్నారా?`,
    hi: (name) => `क्या आप वाकई ${name} को हटाना चाहते हैं?`,
  },
  askConfirmDeleteSupplier: {
    en: (name) => `Are you sure you want to delete supplier ${name}?`,
    te: (name) => `మీరు ఖచ్చితంగా సప్లయర్ ${name} ను తొలగించాలనుకుంటున్నారా?`,
    hi: (name) => `क्या आप वाकई सप्लायर ${name} को हटाना चाहते हैं?`,
  },
  askConfirmDeletePurchase: {
    en: (id) => `Are you sure you want to delete purchase #${id}?`,
    te: (id) => `మీరు ఖచ్చితంగా కొనుగోలు #${id} ను తొలగించాలనుకుంటున్నారా?`,
    hi: (id) => `क्या आप वाकई खरीद #${id} को हटाना चाहते हैं?`,
  },
  askConfirmDeleteSale: {
    en: (id) => `Are you sure you want to delete sale #${id}?`,
    te: (id) => `మీరు ఖచ్చితంగా అమ్మకం #${id} ను తొలగించాలనుకుంటున్నారా?`,
    hi: (id) => `क्या आप वाकई बिक्री #${id} को हटाना चाहते हैं?`,
  },
  deleteCancelled: {
    en: "Deletion cancelled.",
    te: "తొలగింపు రద్దు చేయబడింది.",
    hi: "हटाना रद्द कर दिया गया।",
  },
  productAdded: {
    en: ({ name, quantity, price }) =>
      `${name} has been added successfully with quantity ${quantity} and price ₹${Number(price).toLocaleString("en-IN")}.`,
    te: ({ name, quantity, price }) =>
      `${name} ప్రొడక్ట్ ${quantity} క్వాంటిటీ మరియు ₹${Number(price).toLocaleString("en-IN")} ధరతో విజయవంతంగా జోడించబడింది.`,
    hi: ({ name, quantity, price }) =>
      `${name} प्रोडक्ट ${quantity} मात्रा और ₹${Number(price).toLocaleString("en-IN")} कीमत के साथ सफलतापूर्वक जोड़ दिया गया है।`,
  },
  productPriceUpdated: {
    en: ({ name, price }) =>
      `${name} price has been updated to ₹${Number(price).toLocaleString("en-IN")}.`,
    te: ({ name, price }) =>
      `${name} ధర ₹${Number(price).toLocaleString("en-IN")}కి మార్చబడింది.`,
    hi: ({ name, price }) =>
      `${name} की कीमत ₹${Number(price).toLocaleString("en-IN")} कर दी गई है।`,
  },
  productDeleted: {
    en: (name) => `${name} has been deleted successfully.`,
    te: (name) => `${name} విజయవంతంగా తొలగించబడింది.`,
    hi: (name) => `${name} को सफलतापूर्वक हटा दिया गया है।`,
  },
  supplierAdded: {
    en: (name) => `Supplier ${name} has been added successfully.`,
    te: (name) => `సప్లయర్ ${name} విజయవంతంగా జోడించబడ్డారు.`,
    hi: (name) => `सप्लायर ${name} को सफलतापूर्वक जोड़ा गया।`,
  },
  supplierDeleted: {
    en: (name) => `Supplier ${name} has been deleted successfully.`,
    te: (name) => `సప్లయర్ ${name} తొలగించబడ్డారు.`,
    hi: (name) => `सप्लायर ${name} को हटा दिया गया।`,
  },
  purchaseAdded: {
    en: ({ product, quantity, price }) =>
      `Purchase for ${quantity} ${product} at ₹${Number(price).toLocaleString("en-IN")} added successfully.`,
    te: ({ product, quantity, price }) =>
      `${product} యొక్క ${quantity} యూనిట్లు ₹${Number(price).toLocaleString("en-IN")} వద్ద కొనుగోలు విజయవంతంగా జోడించబడింది.`,
    hi: ({ product, quantity, price }) =>
      `${product} की ${quantity} यूनिट ₹${Number(price).toLocaleString("en-IN")} पर खरीद सफलतापूर्वक दर्ज की गई।`,
  },
  billGenerated: {
    en: ({ id, total }) =>
      `Bill for sale #${id} has been generated successfully with total ₹${Number(total || 0).toLocaleString("en-IN")}.`,
    te: ({ id, total }) =>
      `అమ్మకం #${id} కొరకు ₹${Number(total || 0).toLocaleString("en-IN")} మొత్తానికి బిల్లు విజయవంతంగా రూపొందించబడింది.`,
    hi: ({ id, total }) =>
      `बिक्री #${id} के लिए कुल ₹${Number(total || 0).toLocaleString("en-IN")} का बिल सफलतापूर्वक जनरेट किया गया।`,
  },
  noSalesFound: {
    en: "No sales records found to generate a bill.",
    te: "బిల్లు రూపొందించడానికి ఎటువంటి అమ్మకాల రికార్డులు లేవు.",
    hi: "बिल जनरेट करने के लिए कोई बिक्री रिकॉर्ड नहीं मिला।",
  },
  navigating: {
    en: (page) => `Opening ${page}.`,
    te: (page) => `${page} తెరుస్తున్నాను.`,
    hi: (page) => `${page} खोला जा रहा है।`,
  },
  goingBack: {
    en: "Going back to previous page.",
    te: "మునుపటి పేజీకి వెళ్తున్నాను.",
    hi: "पिछले पेज पर जा रहे हैं।",
  },
  loggedOut: {
    en: "You have been logged out successfully.",
    te: "మీరు విజయవంతంగా లాగ్ అవుట్ అయ్యారు.",
    hi: "आप सफलतापूर्वक लॉगआउट हो गए हैं।",
  },
  totalProductsCount: {
    en: (count) => `You currently have ${count} products.`,
    te: (count) => `మీ వద్ద ప్రస్తుతం ${count} ప్రొడక్ట్స్ ఉన్నాయి.`,
    hi: (count) => `आपके पास वर्तमान में ${count} प्रोडक्ट्स हैं।`,
  },
  lowestStockProduct: {
    en: ({ name, stock }) =>
      `${name} has the lowest stock with ${stock} unit${stock === 1 ? "" : "s"}.`,
    te: ({ name, stock }) =>
      `${name} అత్యల్పంగా ${stock} యూనిట్ల స్టాక్‌తో ఉంది.`,
    hi: ({ name, stock }) =>
      `${name} का स्टॉक सबसे कम ${stock} यूनिट है।`,
  },
  lowStockList: {
    en: ({ count, list }) =>
      count === 0
        ? "All products are sufficiently stocked."
        : `There are ${count} low-stock product${count === 1 ? "" : "s"}: ${list}.`,
    te: ({ count, list }) =>
      count === 0
        ? "అన్ని ప్రొడక్ట్స్ తగినంత స్టాక్ లో ఉన్నాయి."
        : `తక్కువ స్టాక్ ఉన్నవి ${count} ప్రొడక్ట్స్: ${list}.`,
    hi: ({ count, list }) =>
      count === 0
        ? "सभी प्रोडक्ट्स पर्याप्त स्टॉक में हैं।"
        : `कम स्टॉक वाले ${count} प्रोडक्ट्स हैं: ${list}।`,
  },
  outOfStockList: {
    en: ({ count, list }) =>
      count === 0
        ? "No products are currently out of stock."
        : `There are ${count} out of stock products: ${list}.`,
    te: ({ count, list }) =>
      count === 0
        ? "ప్రస్తుతం ఏ ప్రొడక్ట్ కూడా అవుట్ ఆఫ్ స్టాక్ లో లేదు."
        : `అవుట్ ఆఫ్ స్టాక్ లో ఉన్నవి ${count} ప్రొడక్ట్స్: ${list}.`,
    hi: ({ count, list }) =>
      count === 0
        ? "वर्तमान में कोई भी प्रोडक्ट आउट ऑफ स्टॉक नहीं है।"
        : `आउट ऑफ स्टॉक में ${count} प्रोडक्ट्स हैं: ${list}।`,
  },
  productsBelowQuantity: {
    en: ({ threshold, count, list }) =>
      count === 0
        ? `No products found below quantity ${threshold}.`
        : `Found ${count} product${count === 1 ? "" : "s"} below quantity ${threshold}: ${list}.`,
    te: ({ threshold, count, list }) =>
      count === 0
        ? `${threshold} క్వాంటిటీ కంటే తక్కువ ఉన్న ప్రొడక్ట్స్ ఏవీ లేవు.`
        : `${threshold} క్వాంటిటీ కంటే తక్కువ ఉన్నవి ${count} ప్రొడక్ట్స్: ${list}.`,
    hi: ({ threshold, count, list }) =>
      count === 0
        ? `${threshold} मात्रा से कम कोई प्रोडक्ट नहीं मिला।`
        : `${threshold} मात्रा से कम ${count} प्रोडक्ट्स मिले: ${list}।`,
  },
  productStockInfo: {
    en: ({ name, stock, price }) =>
      `There are ${stock} units of ${name} available at ₹${Number(price).toLocaleString("en-IN")}.`,
    te: ({ name, stock, price }) =>
      `${name} ప్రస్తుతం ${stock} యూనిట్లు అందుబాటులో ఉన్నాయి, ధర ₹${Number(price).toLocaleString("en-IN")}.`,
    hi: ({ name, stock, price }) =>
      `${name} के ${stock} यूनिट उपलब्ध हैं, कीमत ₹${Number(price).toLocaleString("en-IN")}।`,
  },
  todaySalesTotal: {
    en: ({ total, items, count }) =>
      `Today's sales total is ₹${Number(total || 0).toLocaleString("en-IN")} across ${count || 0} transaction${count === 1 ? "" : "s"} (${items || 0} items sold).`,
    te: ({ total, items, count }) =>
      `ఈరోజు మొత్తం అమ్మకాలు ₹${Number(total || 0).toLocaleString("en-IN")}, ${count || 0} లావాదేవీలలో ${items || 0} వస్తువులు అమ్ముడయ్యాయి.`,
    hi: ({ total, items, count }) =>
      `आज की कुल बिक्री ₹${Number(total || 0).toLocaleString("en-IN")} है, जिसमें ${count || 0} लेन-देन में ${items || 0} आइटम बिके हैं।`,
  },
  salesReportSummary: {
    en: ({ label, total, items, count }) =>
      `${label} sales total is ₹${Number(total || 0).toLocaleString("en-IN")} (${items || 0} items sold in ${count || 0} transactions).`,
    te: ({ label, total, items, count }) =>
      `${label} అమ్మకాల మొత్తం ₹${Number(total || 0).toLocaleString("en-IN")} (${count || 0} లావాదేవీలలో ${items || 0} వస్తువులు అమ్ముడయ్యాయి).`,
    hi: ({ label, total, items, count }) =>
      `${label} की कुल बिक्री ₹${Number(total || 0).toLocaleString("en-IN")} है (${count || 0} लेन-देन में ${items || 0} आइटम बिके)।`,
  },
  cashFlowSummary: {
    en: ({ sales, purchases, net }) =>
      `Total Sales: ₹${Number(sales).toLocaleString("en-IN")}, Total Purchases: ₹${Number(purchases).toLocaleString("en-IN")}. Net cash flow is ₹${Number(net).toLocaleString("en-IN")}.`,
    te: ({ sales, purchases, net }) =>
      `మొత్తం అమ్మకాలు: ₹${Number(sales).toLocaleString("en-IN")}, మొత్తం కొనుగోళ్లు: ₹${Number(purchases).toLocaleString("en-IN")}. నికర నగదు ప్రవాహం ₹${Number(net).toLocaleString("en-IN")}.`,
    hi: ({ sales, purchases, net }) =>
      `कुल बिक्री: ₹${Number(sales).toLocaleString("en-IN")}, कुल खरीद: ₹${Number(purchases).toLocaleString("en-IN")}। शुद्ध नकद प्रवाह ₹${Number(net).toLocaleString("en-IN")} है।`,
  },
  purchaseReportSummary: {
    en: ({ label, total, items, count }) =>
      `${label} purchase total is ₹${Number(total || 0).toLocaleString("en-IN")} (${items || 0} items purchased in ${count || 0} transactions).`,
    te: ({ label, total, items, count }) =>
      `${label} కొనుగోళ్ల మొత్తం ₹${Number(total || 0).toLocaleString("en-IN")} (${count || 0} లావాదేవీలలో ${items || 0} వస్తువులు కొనుగోలు చేయబడ్డాయి).`,
    hi: ({ label, total, items, count }) =>
      `${label} की कुल खरीद ₹${Number(total || 0).toLocaleString("en-IN")} है (${count || 0} लेन-देन में ${items || 0} आइटम खरीदे गए)।`,
  },
  noBillFound: {
    en: ({ name }) => `No bill found for ${name}.`,
    te: ({ name }) => `${name} కి ఎటువంటి బిల్లు కనబడలేదు.`,
    hi: ({ name }) => `${name} के लिए कोई बिल नहीं मिला।`,
  },
  customerBillFound: {
    en: ({ name, count, number, total }) =>
      count > 1
        ? `Showing the latest of ${count} bills for ${name} (Invoice ${number}), total ₹${Number(total || 0).toLocaleString("en-IN")}.`
        : `Showing the bill for ${name} (Invoice ${number}), total ₹${Number(total || 0).toLocaleString("en-IN")}.`,
    te: ({ name, count, number, total }) =>
      count > 1
        ? `${name} కి ${count} బిల్లులలో చివరి బిల్లు చూపుతున్నాను (ఇన్వాయిస్ ${number}), మొత్తం ₹${Number(total || 0).toLocaleString("en-IN")}.`
        : `${name} బిల్లు చూపుతున్నాను (ఇన్వాయిస్ ${number}), మొత్తం ₹${Number(total || 0).toLocaleString("en-IN")}.`,
    hi: ({ name, count, number, total }) =>
      count > 1
        ? `${name} के ${count} बिलों में नवीनतम बिल दिखा रहा हूँ (इनवॉइस ${number}), कुल ₹${Number(total || 0).toLocaleString("en-IN")}।`
        : `${name} का बिल दिखा रहा हूँ (इनवॉइस ${number}), कुल ₹${Number(total || 0).toLocaleString("en-IN")}।`,
  },
  invoiceNotFound: {
    en: ({ number }) => `No invoice found with number ${number}.`,
    te: ({ number }) => `${number} నంబర్‌తో ఎటువంటి ఇన్వాయిస్ కనబడలేదు.`,
    hi: ({ number }) => `${number} नंबर की कोई इनवॉइस नहीं मिली।`,
  },
  aiPredictionResult: {
    en: ({ name, daily, expected, remaining, recommended, status }) =>
      `Demand forecast for ${name}: Daily demand is ${daily} units. Expected 30-day sales: ${expected}. Remaining stock: ${remaining}. Recommendation: ${status}, purchase ${recommended} units.`,
    te: ({ name, daily, expected, remaining, recommended, status }) =>
      `${name} కొరకు డిమాండ్ అంచనా: రోజువారీ డిమాండ్ ${daily} యూనిట్లు. 30 రోజుల అమ్మకాలు: ${expected}. మిగిలిన స్టాక్: ${remaining}. సిఫార్సు: ${status}, ${recommended} యూనిట్లు కొనుగోలు చేయాలి.`,
    hi: ({ name, daily, expected, remaining, recommended, status }) =>
      `${name} के लिए मांग का पूर्वानुमान: दैनिक मांग ${daily} यूनिट है। 30-दिन की अनुमानित बिक्री: ${expected}। शेष स्टॉक: ${remaining}। सिफारिश: ${status}, ${recommended} यूनिट खरीदें।`,
  },
  procurementList: {
    en: ({ count, list }) =>
      count === 0
        ? "No products need reordering right now. Stock levels are sufficient."
        : `Reorder recommendations for ${count} product${count === 1 ? "" : "s"}: ${list}.`,
    te: ({ count, list }) =>
      count === 0
        ? "ప్రస్తుతం ఏ ప్రొడక్ట్స్ రీఆర్డర్ చేయాల్సిన అవసరం లేదు. స్టాక్ తగినంతగా ఉంది."
        : `${count} ప్రొడక్ట్స్ రీఆర్డర్ చేయాలని సిఫార్సు చేయబడింది: ${list}.`,
    hi: ({ count, list }) =>
      count === 0
        ? "अभी किसी भी प्रोडक्ट को फिर से ऑर्डर करने की आवश्यकता नहीं है। स्टॉक पर्याप्त है।"
        : `${count} प्रोडक्ट्स को फिर से ऑर्डर करने की सिफारिश की गई है: ${list}।`,
  },

  billInvoiceNotFound: {
    en: ({ number }) => `No bill/invoice found with number ${number}.`,
    te: ({ number }) => `${number} à°¨à°‚à°¬à°°à±–à°¤à±‹ à°Žà°Ÿà±à°µà°‚à°Ÿà°¿ à°‡à°¨à±à°µà°¾à°¯à°¿à°¸à± à°•à°¨à°¬à°¡à°²à±‡à°¦à±.`,
    hi: ({ number }) => `${number} à¤¨à¤‚à¤¬à¤° à¤•à¥€ à¤•à¥‹à¤ˆ à¤‡à¤¨à¤µà¥‰à¤‡à¤¸ à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤²à¥€à¥¤`,
  },
  saleAdded: {
    en: ({ product, quantity, price }) =>
      `Sale recorded: ${quantity} × ${product} at ₹${Number(price).toLocaleString("en-IN")}.`,
    te: ({ product, quantity, price }) =>
      `మొదలైన అమ్మకం: ${quantity} × ${product} (₹${Number(price).toLocaleString("en-IN")}).`,
    hi: ({ product, quantity, price }) =>
      `बिक्री दर्ज: ${quantity} × ${product} @ ₹${Number(price).toLocaleString("en-IN")}.`,
  },
  saleAddedForCustomer: {
    en: ({ customer, product, quantity, price }) =>
      `Sale recorded for ${customer}: ${quantity} × ${product} at ₹${Number(price).toLocaleString("en-IN")}.`,
    te: ({ customer, product, quantity, price }) =>
      `${customer} కోసం అమ్మకం నమోదు: ${quantity} × ${product} (₹${Number(price).toLocaleString("en-IN")}).`,
    hi: ({ customer, product, quantity, price }) =>
      `${customer} के लिए बिक्री दर्ज: ${quantity} × ${product} @ ₹${Number(price).toLocaleString("en-IN")}.`,
  },
  purchaseAddedForSupplier: {
    en: ({ supplier, product, quantity, price }) =>
      `Purchase added from ${supplier}: ${quantity} × ${product} at ₹${Number(price).toLocaleString("en-IN")}.`,
    te: ({ supplier, product, quantity, price }) =>
      `${supplier} నుండి కొనుగోలు జోడించబడింది: ${quantity} × ${product} (₹${Number(price).toLocaleString("en-IN")}).`,
    hi: ({ supplier, product, quantity, price }) =>
      `${supplier} से खरीद दर्ज: ${quantity} × ${product} @ ₹${Number(price).toLocaleString("en-IN")}.`,
  },
  purchaseBillFound: {
    en: ({ name, number, total }) =>
      `Purchase bill found for ${name} (Bill ${number}): total ₹${Number(total || 0).toLocaleString("en-IN")}.`,
    te: ({ name, number, total }) =>
      `${name} కి సంబంధించిన కొనుగోలు బిల్లు కనిపించింది (Bill ${number}): మొత్తం ₹${Number(total || 0).toLocaleString("en-IN")}.`,
    hi: ({ name, number, total }) =>
      `${name} के लिए प्रवीण प्रकटित (Bill ${number}): कुल ₹${Number(total || 0).toLocaleString("en-IN")}.`,
  },
  noPurchasesForSupplier: {
    en: ({ name }) => `No purchase bill found for ${name}.`,
    te: ({ name }) => `${name} కి సంబంధించిన కొనుగోలు బిల్లు లేదు.`,
    hi: ({ name }) => `${name} के लिए कोई क्रय बिल नहीं मिला।`,
  },
  askProductCategory: {
    en: ({ name }) => `What category is "${name}"? (e.g. Electronics)`,
    te: ({ name }) => `"${name}" వర్గం ఏమిటి? (ఉదా: Electronics)`,
    hi: ({ name }) => `"${name}" श्रेणी क्या है? (जैसे: Electronics)`,
  },
  confirmAddProduct: {
    en: ({ name, category, quantity, price }) =>
      `Add product "${name}" — category: ${category}, quantity: ${quantity}, price: ₹${Number(price).toLocaleString("en-IN")}? Say yes or no.`,
    te: ({ name, category, quantity, price }) =>
      `ప్రొడక్ట్ "${name}" జోడించండి — వర్గం: ${category}, క్వాంటిటీ: ${quantity}, ధర: ₹${Number(price).toLocaleString("en-IN")}? అవును/కాదు అని చెప్పండి.`,
    hi: ({ name, category, quantity, price }) =>
      `प्रोडक्ट "${name}" जोड़ें — श्रेणी: ${category}, मात्रा: ${quantity}, कीमत: ₹${Number(price).toLocaleString("en-IN")}? हाँ या नहीं कहें।`,
  },
  productUpdated: {
    en: ({ name, details }) => `Product "${name}" updated: ${details}.`,
    te: ({ name, details }) => `ప్రొడక్ట్ "${name}" నవీకరించబడింది: ${details}.`,
    hi: ({ name, details }) => `प्रोडक्ट "${name}" अपडेट किया गया: ${details}.`,
  },
  productQuantityUpdated: {
    en: ({ name, quantity }) => `Stock of "${name}" updated to ${quantity}.`,
    te: ({ name, quantity }) => `"${name}" స్టాక్ ${quantity}కి అప్డేట్ చేయబడింది.`,
    hi: ({ name, quantity }) => `"${name}" की स्टॉक ${quantity} कर दी गई.`,
  },
  supplierNotFound: {
    en: ({ name }) => `Supplier "${name}" not found in the database.`,
    te: ({ name }) => `డేటాబేస్లో "${name}" సప్లయర్ కనిపించలేదు.`,
    hi: ({ name }) => `डेटाबेस में "${name}" की आपूर्तिकर्ता नहीं मिली.`,
  },
};

export function getMessage(key, lang = "en", params) {
  const item = MESSAGES[key];
  if (!item) return "";
  const localized = item[lang] || item["en"];
  if (typeof localized === "function") {
    return localized(params);
  }
  return localized;
}
