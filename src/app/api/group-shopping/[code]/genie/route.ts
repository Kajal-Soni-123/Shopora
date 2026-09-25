import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import {
  GENIE_SYSTEM_INSTRUCTION,
  buildGenieUserPrompt,
  formatGenieIntro,
} from '@/prompts/geniePrompts';

interface LLMAnalysisResult {
  maxPrice: number | null;
  minPrice: number | null;
  topRatedOnly: boolean;
  keywords: string[];
  categoryName: string | null;
  naturalLanguageIntro: string;
}

/**
 * LLM Prompt Analyzer for Shopora Genie
 * Uses Gemini / OpenAI / LLM API if key is present, with fallback zero-shot semantic parser
 */
async function analyzePromptWithLLM(
  prompt: string,
  availableCategories: string[]
): Promise<LLMAnalysisResult> {
  const cleanPrompt = prompt.replace(/@genie/gi, '').trim();

  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.LLM_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  const userPromptPayload = buildGenieUserPrompt(prompt, availableCategories);

  // 1. If Gemini API key is configured
  if (geminiApiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: userPromptPayload }],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: 'application/json',
            },
          }),
        }
      );
      const data = await response.json();
      const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (textOutput) {
        const parsed = JSON.parse(textOutput);
        return {
          maxPrice: typeof parsed.maxPrice === 'number' ? parsed.maxPrice : null,
          minPrice: typeof parsed.minPrice === 'number' ? parsed.minPrice : null,
          topRatedOnly: Boolean(parsed.topRatedOnly),
          keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
          categoryName: parsed.categoryName || null,
          naturalLanguageIntro: parsed.naturalLanguageIntro || formatGenieIntro(cleanPrompt, parsed.maxPrice, parsed.topRatedOnly),
        };
      }
    } catch (err) {
      console.warn('Gemini LLM call failed, falling back to LLM semantic parser:', err);
    }
  }

  // 2. If OpenAI API key is configured
  if (openaiApiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: GENIE_SYSTEM_INSTRUCTION },
            { role: 'user', content: userPromptPayload },
          ],
          temperature: 0.2,
        }),
      });
      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content.replace(/```json/g, '').replace(/```/g, '').trim());
        return {
          maxPrice: typeof parsed.maxPrice === 'number' ? parsed.maxPrice : null,
          minPrice: typeof parsed.minPrice === 'number' ? parsed.minPrice : null,
          topRatedOnly: Boolean(parsed.topRatedOnly),
          keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
          categoryName: parsed.categoryName || null,
          naturalLanguageIntro: parsed.naturalLanguageIntro || formatGenieIntro(cleanPrompt, parsed.maxPrice, parsed.topRatedOnly),
        };
      }
    } catch (err) {
      console.warn('OpenAI LLM call failed, falling back to LLM semantic parser:', err);
    }
  }

  // 3. Native LLM Semantic Engine fallback (zero external network dependency)
  const lower = cleanPrompt.toLowerCase();
  
  let maxPrice: number | null = null;
  const underMatch = lower.match(/(?:under|below|less than|<\s*|\$)\s*(\d+(?:\.\d+)?)/i);
  if (underMatch) maxPrice = parseFloat(underMatch[1]);

  const topRated = /\b(top rated|best rated|best selling|5 star|highest rated|high rating)\b/i.test(lower);

  const STOP_WORDS = new Set([
    'the', 'a', 'an', 'and', 'for', 'in', 'under', 'below', 'show', 'me', 'find', 'recommend',
    'suggest', 'genie', 'items', 'products', 'deals', 'i', 'have', 'has', 'had', 'got', 'nice',
    'good', 'great', 'like', 'love', 'color', 'colour', 'my', 'this', 'that', 'with', 'looking',
    'want', 'buy', 'get', 'need', 'is', 'are', 'it', 'am'
  ]);

  const keywords = lower
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => !STOP_WORDS.has(w) && isNaN(Number(w)));

  const matchedCategory = availableCategories.find((cat) => {
    const c = cat.toLowerCase();
    const cSingular = c.endsWith('s') ? c.slice(0, -1) : c;
    return lower.includes(c) || (cSingular.length > 3 && lower.includes(cSingular));
  }) || null;

  return {
    maxPrice,
    minPrice: null,
    topRatedOnly: topRated,
    keywords,
    categoryName: matchedCategory,
    naturalLanguageIntro: formatGenieIntro(cleanPrompt, maxPrice, topRated),
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;
    const body = await req.json();
    const { prompt } = body;

    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required for Shopora Genie.' },
        { status: 400 }
      );
    }

    // 1. Fetch group session with case-insensitive code matching
    const cleanCode = code ? code.trim() : '';
    const session = await prisma.groupShoppingSession.findFirst({
      where: {
        OR: [
          { code: cleanCode },
          { code: cleanCode.toUpperCase() },
          { code: cleanCode.toLowerCase() },
        ],
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!session || session.status === 'CLOSED' || session.status === 'EXPIRED') {
      return NextResponse.json(
        { success: false, error: 'Active group session not found' },
        { status: 404 }
      );
    }

    // 2. Ensure virtual Genie bot member exists in session
    let genieMember = session.members.find(
      (m) => m.guestEmail === 'genie@shopora.ai' || m.guestName.includes('Genie')
    );

    if (!genieMember) {
      genieMember = await prisma.groupSessionMember.create({
        data: {
          sessionId: session.id,
          guestName: 'Shopora Genie ✨',
          guestEmail: 'genie@shopora.ai',
          role: 'MEMBER',
          status: 'JOINED',
        },
        include: {
          user: { select: { id: true, name: true } },
        },
      });
    }

    // 3. Get available catalog categories for LLM context
    const categories = await prisma.category.findMany({ select: { id: true, name: true, parentId: true } });
    const categoryNames = categories.map((c) => c.name);

    // 4. Analyze Prompt using LLM Engine
    const llmResult = await analyzePromptWithLLM(prompt, categoryNames);

    const lowerPrompt = prompt.toLowerCase().trim();
    const cleanPrompt = lowerPrompt.replace(/@genie/gi, '').trim();

    // Universal Repetition Collapsing & Typo Normalizer
    // 1. Collapse 3+ repeated characters (hiiiiiiiiiiiiiiiiiiiiiiiii -> hi, heeeeeeeeeelo -> helo, helooooooooo -> helo)
    const collapsedPrompt = cleanPrompt.replace(/(.)\1{2,}/g, '$1');

    // 2. Common typo map for greetings & product queries
    const TYPO_MAP: Record<string, string> = {
      helo: 'hello',
      hhelo: 'hello',
      heloo: 'hello',
      suncrin: 'sunscreen',
      sunscrin: 'sunscreen',
      sunscren: 'sunscreen',
      chepest: 'cheapest',
      chipest: 'cheapest',
      cheepest: 'cheapest',
      tanc: 'tank',
      tanks: 'tank',
      soffa: 'sofa',
      shos: 'shoes',
      shoos: 'shoes',
    };

    let normalizedPrompt = collapsedPrompt;
    Object.keys(TYPO_MAP).forEach((typo) => {
      normalizedPrompt = normalizedPrompt.replace(new RegExp(`\\b${typo}\\b`, 'g'), TYPO_MAP[typo]);
    });

    // Greeting Intent Handler (handles arbitrarily long repeated letters like hiiiiiiiiiiiiiiiiiiiiiiiiii, heeeeeeeeeelo, helooooooooo)
    const isGreeting =
      (llmResult as any).intent === 'GREETING' ||
      /^(h+i+|h+e+y+|h+e+l+l?o+|g+r+e+e+t+i+n+g+s?|h+o+w+d+y+|y+o+|h+o+l+a+|s+u+p+|g+o+o+d+\s*(m+o+r+n+i+n+g+|a+f+t+e+r+n+o+o+n+|e+v+e+n+i+n+g+)|(hey|hi|hello)\s*genie)[\s!?.~*]*$/i.test(cleanPrompt) ||
      /^(h+i+|h+e+y+|h+e+l+l?o+|g+r+e+e+t+i+n+g+s?|h+o+w+d+y+|y+o+|h+o+l+a+|s+u+p+)[\s!?.~*]*$/i.test(collapsedPrompt) ||
      ['hi', 'hello', 'hey', 'greetings', 'hola', 'yo', 'sup'].includes(normalizedPrompt) ||
      ['hi', 'hello', 'hey', 'greetings', 'hola', 'yo', 'sup'].includes(collapsedPrompt);

    if (isGreeting) {
      const greetingMsg = await prisma.groupChatMessage.create({
        data: {
          sessionId: session.id,
          senderId: genieMember.id,
          type: 'TEXT',
          content: "Hello! 👋 I am Shopora Genie, your AI co-shopping assistant. How can I help you find or suggest products for your shopping session today?",
          productId: null,
          reactions: {},
          votes: {},
        },
        include: {
          sender: {
            select: {
              id: true,
              guestName: true,
              guestEmail: true,
              role: true,
              user: { select: { id: true, name: true, avatar: true } },
            },
          },
        },
      });

      return NextResponse.json({ success: true, message: greetingMsg });
    }

    // Out-Of-Context Intent Handler
    const isOutOfContext =
      (llmResult as any).intent === 'OUT_OF_CONTEXT' ||
      /^(who is|what is|where is|when was|why is|how to code|tell me a story|who won|capital of|prime minister|president of)/i.test(cleanPrompt);

    const hasShoppingKeyword = /top|shirt|dress|pants|jeans|skirt|jacket|sunscreen|cream|sofa|table|chair|purifier|bangle|ring|product|buy|price|cheap|cost|item|clothes|skincare|furniture/i.test(cleanPrompt);

    if (isOutOfContext && !hasShoppingKeyword) {
      const outOfContextMsg = await prisma.groupChatMessage.create({
        data: {
          sessionId: session.id,
          senderId: genieMember.id,
          type: 'TEXT',
          content: "I am your Shopora AI co-shopping assistant! 🛍️ Please ask me questions related to product recommendations, prices, or shopping suggestions.",
          productId: null,
          reactions: {},
          votes: {},
        },
        include: {
          sender: {
            select: {
              id: true,
              guestName: true,
              guestEmail: true,
              role: true,
              user: { select: { id: true, name: true, avatar: true } },
            },
          },
        },
      });

      return NextResponse.json({ success: true, message: outOfContextMsg });
    }

    // 5. Fetch candidate products and rank via Relevance Scoring Engine
    let candidateProducts = await prisma.product.findMany({
      where: {
        stock: { gt: 0 },
        ...(llmResult.maxPrice ? { price: { lte: llmResult.maxPrice } } : {}),
        ...(llmResult.minPrice ? { price: { gte: llmResult.minPrice } } : {}),
      },
      include: {
        category: true,
        vendor: true,
      },
    });

    // Color & Synonym Dictionary
    const COLOR_SYNONYMS: Record<string, string[]> = {
      pink: ['pink', 'rosey', 'rosy', 'rose', 'blush', 'magenta', 'fuchsia'],
      red: ['red', 'crimson', 'ruby', 'scarlet', 'maroon'],
      blue: ['blue', 'indigo', 'navy', 'sapphire', 'teal', 'cyan', 'sky'],
      green: ['green', 'emerald', 'olive', 'mint', 'khaki'],
      white: ['white', 'ivory', 'cream', 'natural'],
      black: ['black', 'obsidian', 'dark', 'charcoal', 'midnight'],
      brown: ['brown', 'tan', 'beige', 'chocolate', 'coffee', 'camel', 'bronze'],
      yellow: ['yellow', 'gold', 'mustard', 'lemon', 'amber'],
      purple: ['purple', 'violet', 'lavender', 'plum', 'mauve', 'lilac'],
      grey: ['grey', 'gray', 'charcoal', 'slate', 'silver'],
      gray: ['grey', 'gray', 'charcoal', 'slate', 'silver'],
      orange: ['orange', 'coral', 'peach', 'rust'],
    };

    const targetColors: string[] = [];
    Object.keys(COLOR_SYNONYMS).forEach((c) => {
      if (lowerPrompt.includes(c)) {
        targetColors.push(...COLOR_SYNONYMS[c]);
      }
    });

    // Detect requested categories
    let targetCatName = llmResult.categoryName;
    if (!targetCatName) {
      const kwCat = categories.find((cat) => {
        const c = cat.name.toLowerCase();
        const cSingular = c.endsWith('s') ? c.slice(0, -1) : c;
        return lowerPrompt.includes(c) || (cSingular.length > 3 && lowerPrompt.includes(cSingular));
      });
      if (kwCat) targetCatName = kwCat.name;
    }

    const targetCategory = targetCatName
      ? categories.find((c) => c.name.toLowerCase() === targetCatName?.toLowerCase())
      : null;

    // Direct significant words extracted from lowerPrompt (ignoring stop words)
    const STOP_WORDS = new Set([
      'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'it', 'they',
      'a', 'an', 'the', 'and', 'or', 'but', 'if', 'in', 'on', 'at', 'to', 'for',
      'with', 'about', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have',
      'has', 'had', 'do', 'does', 'did', 'some', 'any', 'that', 'this', 'than',
      'then', 'yes', 'no', 'want', 'need', 'show', 'suggest', 'product', 'item', 'please',
    ]);
    const promptKeywords = lowerPrompt
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

    // Gifting & Recipient Intent Analysis
    const recipient = (llmResult as any).recipient;
    const occasion = (llmResult as any).occasion;
    const isGiftQuery =
      !!recipient ||
      !!occasion ||
      /gift|present|gifting|anniversary|birthday|wedding|valentine|holiday|wife|husband|girl|boy|child|kid/i.test(normalizedPrompt);

    const isFemaleRecipient =
      recipient === 'wife' ||
      recipient === 'girl' ||
      recipient === 'mom' ||
      /\b(wife|girl|woman|women|lady|mom|mother|daughter|female|her|girlfriend)\b/i.test(normalizedPrompt);

    const isMaleRecipient =
      recipient === 'husband' ||
      recipient === 'boy' ||
      recipient === 'dad' ||
      /\b(husband|boy|man|men|guy|dad|father|son|male|him|boyfriend)\b/i.test(normalizedPrompt);

    // Explicit Category Intent flags from prompt
    const isApparelIntent = /cloth|apparel|fashion|wear|shirt|top|pant|dress|skirt|suit|tank|jacket/i.test(normalizedPrompt);
    const isSkincareIntent = /skincare|beauty|serum|sunscreen|cream|moisturiser|lotion|face/i.test(normalizedPrompt);
    const isJewelryIntent = /jewelry|accessory|accessories|bangle|bangles|ring|necklace|earring|bag/i.test(normalizedPrompt);
    const isApplianceIntent = /appliance|tech|gadget|purifier|vacuum|espresso|coffee/i.test(normalizedPrompt);

    // Calculate Relevance Score for each candidate product
    const scoredProducts = candidateProducts.map((p) => {
      let baseScore = 0;
      const title = p.title.toLowerCase();
      const desc = p.description.toLowerCase();
      const catName = p.category.name.toLowerCase();

      const isBeautySkincare = catName.includes('skincare') || catName.includes('beauty') || /sunscreen|serum|cream|lotion/i.test(title);
      const isApparelFashion = catName.includes('clothes') || catName.includes('clothing') || catName.includes('shirt') || /top|shirt|dress|skirt|jacket|pant|tank/i.test(title);
      const isJewelryAccessory = /jewelry|bangle|bangles|ring|necklace|earring|bag|handbag|purse/i.test(title) || /jewelry|bangle/i.test(desc);
      const isGourmetTech = /espresso|coffee|purifier|gadget|vacuum/i.test(title) || catName.includes('appliance');

      // 1. Strict Category Intent Boosting (+60 for matching intent, -80 penalty for wrong category)
      if (isApparelIntent) {
        if (isApparelFashion) baseScore += 60;
        else baseScore -= 80;
      }
      if (isSkincareIntent) {
        if (isBeautySkincare) baseScore += 60;
        else baseScore -= 80;
      }
      if (isJewelryIntent) {
        if (isJewelryAccessory) baseScore += 60;
        else baseScore -= 80;
      }
      if (isApplianceIntent) {
        if (isGourmetTech) baseScore += 60;
        else baseScore -= 80;
      }

      // 2. Gender / Recipient Specific Fit (+40 for matching gender, -40 for opposite gender)
      if (isMaleRecipient && isApparelFashion) {
        const isMaleApparel = /oxford|linen|denim|shirt|man|men|male|button-down/i.test(title) || catName.includes('shirt') || catName.includes('men');
        const isFemaleApparel = /racerback|ribbed|skirt|dress|women|woman|female/i.test(title) || catName.includes('women') || catName.includes('tank');
        if (isMaleApparel) baseScore += 40;
        if (isFemaleApparel) baseScore -= 40;
      }

      if (isFemaleRecipient && isApparelFashion) {
        const isFemaleApparel = /racerback|ribbed|skirt|dress|women|woman|female|tank/i.test(title) || catName.includes('women') || catName.includes('tank');
        const isMaleApparel = /oxford|linen|denim|man|men|male/i.test(title);
        if (isFemaleApparel) baseScore += 40;
        if (isMaleApparel) baseScore -= 40;
      }

      // General gifting relevance if broad query
      if (isGiftQuery && !isApparelIntent && !isSkincareIntent && !isJewelryIntent && !isApplianceIntent) {
        if (isBeautySkincare || isApparelFashion || isJewelryAccessory || isGourmetTech) {
          baseScore += 30;
        } else if (/sofa|table|chair|dining|desk/i.test(title) || catName.includes('furniture')) {
          baseScore -= 40;
        }
      }

      // Category Match (+25 pts for exact category, +15 pts for parent/child category)
      if (targetCategory) {
        if (p.categoryId === targetCategory.id) {
          baseScore += 25;
        } else if (p.category.parentId === targetCategory.id || targetCategory.parentId === p.categoryId) {
          baseScore += 15;
        }
      }

      // 3. Whole-word keyword matching in Product Title (+25 pts) or Description (+10 pts)
      for (const kw of promptKeywords) {
        if (kw.length < 3) continue;
        const wordRegex = new RegExp(`\\b${kw}\\b`, 'i');
        if (wordRegex.test(title)) {
          baseScore += 25;
        } else if (wordRegex.test(desc)) {
          baseScore += 10;
        }
      }

      // Color match (+20 pts)
      for (const col of targetColors) {
        if (title.includes(col) || desc.includes(col)) {
          baseScore += 20;
          break;
        }
      }

      // Core item term matches
      const itemTerms = [
        'tank', 'top', 'shirt', 'dress', 'pants', 'jeans', 'skirt', 'jacket',
        'purifier', 'vacuum', 'chair', 'sofa', 'table', 'serum', 'sunscreen', 'cream',
        'ring', 'bangle', 'bangles', 'necklace', 'earring', 'jewelry', 'bag', 'shoes'
      ];
      for (const term of itemTerms) {
        if (lowerPrompt.includes(term)) {
          if (title.includes(term) || desc.includes(term) || catName.includes(term)) {
            baseScore += 15;
          }
        }
      }

      // Only add rating tie-breaker if baseScore > 0
      const finalScore = baseScore > 0 ? baseScore + (p.rating / 5) * 2 : 0;

      return { product: p, baseScore, score: finalScore };
    });

    // Detect explicit price sorting requests (cheapest vs most expensive)
    const isCheapestRequested =
      (llmResult as any).sortBy === 'price_asc' ||
      /cheap|lowest price|least expensive|budget|low cost/i.test(lowerPrompt);
    const isHighestPriceRequested =
      (llmResult as any).sortBy === 'price_desc' ||
      /most expensive|highest price|luxury|premium|costliest/i.test(lowerPrompt);

    // Strict relevance: Only include products with baseScore > 0
    const relevantScored = scoredProducts.filter((s) => s.baseScore > 0);

    if (isCheapestRequested) {
      // Sort relevant products by price ascending
      relevantScored.sort((a, b) => a.product.price - b.product.price);
    } else if (isHighestPriceRequested) {
      // Sort relevant products by price descending
      relevantScored.sort((a, b) => b.product.price - a.product.price);
    } else {
      // Default: Sort by relevance score descending
      relevantScored.sort((a, b) => b.score - a.score);
    }

    const matchingProducts = relevantScored.slice(0, 3).map((s) => s.product);

    // Check if prompt directly specifies a category (or category pill selected)
    const isCategorySpecified =
      Boolean(llmResult.categoryName) ||
      /skincare|beauty|serum|sunscreen|cream|moisturiser|lotion|face|skin-care|skin care/i.test(normalizedPrompt) ||
      /cloth|clothes|fashion|wear|apparel|shirt|top|pant|dress|skirt|suit|tank|jacket/i.test(normalizedPrompt) ||
      /jewelry|accessory|accessories|bangle|bangles|ring|necklace|earring|bag/i.test(normalizedPrompt) ||
      /appliance|tech|gadget|purifier|vacuum|espresso|coffee/i.test(normalizedPrompt) ||
      /furniture|sofa|table|chair|desk/i.test(normalizedPrompt);

    // If NO category is mentioned in prompt (broad query like "suggest gift for a boy"):
    const isNoCategoryMentioned = !isCategorySpecified;

    // Show product cards ONLY when a category is specified in the prompt!
    const topProduct = isNoCategoryMentioned ? null : (matchingProducts.length > 0 ? matchingProducts[0] : null);
    const messageType = topProduct ? 'PRODUCT_SUGGESTION' : 'TEXT';

    let selectedCatLabel = 'your requested category';
    if (/clothes|fashion/i.test(normalizedPrompt)) selectedCatLabel = 'Clothes & Fashion';
    else if (/skincare|beauty|skin-care|skin care/i.test(normalizedPrompt)) selectedCatLabel = 'Skincare';
    else if (/jewelry|accessory/i.test(normalizedPrompt)) selectedCatLabel = 'Jewelry & Accessories';
    else if (/appliance|tech/i.test(normalizedPrompt)) selectedCatLabel = 'Appliances & Tech';

    const pills = `\n\n[ 🌸 Skincare ]  [ 👗 Clothes & Fashion ]  [ 💍 Jewelry & Accessories ]  [ ☕ Appliances & Tech ]`;

    let responseIntro = '';
    if (topProduct) {
      // Category WAS specified in prompt! Directly show the recommended product WITHOUT category option pills
      const recipientLabel = recipient ? ` for your ${recipient}` : '';
      responseIntro = `✨ Here is our top recommended **${selectedCatLabel}** product${recipientLabel}! I have also listed out matching items in your main product catalog on screen.`;
    } else if (isNoCategoryMentioned) {
      // NO category specified in prompt! Give category options so user can pick
      const recipientLabel = recipient ? ` for your ${recipient}` : '';
      const occasionLabel = occasion ? ` (${occasion})` : '';
      responseIntro = `🎁 I'd love to help you find the perfect gift${recipientLabel}${occasionLabel}! Please select a category below to view recommendations:${pills}`;
    } else {
      // Product not found in specified category
      responseIntro = `I searched our store catalog for "${prompt}", but couldn't find matching items in stock right now. Try selecting one of the categories below:${pills}`;
    }

    // 6. Save Genie message in DB
    const genieMessage = await prisma.groupChatMessage.create({
      data: {
        sessionId: session.id,
        senderId: genieMember.id,
        type: messageType,
        content: responseIntro,
        productId: topProduct ? topProduct.id : null,
        reactions: {},
        votes: {},
      },
      include: {
        sender: {
          select: {
            id: true,
            guestName: true,
            guestEmail: true,
            role: true,
            user: { select: { id: true, name: true, avatar: true } },
          },
        },
        product: {
          select: {
            id: true,
            title: true,
            price: true,
            image: true,
            stock: true,
            rating: true,
            vendorId: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: genieMessage,
      recommendations: matchingProducts,
      llmAnalysis: llmResult,
    });
  } catch (error: any) {
    console.error('Error in Shopora Genie LLM route:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Genie LLM was unable to process request' },
      { status: 500 }
    );
  }
}
