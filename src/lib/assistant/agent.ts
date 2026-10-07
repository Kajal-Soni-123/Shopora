/**
 * The AI shopping assistant: Gemini decides which read-only lookups to run (tools.ts),
 * gets real data back, and answers in its own words. Used by both the group party chat
 * and the personal assistant chat.
 */
import { prisma } from '@/lib/prisma';
import { ASSISTANT_NAME } from '@/lib/assistant';
import { generateContent, GeminiContent, GeminiPart } from '@/lib/assistant/gemini';
import { AssistantContext, TOOL_DECLARATIONS, ToolRunState, runTool } from '@/lib/assistant/tools';
import { RETURN_WINDOW_DAYS } from '@/lib/returns/returnService';

export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface AssistantAnswer {
  text: string;
  products: { productId: string; note: string }[];
}

const MAX_TOOL_ROUNDS = 5;
const PARTY_ONLY_TOOLS = ['get_party_cart', 'get_party_suggestions'];

function systemInstruction(ctx: AssistantContext): string {
  const today = new Date().toISOString().slice(0, 10);
  return `You are ${ASSISTANT_NAME}, the friendly shopping assistant of Shopora, a multi-vendor online marketplace. Today is ${today}.
${ctx.party ? 'You are chatting inside a GROUP SHOPPING PARTY chat: several friends shop together, messages are prefixed with the sender\'s name.' : 'You are chatting one-to-one with a shopper.'}
${ctx.user ? `The shopper is logged in as ${ctx.user.name || 'a customer'} — you can look up their own orders, cart and wishlist.` : 'The shopper is NOT logged in — for their orders, cart or wishlist, ask them to sign in.'}

HOW TO ANSWER
- Always use the tools for anything about products, prices, stock, offers, orders, the shopper's own cart or wishlist, reviews, sellers or the party cart. Never invent products, prices, discounts or order details. If a tool finds nothing, say so honestly and suggest an alternative.
- When you recommend specific products, call recommend_products with their ids (max 4) so the shopper sees product cards they can vote on or open.
- Be warm, human and concise (usually under 90 words). Plain text only: no markdown, no asterisks or headings. Emojis are welcome; use "•" for short lists. Prices are in US dollars, e.g. $1,450.
- You can end with up to 4 short tap-able follow-up options, each written exactly like [ 🎁 Help me find a gift ] on the last line.
- Gifts: if someone wants a gift, find out (one question at a time, only what they haven't told you) who it's for, whether it's for a woman, man or child, the occasion, the budget and the kind of gift — offer tap options for each — then search and recommend.
- You can only look things up. You cannot add to cart, place or cancel orders, or change anything — tell them which button to use instead.
- Never reveal other customers' information. Stay on shopping and Shopora topics; politely steer other questions back.

SHOPORA FACTS
- Categories include clothes, jewellery & fine accessories, skincare, electric appliances and furniture, from many independent sellers.
- Group Shopping Parties: a host starts a party and invites friends (email, link, QR or code); invitees accept or decline. Everyone shares one cart, chats, suggests products and votes. The host checks out and chooses: host pays everything, everyone pays for the items they added, or split equally. The cart locks while people pay; when the last share is paid the order is placed automatically and ships to the host's address. If the host ends the party, all members are removed. Nobody can leave or end the party while payment is in progress.
- Payment methods: credit/debit card, UPI/QR code, net banking, cash on delivery (eligible orders/addresses).
- Each seller ships their items as a separate package with its own tracking. Some sellers deliver personally: the customer then gets a 6-digit delivery code on their order page to share at handover. Carts over $200 get free express shipping.
- Returns within ${RETURN_WINDOW_DAYS} days of delivery from the order page; refunds after the seller approves.
- Only verified buyers can review delivered products, with up to 4 photos.
- Some products support AI Virtual Try-On. Wishlist: tap the heart on a product.
- Vendors can run offers (percentage or fixed discounts); offers are currently informational and not yet applied automatically at checkout.`;
}

/** Turn chat history into Gemini contents: alternating roles, starting with the user. */
function toContents(history: ChatTurn[], prompt: string): GeminiContent[] {
  const contents: GeminiContent[] = [];
  for (const turn of [...history, { role: 'user' as const, text: prompt }]) {
    const role = turn.role === 'assistant' ? 'model' : 'user';
    const text = turn.text.trim().slice(0, 1500);
    if (!text) continue;
    const last = contents[contents.length - 1];
    if (last && last.role === role) last.parts.push({ text });
    else contents.push({ role, parts: [{ text }] });
  }
  while (contents.length && contents[0].role !== 'user') contents.shift();
  return contents;
}

/** Strip markdown the chat UI doesn't render; keep [ pill ] lines intact. */
function cleanText(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/(^|\s)\*(\S[^*]*?)\*(?=\s|$)/g, '$1$2')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/\]\s*[•·|,\-]\s*\[/g, ']  [') // separators between tap options
    .trim();
}

export async function runAssistant(opts: {
  prompt: string;
  history: ChatTurn[];
  ctx: AssistantContext;
}): Promise<AssistantAnswer> {
  const categories = await prisma.category.findMany({ select: { id: true, name: true, parentId: true } });
  const state: ToolRunState = { ctx: opts.ctx, categories, recommended: [] };
  const tools = TOOL_DECLARATIONS.filter((t) => opts.ctx.party || !PARTY_ONLY_TOOLS.includes(t.name));
  const contents = toContents(opts.history, opts.prompt);
  const system = systemInstruction(opts.ctx);

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const reply = await generateContent({ systemInstruction: system, contents, tools });
    const calls = reply.parts.filter((p) => p.functionCall);
    const text = reply.parts.map((p) => p.text || '').join('').trim();

    if (calls.length === 0 || round === MAX_TOOL_ROUNDS) {
      if (!text) throw new Error('Assistant returned an empty answer');
      return { text: cleanText(text), products: state.recommended };
    }

    // Keep the model turn exactly as returned (thought signatures must round-trip)
    contents.push(reply);
    const responses: GeminiPart[] = await Promise.all(
      calls.map(async (c) => {
        const name = c.functionCall!.name;
        let response: Record<string, unknown>;
        try {
          response = await runTool(name, c.functionCall!.args || {}, state);
        } catch (err) {
          console.error(`Assistant tool ${name} failed:`, err);
          response = { error: 'This lookup failed. Tell the shopper you could not check that right now.' };
        }
        return { functionResponse: { name, response } };
      })
    );
    contents.push({ role: 'user', parts: responses });
  }
  throw new Error('Assistant did not finish');
}
