export type SupportReply = {
  reply: string;
  suggestions: string[];
};

export type PublicNewsItem = {
  title: string;
  excerpt?: string | null;
  slug?: string | null;
};

type Product = {
  name: string;
  price: number;
  aliases: string[];
};

// These are the customer-facing prices shown in the current product catalogue.
// Keep this list in step with apps/web/src/data/productCatalog.js when a price changes.
const products: Product[] = [
  { name: 'Dried Mango', price: 25, aliases: ['dried mango', 'mango slices'] },
  { name: 'Mango Juice', price: 20, aliases: ['mango juice', 'juice'] },
  { name: 'Wild Mango Wine', price: 85, aliases: ['wild mango wine', 'mango wine', 'wine'] },
  { name: 'Mango Jam', price: 25, aliases: ['mango jam', 'jam'] },
  { name: 'Mango Pickle', price: 22, aliases: ['mango pickle', 'pickle'] },
  { name: 'Dehydrated Mango', price: 30, aliases: ['dehydrated mango'] },
  { name: 'Gift Pack (Small)', price: 95, aliases: ['small gift pack', 'gift pack small'] },
  { name: 'Gift Pack (Large)', price: 160, aliases: ['large gift pack', 'gift pack large'] },
  { name: 'Fresh Mango Export Box', price: 120, aliases: ['export box', 'fresh mango box', 'fresh mango export'] },
  { name: 'Dried Mango Pouch', price: 25, aliases: ['dried mango pouch', 'pouch'] },
  { name: 'Dehydrated Mango Jar', price: 32, aliases: ['dehydrated mango jar', 'mango jar'] },
  { name: 'Mango Pudding Pouch', price: 18, aliases: ['mango pudding', 'pudding'] },
];

const price = (amount: number) => `₵ ${amount.toFixed(2)}`;

const productPriceList = () => products.map((product) => `• ${product.name}: ${price(product.price)}`).join('\n');

const protectedInformationPattern = /\b(password|passcode|security|api\s*key|access\s*key|secret|token|credential|admin\s*login|staff\s*(?:id|record|details|phone|email)|employee\s*(?:id|record|details|phone|email)|payroll|salary|bank\s*(?:account|detail)|database|server|internal\s*(?:report|document|system|process)|private\s*(?:data|document|information))\b/i;

function latestNewsReply(news: PublicNewsItem[]): SupportReply {
  if (!news.length) {
    return {
      reply: 'There are no published news updates to share right now. Please visit the News page again soon, or ask us about products, ordering, local supply, export, or careers.',
      suggestions: ['Show me prices', 'Current vacancies', 'Export supply'],
    };
  }
  const updates = news.map((item) => `• ${item.title}${item.excerpt ? ` — ${item.excerpt}` : ''}`).join('\n');
  return {
    reply: `Here are the latest public JBA GreenGold updates:\n${updates}\n\nYou can read the full stories on our News page.`,
    suggestions: ['Current vacancies', 'Company information', 'Export supply'],
  };
}

