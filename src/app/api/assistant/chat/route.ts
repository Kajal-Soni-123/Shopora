export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isAssistantAIConfigured } from '@/lib/assistant/gemini';
import { runAssistant, ChatTurn } from '@/lib/assistant/agent';
import { runRuleAssistant } from '@/lib/assistant/rules';
import { isAssistantRateLimited, ASSISTANT_RATE_LIMIT_MESSAGE } from '@/lib/assistant/rateLimit';

/**
 * POST /api/assistant/chat — the personal (one-to-one) shopping assistant, available to
 * everyone, signed in or not. Conversation history lives in the browser and is sent along.
 * AI first (Gemini + read-only lookups); rule-based answers if the AI is unavailable.
 */

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    const body = await req.json().catch(() => ({}));
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 1000) : '';
    if (!message) return NextResponse.json({ success: false, error: 'Please type a message.' }, { status: 400 });

    const key = user?.userId || req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'anonymous';
    if (isAssistantRateLimited(key)) {
      return NextResponse.json({ success: false, error: ASSISTANT_RATE_LIMIT_MESSAGE }, { status: 429 });
    }

    const history: ChatTurn[] = Array.isArray(body.history)
      ? body.history
          .filter((t: any) => (t?.role === 'user' || t?.role === 'assistant') && typeof t.text === 'string')
          .slice(-12)
          .map((t: any) => ({ role: t.role, text: t.text.slice(0, 1500) }))
      : [];

    let text = '';
    let cards: { productId: string; note: string }[] = [];
    let giftState: unknown = body.giftState ?? null;
    let source: 'ai' | 'rules' = 'rules';
    let aiError: string | undefined;

    if (isAssistantAIConfigured()) {
      try {
        const answer = await runAssistant({
          prompt: message,
          history,
          ctx: { user: user ? { userId: user.userId, email: user.email, name: user.name } : null },
        });
        text = answer.text;
        cards = answer.products;
        source = 'ai';
        giftState = null; // the AI handles gift conversations itself
      } catch (err: any) {
        aiError = err?.message;
        console.warn('Assistant AI unavailable, using rule-based answers:', aiError);
      }
    }

    if (source === 'rules') {
      const rules = await runRuleAssistant({ prompt: message, giftState });
      text = rules.replies.filter((r) => !r.productId).map((r) => r.content).join('\n\n');
      cards = rules.replies.filter((r) => r.productId).map((r) => ({ productId: r.productId!, note: r.content }));
      giftState = rules.giftState;
    }

    const products = cards.length
      ? await prisma.product.findMany({
          where: { id: { in: cards.map((c) => c.productId) } },
          select: { id: true, title: true, price: true, image: true, rating: true, stock: true },
        })
      : [];

    return NextResponse.json({
      success: true,
      data: {
        text,
        products: cards
          .map((c) => {
            const p = products.find((x) => x.id === c.productId);
            return p ? { ...p, note: c.note } : null;
          })
          .filter(Boolean),
        giftState,
        source,
        // Why the AI wasn't used — development only, to make fallbacks easy to diagnose
        ...(process.env.NODE_ENV !== 'production' && aiError ? { aiError } : {}),
      },
    });
  } catch (error: any) {
    console.error('Assistant chat error:', error);
    return NextResponse.json({ success: false, error: 'Sorry, something went wrong. Please try again.' }, { status: 500 });
  }
}
