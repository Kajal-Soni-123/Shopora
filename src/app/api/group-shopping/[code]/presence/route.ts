export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export interface MemberPresence {
  memberId: string;
  memberName: string;
  memberAvatar?: string | null;
  hoveredProductId: string | null;
  cursorX?: number; // percentage 0-100 across card width
  cursorY?: number; // percentage 0-100 across card height
  isHovering: boolean;
  updatedAt: number;
}

// In-memory presence map: sessionCode -> Map<memberId, MemberPresence>
const sessionPresences = new Map<string, Map<string, MemberPresence>>();

// Clean up stale presences (inactive for more than 4 seconds)
function getActivePresences(code: string): MemberPresence[] {
  const map = sessionPresences.get(code);
  if (!map) return [];

  const now = Date.now();
  const active: MemberPresence[] = [];

  const entries = Array.from(map.entries());
  for (const [memberId, presence] of entries) {
    if (now - presence.updatedAt < 4000) {
      active.push(presence);
    } else {
      map.delete(memberId);
    }
  }

  return active;
}

export async function GET(
  req: Request,
  { params }: { params: { code: string } }
) {
  const code = params.code;
  if (!code) {
    return NextResponse.json({ success: false, error: 'Session code required' }, { status: 400 });
  }

  const presences = getActivePresences(code);
  return NextResponse.json({ success: true, data: presences });
}

export async function POST(
  req: Request,
  { params }: { params: { code: string } }
) {
  const code = params.code;
  if (!code) {
    return NextResponse.json({ success: false, error: 'Session code required' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { memberId, memberName, memberAvatar, hoveredProductId, cursorX, cursorY, isHovering } = body;

    if (!memberId) {
      return NextResponse.json({ success: false, error: 'Member ID required' }, { status: 400 });
    }

    if (!sessionPresences.has(code)) {
      sessionPresences.set(code, new Map());
    }

    const map = sessionPresences.get(code)!;

    if (isHovering && hoveredProductId) {
      map.set(memberId, {
        memberId,
        memberName: memberName || 'Party Member',
        memberAvatar: memberAvatar || null,
        hoveredProductId,
        cursorX: cursorX ?? 50,
        cursorY: cursorY ?? 50,
        isHovering: true,
        updatedAt: Date.now(),
      });
    } else {
      map.delete(memberId);
    }

    const activePresences = getActivePresences(code);
    return NextResponse.json({ success: true, data: activePresences });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