export function getSupportReply(input: string, { news = [] }: { news?: PublicNewsItem[] } = {}): SupportReply {
  const message = input.trim().toLowerCase();
  const product = products.find((item) => item.aliases.some((alias) => message.includes(alias)));

  // Customer support must never become a route into the private business
  // workspace. Give a clear boundary without confirming whether any sensitive
  // record or system exists.
  if (protectedInformationPattern.test(message)) {
    return {
      reply: 'I can only share public customer information. For privacy and security, I cannot provide staff identifiers or contact details, company security information, credentials, internal records, or other protected business data.',
      suggestions: ['What can you help with?', 'Show me prices', 'Talk to the team'],
    };
  }

  if (/\b(news|update|updates|announcement|announcements|harvest update)\b/.test(message)) return latestNewsReply(news);

  if (/\b(vacan(?:cy|cies)|career|careers|job|jobs|hiring|recruit|recruitment|open role|position)\b/.test(message)) {
    return {
      reply: 'Our current public vacancies are Farm Operations Manager (Techiman), Quality Assurance Officer (Accra), Sales & Marketing Executive (Accra), Supply Chain Coordinator (Accra), and Finance Officer (Accra). Please use the Careers page to apply securely with your résumé and supporting documents; do not send those documents in chat.',
      suggestions: ['Company information', 'Latest news', 'Talk to the team'],
    };
  }

  if (/\b(company|about|who are you|who is jba|jba greengold|orchard|farm)\b/.test(message)) {
    return {
      reply: 'JBA GreenGold Orchard is a Ghanaian mango business connecting orchard production, quality handling, local supply, and export. We serve customers with fresh and value-added mango products, dependable supply, and customer support from Ghana to international markets.',
      suggestions: ['Show me products', 'Local supply', 'Export supply'],
    };
  }

  if (/\b(product|products|mango range|what do you sell|catalogue|catalog)\b/.test(message) && !/\b(price|prices|cost)\b/.test(message)) {
    return {
      reply: 'Our public range includes dried mango, mango juice, wild mango wine, mango jam, mango pickle, dehydrated mango, gift packs, export boxes, retail pouches, jars, and mango pudding. Ask “show me prices” for the current catalogue prices.',
      suggestions: ['Show me prices', 'How do I place an order?', 'Export supply'],
    };
  }

  if (product) {
    return {
      reply: `${product.name} is currently ${price(product.price)}. Would you like help placing an order or arranging supply?`,
      suggestions: ['How do I place an order?', 'Local supply', 'Export supply'],
    };
  }

  if (/\b(price|prices|cost|catalogue|catalog)\b/.test(message)) {
    return {
      reply: `Here are our current website prices:\n${productPriceList()}\n\nFor bulk or export quantities, please ask for an export quote.`,
      suggestions: ['How do I place an order?', 'I need an export quote', 'Local supply'],
    };
  }

  if (/\b(track|tracking|where is my order|order status)\b/.test(message)) {
    return {
      reply: 'Open Track order from the shopping-bag menu and enter your order ID. No sign-in is required. For privacy, the public result shows tracking status and dates only.',
      suggestions: ['How do I place an order?', 'Local supply', 'Talk to the team'],
    };
  }

  if (/\b(order|buy|basket|checkout|purchase)\b/.test(message)) {
    return {
      reply: 'To place an order, open Products, add the items you want to your basket, then continue to checkout. For a wholesale or custom order, tell us the product, quantity, delivery location, and preferred date so our team can prepare a quote.',
      suggestions: ['Show me prices', 'Local supply', 'Talk to the team'],
    };
  }

  if (/\b(payment|pay|invoice|card|mobile money|momo)\b/.test(message)) {
    return {
      reply: 'Please complete payments only through the secure checkout or your signed-in customer portal. Never send card, bank, Mobile Money, password, or verification details in chat.',
      suggestions: ['How do I place an order?', 'Track my order', 'Talk to the team'],
    };
  }

  if (/\b(local|ghana|accra|delivery|retail|supply)\b/.test(message)) {
    return {
      reply: 'For local supply, we can help with fresh and processed mango products for retailers, distributors, hospitality teams, and individual customers. Send the product, quantity, delivery location, and when you need it, and our team will confirm availability and delivery options.',
      suggestions: ['Show me prices', 'How do I place an order?', 'Talk to the team'],
    };
  }

  if (/\b(export|exporting|international|ship|shipping|wholesale)\b/.test(message)) {
    return {
      reply: 'For export supply, please share your destination country, product, expected quantity, packaging needs, and preferred shipment window. We support air freight for time-sensitive orders and sea freight for bulk shipments, with export-ready packaging, cold-chain handling, and public quality documentation such as GlobalG.A.P., HACCP, ISO, BRC, and phytosanitary certificates where applicable. Our team will prepare a tailored quote.',
      suggestions: ['I need an export quote', 'Show me prices', 'Talk to the team'],
    };
  }

  if (/\b(human|agent|team|person|call|talk)\b/.test(message)) {
    return {
      reply: 'Our support team can help with a tailored order, supply enquiry, or export plan. Tap “Continue on WhatsApp” to message the team directly, and include the product or service you need.',
      suggestions: ['How do I place an order?', 'Local supply', 'Export supply'],
    };
  }

  if (/\b(help|what can you do|menu|options)\b/.test(message)) {
    return {
      reply: 'I can help with public product prices and catalogue information, placing an order, local supply, export supply, public news, vacancies, and general company information. I do not provide company security information, staff identifiers or contact details, account data, or internal business information.',
      suggestions: ['Show me prices', 'Latest news', 'Current vacancies'],
    };
  }

  return {
    reply: 'Hello! I’m the JBA GreenGold public support assistant. I can help with products and prices, ordering, local supply, export, news, vacancies, and company information. What would you like to know?',
    suggestions: ['Show me prices', 'Latest news', 'Current vacancies'],
  };
}
