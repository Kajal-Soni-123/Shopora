/**
 * Shopora Genie — answers questions about Shopora itself ("tell me about this app",
 * "how does split payment work?", "what's the return policy?").
 * Only fires on clearly app-related questions so product searches still reach the catalog.
 */
import { RETURN_WINDOW_DAYS } from '@/lib/returns/returnService';
import { ASSISTANT_NAME, ASSISTANT_MENTION } from '@/lib/assistant';

const pills = (labels: string[]) => '\n\n' + labels.map((l) => `[ ${l} ]`).join('  ');

const MORE = ['🎁 Help me find a gift', '❓ What can you do?', '👥 How does group shopping work?', '💳 How does split payment work?'];

interface Topic {
  id: string;
  match: RegExp;
  answer: () => string;
  related: string[];
}

// Specific topics first; the broad "about Shopora" / "what can you do" answers last
const TOPICS: Topic[] = [
  {
    id: 'group',
    match: /\bgroup (shop\w*|party|parties|cart|chat)\b|\bshopping party\b|\b(shop|shopping) (together|with friends)\b|\b(invite|add) (my )?friends?\b|\bhow (do|can) i (invite|join|start)\b/,
    answer: () =>
      `Group Shopping Parties let you shop together 👥\n` +
      `1. Start a party from "Group Shop" and invite friends by email, link, QR or party code\n` +
      `2. Everyone adds to one shared cart and can see who added what\n` +
      `3. Chat, suggest products and vote 🗳️ — and ask me for ideas anytime\n` +
      `4. The host checks out when you're ready — pay together or split the bill\n\n` +
      `Invited friends get a prompt to accept or decline when they log in.`,
    related: ['💳 How does split payment work?', '🚪 What happens if the host leaves?', '🎁 Help me find a gift'],
  },
  {
    id: 'split',
    match: /\bsplit\b|\b(pay|paying) (together|separately|for (my|our|their) (own )?(items|share))\b|\bmy share\b|\bwho pays\b|\bshare the (bill|cost)\b/,
    answer: () =>
      `When the host starts group checkout, they choose who pays 💳\n` +
      `• 👑 Host pays everything\n` +
      `• 🛍️ Pay for what you added — each person pays for their own items\n` +
      `• ⚖️ Split equally — the total is divided between everyone who joined\n\n` +
      `The cart locks while people pay, and everyone sees who has paid. Once the last share is in, the order is placed automatically 🎉 and ships to the host's address.`,
    related: ['💵 What payment methods can I use?', '👥 How does group shopping work?', '📦 How do I track my order?'],
  },
  {
    id: 'host_leaves',
    match: /\bhost\b.*\b(leave|leaves|left|end|ends|quit)\b|\b(end|close) (the )?party\b|\bleave (the )?party\b/,
    answer: () =>
      `If the host ends the party, it closes for everyone 👋 — all members are removed and the shared cart and chat close.\n\n` +
      `Members can leave anytime too. The one exception: while the cart is locked for payment, nobody can leave or end the party until the payment is done (or the host cancels checkout).`,
    related: ['👥 How does group shopping work?', '💳 How does split payment work?'],
  },
  {
    id: 'payment',
    match: /\b(payment (methods?|options?)|how (can|do) i pay|pay (by|with|using)|cash on delivery|\bcod\b|\bupi\b|net ?banking|credit card|debit card)\b/,
    answer: () =>
      `You can pay with 💳 Credit / Debit Card, 📱 UPI / QR code, 🏦 Net Banking, or 💵 Cash on Delivery (for eligible orders and addresses).\n\n` +
      `Card payments are confirmed with a quick security code, and checkout is encrypted end to end 🔒`,
    related: ['💳 How does split payment work?', '📦 How do I track my order?', '🔁 What is the return policy?'],
  },
  {
    id: 'tracking',
    match: /\b(track(ing)?|where is my|status of my) (my )?(order|package|parcel|shipment|delivery)\b|\bhow (long|soon)\b.*\b(deliver\w*|ship\w*|arrive)\b|\bshipping (time|cost|charges?)\b|\bdelivery (time|charges?)\b/,
    answer: () =>
      `Open Orders from the top menu and pick your order 📦\n` +
      `Each seller ships their items as a separate package, and every package has its own live tracking timeline — confirmed → packed → shipped → out for delivery → delivered.\n\n` +
      `Some sellers deliver personally — then you'll see a 6-digit delivery code on your order page to share when the package arrives. Carts over $200 also unlock free express shipping 🚚`,
    related: ['🔁 What is the return policy?', '💵 What payment methods can I use?'],
  },
  {
    id: 'returns',
    match: /\b(return|returns|refund|refunds|exchange|send (it )?back)\b/,
    answer: () =>
      `You can return items within ${RETURN_WINDOW_DAYS} days of delivery 🔁\n` +
      `Go to Orders → your order → "Return Item", tell us the reason (photos help!), and the seller reviews the request. Once approved, a pickup is arranged and your refund is processed.`,
    related: ['📦 How do I track my order?', '⭐ How do reviews work?'],
  },
  {
    id: 'reviews',
    match: /\b(how (do|does|can|to)|where|write|leave|post|add|can i)\b.*\b(reviews?|ratings?)\b|\breviews? work\b/,
    answer: () =>
      `Only verified buyers can review, after the item is delivered ⭐\n` +
      `Go to Orders → your delivered order → "Write Review": pick a star rating, share your experience, and add up to 4 photos 📷 if you like. Your review helps other shoppers (and the seller!).`,
    related: ['🔁 What is the return policy?', '🛍️ About Shopora'],
  },
  {
    id: 'tryon',
    match: /\btry[- ]?on\b|\btry (it|this|them|clothes|jewel\w*) on\b|\bvirtual\b/,
    answer: () =>
      `AI Virtual Try-On 👗✨ lets you see how clothes and accessories look on you before buying — upload a photo of yourself on a product that supports try-on and our AI shows you wearing it.`,
    related: ['🛍️ About Shopora', '🎁 Help me find a gift'],
  },
  {
    id: 'wishlist',
    match: /\bwish ?list\b|\bsave (it|this|items?|products?) for later\b/,
    answer: () =>
      `Tap the ❤️ on any product to save it to your Wishlist — open it anytime from the top menu, and move items to your cart when you're ready.`,
    related: ['🛍️ About Shopora', '🎁 Help me find a gift'],
  },
  {
    id: 'sell',
    match: /\b(become|be) a (seller|vendor)\b|\bsell (on|with) (shopora|you|this)\b|\b(open|start) a (store|shop)\b/,
    answer: () =>
      `Shopora is built for independent sellers 🏪 Vendors get their own store portal to list products, manage orders (including shipping or delivering them personally), handle returns and see reviews & sales analytics. Sign up with a vendor account to get started!`,
    related: ['🛍️ About Shopora'],
  },
  {
    id: 'genie',
    match: /\b(what|how) (can|do|could) (you|aria|genie) (do|help)\b|\bwhat can you do\b|\bhow (do|does) (you|aria|genie) work\b|\bwho are you\b|\bwhat are you\b|\b(your|aria'?s?|genie'?s?) (features|abilities|capabilities)\b|^help\b/,
    answer: () =>
      `I'm ${ASSISTANT_NAME}, your shopping buddy in this party ✨ Here's what I can do:\n` +
      `• 🎁 Find the perfect gift — tell me who it's for and I'll ask a few quick questions\n` +
      `• 🔍 Search products in plain words — "red shirts", "cotton tops under $50", "cheapest sunscreen"\n` +
      `• 🗳️ Drop product picks into the chat so everyone can vote on them\n` +
      `• ❓ Answer questions about Shopora — orders, payments, returns and more\n\n` +
      `Try me!`,
    related: ['🎁 Help me find a gift', '🛍️ About Shopora', '🔍 Show me red shirts'],
  },
  {
    id: 'about',
    match:
      /\b(about|what is|what's|whats|tell me|explain|describe|introduce)\b.*\b(this|the|your)\s+(app|application|website|web ?site|site|platform|store|marketplace|portal)\b|\bshopora\b|\b(this|the)\s+(app|application|website|platform)\b.*\b(about|do|for|work)\b|\babout (you|this)\b/,
    answer: () =>
      `Shopora is a multi-vendor marketplace 🛍️ — lots of independent sellers in one place, so you can shop clothes, jewellery & accessories, skincare, electric appliances and furniture with a single cart.\n\n` +
      `What makes it special ✨\n` +
      `• 👥 Group Shopping Parties — shop with friends, share one cart, chat and vote on products\n` +
      `• 💳 Flexible checkout — the host pays, everyone pays for their own items, or split it equally\n` +
      `• ✨ Me, ${ASSISTANT_NAME} — I find gifts and products for you, right here in the chat\n` +
      `• 👗 AI Virtual Try-On — see how items look on you before buying\n` +
      `• 📦 Per-seller tracking, ${RETURN_WINDOW_DAYS}-day returns, and verified reviews with photos\n\n` +
      `What would you like to know more about?`,
    related: ['👥 How does group shopping work?', '💳 How does split payment work?', '🔁 What is the return policy?', '🎁 Help me find a gift'],
  },
];

/** Returns Genie's reply if the prompt is a question about Shopora, otherwise null. */
export function answerAppQuestion(prompt: string): string | null {
  const text = prompt
    .replace(ASSISTANT_MENTION, '')
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^\x00-\x7F]/g, ' ') // drop emoji from pill labels
    .replace(/\s+/g, ' ')
    .trim();
  if (!text || /\b(gifts?|gifting|present)\b/.test(text)) return null; // the gift finder handles these

  const topic = TOPICS.find((t) => t.match.test(text));
  if (!topic) return null;
  const related = topic.related.length ? topic.related : MORE;
  return topic.answer() + pills(related);
}

/** Friendly reply when Genie can't tell what the shopper wants. */
export function genieFallbackReply(): string {
  return (
    `Hmm, I'm not quite sure what you mean 🤔 I can help you find gifts, search for products, or answer questions about how Shopora works. What would you like to do?` +
    pills(['🎁 Help me find a gift', '❓ What can you do?', '🛍️ About Shopora', '🌸 Skincare', '👗 Clothes', '💍 Jewellery'])
  );
}
