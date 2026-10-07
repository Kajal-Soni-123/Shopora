/**
 * Rule-based answers for the personal assistant chat, used when the AI is unavailable
 * (no key, rate-limited, timeout). Same building blocks as the group chat's fallback.
 */
import { prisma } from '@/lib/prisma';
import { ASSISTANT_NAME } from '@/lib/assistant';
import { answerAppQuestion, genieFallbackReply } from '@/lib/genie/appGuide';
import { isOfferQuestion, runOfferQuery } from '@/lib/genie/offers';
import { runGiftFlow, GenieReply, GiftState } from '@/lib/genie/giftFlow';
import { runProductSearch } from '@/lib/genie/productQuery';

const GREETING = /^(h+i+|h+e+y+|hel+o+|hiya|good (morning|afternoon|evening)|namaste|yo)\b[\s!.?]*(aria)?[\s!.?]*$/i;

export async function runRuleAssistant(opts: {
  prompt: string;
  giftState: unknown;
}): Promise<{ replies: GenieReply[]; giftState: GiftState | null }> {
  const { prompt } = opts;
  const categories = await prisma.category.findMany({ select: { id: true, name: true, parentId: true } });

  const app = answerAppQuestion(prompt);
  if (app) return { replies: [{ content: app }], giftState: (opts.giftState as GiftState) || null };

  if (isOfferQuestion(prompt)) {
    return { replies: await runOfferQuery({ prisma, prompt, categories }), giftState: (opts.giftState as GiftState) || null };
  }

  const gift = await runGiftFlow({ prisma, prompt, rawState: opts.giftState, categories });
  if (gift.handled) return { replies: gift.replies, giftState: gift.state };

  if (GREETING.test(prompt.trim())) {
    return {
      replies: [
        {
          content:
            `Hey there! 👋 I'm ${ASSISTANT_NAME}, your shopping buddy. Looking for a gift, a great deal, or something specific? Just ask!` +
            '\n\n[ 🎁 Help me find a gift ]  [ 🏷️ Any offers right now? ]  [ ❓ What can you do? ]  [ 🌸 Skincare ]',
        },
      ],
      giftState: null,
    };
  }

  const search = await runProductSearch({ prisma, prompt, categories });
  if (search.handled) return { replies: search.replies, giftState: null };

  return { replies: [{ content: genieFallbackReply() }], giftState: null };
}
