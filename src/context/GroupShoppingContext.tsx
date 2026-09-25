'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

export interface GroupMember {
  id: string;
  userId?: string | null;
  guestName: string;
  guestEmail?: string | null;
  role: 'HOST' | 'MEMBER';
  status: 'INVITED' | 'JOINED' | 'PAID';
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
  } | null;
}

export interface GroupCartItem {
  id: string;
  productId: string;
  quantity: number;
  attributes?: any;
  addedById: string;
  addedBy: GroupMember;
  product: {
    id: string;
    title: string;
    price: number;
    image: string;
    stock: number;
    vendorId: string;
  };
}

export interface GroupSession {
  id: string;
  code: string;
  title: string;
  hostUserId: string;
  checkoutMode: 'HOST_PAY' | 'SPLIT_PAY';
  status: 'ACTIVE' | 'WAITING_FOR_PAYMENTS' | 'CHECKED_OUT' | 'CLOSED' | 'EXPIRED';
  expiresAt: string;
  members: GroupMember[];
  items: GroupCartItem[];
  hostUser?: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
  };
}

export interface GroupChatMessage {
  id: string;
  sessionId: string;
  senderId: string;
  type: 'TEXT' | 'PRODUCT_SUGGESTION' | 'SYSTEM_EVENT';
  content?: string | null;
  productId?: string | null;
  replyToId?: string | null;
  replyToMessage?: {
    id: string;
    content?: string | null;
    type: string;
    sender: {
      id: string;
      guestName: string;
      user?: { id: string; name: string } | null;
    };
    product?: {
      id: string;
      title: string;
      image: string;
    } | null;
  } | null;
  reactions?: Record<string, string> | null;
  votes?: Record<string, string> | null;
  createdAt: string;
  sender: {
    id: string;
    guestName: string;
    guestEmail?: string | null;
    role: 'HOST' | 'MEMBER';
    user?: {
      id: string;
      name: string;
      email: string;
      avatar?: string | null;
    } | null;
  };
  product?: {
    id: string;
    title: string;
    price: number;
    image: string;
    stock: number;
    vendorId?: string;
  } | null;
}

export interface MemberPresence {
  memberId: string;
  memberName: string;
  memberAvatar?: string | null;
  hoveredProductId: string | null;
  cursorX?: number;
  cursorY?: number;
  isHovering: boolean;
  updatedAt: number;
}

interface GroupShoppingContextType {
  activeSession: GroupSession | null;
  isHost: boolean;
  activeMember: GroupMember | null;
  isGroupModalOpen: boolean;
  setIsGroupModalOpen: (open: boolean) => void;
  isChatDrawerOpen: boolean;
  setIsChatDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isInviteDrawerOpen: boolean;
  setIsInviteDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  messages: GroupChatMessage[];
  unreadCount: number;
  resetUnreadCount: () => void;
  memberPresences: MemberPresence[];
  updateMyPresence: (hoveredProductId: string | null, cursorX?: number, cursorY?: number, isHovering?: boolean) => void;
  isItemInGroupCart: (productId: string) => boolean;
  createSession: (title: string, checkoutMode?: 'HOST_PAY' | 'SPLIT_PAY', guestHostName?: string) => Promise<{ success: boolean; error?: string }>;
  joinSession: (code: string, guestName?: string, guestEmail?: string) => Promise<{ success: boolean; error?: string }>;
  fetchSessionDetails: (code: string) => Promise<void>;
  fetchSuggestedUsers: (code?: string, query?: string) => Promise<{ success: boolean; suggestions: Array<{ id: string; name: string; email: string; avatar?: string | null; role: string; locationLabel?: string | null; isNearby?: boolean }>; error?: string }>;
  addItemToGroup: (productId: string, quantity?: number, attributes?: any) => Promise<boolean>;
  updateItemQuantity: (itemId: string, quantity: number) => Promise<boolean>;
  removeItemFromGroup: (itemId: string) => Promise<boolean>;
  sendInviteEmails: (emails: string[]) => Promise<{ success: boolean; message?: string; error?: string }>;
  removeMember: (memberId: string) => Promise<{ success: boolean; error?: string }>;
  initiateGroupCheckout: (mode?: 'HOST_PAY' | 'SPLIT_PAY') => Promise<boolean>;
  leaveSession: () => void;
  sendMessage: (content: string, replyToId?: string) => Promise<boolean>;
  deleteMessage: (messageId: string) => Promise<boolean>;
  suggestProduct: (productId: string, comment?: string) => Promise<{ success: boolean; error?: string }>;
  isGenieThinking: boolean;
  askGenie: (prompt: string) => Promise<{ success: boolean; error?: string }>;
  toggleReaction: (messageId: string, reaction: string) => Promise<boolean>;
  toggleVote: (messageId: string, vote: string) => Promise<boolean>;
}

const GroupShoppingContext = createContext<GroupShoppingContextType | undefined>(undefined);

export function GroupShoppingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [activeSession, setActiveSession] = useState<GroupSession | null>(null);
  const [activeMember, setActiveMember] = useState<GroupMember | null>(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [isInviteDrawerOpen, setIsInviteDrawerOpen] = useState(false);
  const [messages, setMessages] = useState<GroupChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [memberPresences, setMemberPresences] = useState<MemberPresence[]>([]);
  const [isGenieThinking, setIsGenieThinking] = useState(false);
  const lastPresenceSendRef = React.useRef<number>(0);

  const isHost = activeSession && activeMember ? activeMember.role === 'HOST' : false;

  // Function to check if a product is already in the group cart
  const isItemInGroupCart = (productId: string) => {
    if (!activeSession || !Array.isArray(activeSession.items)) return false;
    return activeSession.items.some((item) => item.productId === productId || item.product?.id === productId);
  };

  // Update current user presence hover state (throttled to at most once every 1.5s)
  const updateMyPresence = async (
    hoveredProductId: string | null,
    cursorX = 50,
    cursorY = 50,
    isHovering = true
  ) => {
    if (!activeSession?.code || !activeMember) return;
    const now = Date.now();
    if (now - lastPresenceSendRef.current < 1500 && hoveredProductId !== null) return;
    lastPresenceSendRef.current = now;

    try {
      const res = await fetch(`/api/group-shopping/${activeSession.code}/presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: activeMember.id,
          memberName: activeMember.user?.name || activeMember.guestName,
          memberAvatar: activeMember.user?.avatar || null,
          hoveredProductId,
          cursorX,
          cursorY,
          isHovering,
        }),
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setMemberPresences(json.data);
      }
    } catch (err) {
      console.error('Failed to update presence:', err);
    }
  };

  // Poll presences every 1.5s if activeSession exists
  useEffect(() => {
    if (!activeSession?.code) {
      setMemberPresences([]);
      return;
    }

    const fetchPresences = async () => {
      try {
        const res = await fetch(`/api/group-shopping/${activeSession.code}/presence`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setMemberPresences(json.data);
        }
      } catch (err) {
        console.error('Failed to fetch presences:', err);
      }
    };

    fetchPresences();
    const interval = setInterval(fetchPresences, 3500);
    return () => clearInterval(interval);
  }, [activeSession?.code]);

  // Sync active code from localStorage, URL parameter, or backend user session lookup
  useEffect(() => {
    const syncActiveSession = async () => {
      const savedCode = localStorage.getItem('shopora_group_code');
      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const urlCode = urlParams ? urlParams.get('groupCode') || urlParams.get('joinCode') || urlParams.get('code') : null;

      const codeToFetch = urlCode || savedCode;
      if (codeToFetch) {
        await fetchSessionDetails(codeToFetch);
        if (urlCode) {
          setIsGroupModalOpen(true);
        }
        return;
      }

      // If no local or URL code exists, check if logged-in user belongs to an active session in DB
      if (user) {
        try {
          const res = await fetch('/api/group-shopping/user-active-session');
          const json = await res.json();
          if (json.success && json.session) {
            setActiveSession(json.session);
            if (json.member) {
              setActiveMember(json.member);
              localStorage.setItem(`shopora_group_member_${json.session.code}`, json.member.id);
            }
            localStorage.setItem('shopora_group_code', json.session.code);
            fetchMessages(json.session.code);
          }
        } catch (err) {
          console.error('Error auto-recovering user active session:', err);
        }
      }
    };

    syncActiveSession();
  }, [user]);

  // Fetch messages helper
  const fetchMessages = async (code: string) => {
    try {
      const res = await fetch(`/api/group-shopping/${code}/messages`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setMessages((prev) => {
          if (!isChatDrawerOpen && json.data.length > prev.length && prev.length > 0) {
            setUnreadCount((count) => count + (json.data.length - prev.length));
          }
          return json.data;
        });
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  // Periodic polling for real-time item, member, and message updates (every 4s when session is active)
  useEffect(() => {
    if (!activeSession?.code) return;

    fetchMessages(activeSession.code);

    const interval = setInterval(() => {
      fetchSessionDetails(activeSession.code);
      fetchMessages(activeSession.code);
    }, 4000);

    return () => clearInterval(interval);
  }, [activeSession?.code]);

  const resetUnreadCount = () => {
    setUnreadCount(0);
  };

  const fetchSessionDetails = async (code: string) => {
    try {
      const res = await fetch(`/api/group-shopping/${code}`);
      const json = await res.json();
      if (json.success && json.data) {
        setActiveSession(json.data);
        localStorage.setItem('shopora_group_code', code);

        // Find current member based on URL email param, stored member ID, or logged-in user
        const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const urlEmail = urlParams?.get('email')?.toLowerCase();

        const savedMemberId = localStorage.getItem(`shopora_group_member_${code}`);
        if (json.data.members?.length > 0) {
          let currentMember: GroupMember | null = null;

          // 1. Match by URL email if provided
          if (urlEmail) {
            currentMember = json.data.members.find(
              (m: GroupMember) =>
                (m.guestEmail && m.guestEmail.toLowerCase() === urlEmail) ||
                (m.user?.email && m.user.email.toLowerCase() === urlEmail)
            ) || null;
          }

          // 2. Match by saved member ID
          if (!currentMember && savedMemberId) {
            currentMember = json.data.members.find((m: GroupMember) => m.id === savedMemberId) || null;
          }

          // 3. Match by logged-in user ID or email
          if (!currentMember && user) {
            currentMember = json.data.members.find(
              (m: GroupMember) =>
                (m.userId && m.userId === user.id) ||
                (m.user?.id && m.user.id === user.id) ||
                (m.guestEmail && m.guestEmail.toLowerCase() === user.email.toLowerCase()) ||
                (m.user?.email && m.user.email.toLowerCase() === user.email.toLowerCase())
            ) || null;
          }

          if (currentMember) {
            setActiveMember(currentMember);
            localStorage.setItem(`shopora_group_member_${code}`, currentMember.id);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch group session details:', err);
    }
  };

  const createSession = async (
    title: string,
    checkoutMode: 'HOST_PAY' | 'SPLIT_PAY' = 'HOST_PAY',
    guestHostName?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/group-shopping/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, checkoutMode, guestHostName }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setActiveSession(json.data);
        const hostMember = json.data.members.find((m: GroupMember) => m.role === 'HOST') || json.data.members[0];
        setActiveMember(hostMember);
        localStorage.setItem('shopora_group_code', json.data.code);
        if (hostMember) {
          localStorage.setItem(`shopora_group_member_${json.data.code}`, hostMember.id);
        }
        fetchMessages(json.data.code);
        return { success: true };
      }
      return { success: false, error: json.error || 'Failed to create group shopping party.' };
    } catch (err: any) {
      console.error('Error creating group session:', err);
      return { success: false, error: err?.message || 'Failed to create group shopping party.' };
    }
  };

  const joinSession = async (
    code: string,
    guestName?: string,
    guestEmail?: string
  ): Promise<{ success: boolean; requiresLogin?: boolean; error?: string }> => {
    try {
      const res = await fetch(`/api/group-shopping/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestName, guestEmail }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setActiveSession(json.data.session);
        setActiveMember(json.data.member);
        localStorage.setItem('shopora_group_code', code);
        localStorage.setItem(`shopora_group_member_${code}`, json.data.member.id);
        await fetchSessionDetails(code);
        fetchMessages(code);
        return { success: true };
      }
      return { success: false, requiresLogin: json.requiresLogin, error: json.error || 'Failed to join group session.' };
    } catch (err: any) {
      console.error('Error joining session:', err);
      return { success: false, error: err?.message || 'Failed to join group session.' };
    }
  };

  const addItemToGroup = async (productId: string, quantity = 1, attributes?: any) => {
    if (!activeSession) return false;
    const savedMemberId = localStorage.getItem(`shopora_group_member_${activeSession.code}`);
    const memberToUse =
      (activeMember && activeSession.members?.some((m: GroupMember) => m.id === activeMember.id) ? activeMember : null) ||
      (savedMemberId ? activeSession.members?.find((m: GroupMember) => m.id === savedMemberId) : null) ||
      activeMember;

    try {
      const res = await fetch(`/api/group-shopping/${activeSession.code}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          quantity,
          attributes,
          memberId: memberToUse?.id,
        }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchSessionDetails(activeSession.code);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error adding item to group cart:', err);
      return false;
    }
  };

  const updateItemQuantity = async (itemId: string, quantity: number) => {
    if (!activeSession) return false;
    try {
      const res = await fetch(`/api/group-shopping/${activeSession.code}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, quantity }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchSessionDetails(activeSession.code);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error updating item quantity:', err);
      return false;
    }
  };

  const removeItemFromGroup = async (itemId: string) => {
    if (!activeSession) return false;
    try {
      const res = await fetch(`/api/group-shopping/${activeSession.code}/items?itemId=${itemId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        await fetchSessionDetails(activeSession.code);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error removing item from group:', err);
      return false;
    }
  };

  const sendInviteEmails = async (recipientEmails: string[]): Promise<{ success: boolean; message?: string; error?: string }> => {
    if (!activeSession) return { success: false, error: 'No active session found.' };
    try {
      const res = await fetch(`/api/group-shopping/${activeSession.code}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientEmails }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchSessionDetails(activeSession.code);
        return { success: true, message: json.message || 'Invitation emails sent successfully!' };
      }
      return { success: false, error: json.error || 'Failed to send invite emails.' };
    } catch (err: any) {
      console.error('Error sending invitations:', err);
      return { success: false, error: err?.message || 'Failed to send invitations.' };
    }
  };

  const removeMember = async (memberId: string): Promise<{ success: boolean; error?: string }> => {
    if (!activeSession) return { success: false, error: 'No active session found.' };
    try {
      const res = await fetch(`/api/group-shopping/${activeSession.code}/members?memberId=${memberId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        await fetchSessionDetails(activeSession.code);
        return { success: true };
      }
      return { success: false, error: json.error || 'Failed to remove member.' };
    } catch (err: any) {
      console.error('Error removing member:', err);
      return { success: false, error: err?.message || 'Failed to remove member.' };
    }
  };

  const initiateGroupCheckout = async (mode?: 'HOST_PAY' | 'SPLIT_PAY') => {
    if (!activeSession) return false;
    try {
      const res = await fetch(`/api/group-shopping/${activeSession.code}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkoutMode: mode || activeSession.checkoutMode }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchSessionDetails(activeSession.code);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error initiating group checkout:', err);
      return false;
    }
  };

  const leaveSession = async () => {
    if (activeSession) {
      const code = activeSession.code;
      const memberIdToDelete = activeMember?.id || (typeof window !== 'undefined' ? localStorage.getItem(`shopora_group_member_${code}`) : null);

      try {
        const queryParam = memberIdToDelete ? `?memberId=${memberIdToDelete}` : '';
        await fetch(`/api/group-shopping/${code}/members${queryParam}`, {
          method: 'DELETE',
        });
      } catch (err) {
        console.error('Error leaving group party on backend:', err);
      }

      localStorage.removeItem('shopora_group_code');
      localStorage.removeItem(`shopora_group_member_${code}`);
    }
    setActiveSession(null);
    setActiveMember(null);
    setMessages([]);
    setUnreadCount(0);
  };

  const sendMessage = async (content: string, replyToId?: string) => {
    if (!activeSession || !content.trim()) return false;
    const savedMemberId = localStorage.getItem(`shopora_group_member_${activeSession.code}`);
    const memberToUse =
      (activeMember && activeSession.members?.some((m: GroupMember) => m.id === activeMember.id) ? activeMember : null) ||
      (savedMemberId ? activeSession.members?.find((m: GroupMember) => m.id === savedMemberId) : null) ||
      activeMember;

    if (!memberToUse) return false;

    try {
      const res = await fetch(`/api/group-shopping/${activeSession.code}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: memberToUse.id,
          type: 'TEXT',
          content: content.trim(),
          replyToId: replyToId || null,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        if (!activeMember) {
          setActiveMember(memberToUse);
          localStorage.setItem(`shopora_group_member_${activeSession.code}`, memberToUse.id);
        }
        fetchMessages(activeSession.code);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error sending message:', err);
      return false;
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!activeSession) return false;
    const savedMemberId = localStorage.getItem(`shopora_group_member_${activeSession.code}`);
    const memberToUse =
      (activeMember && activeSession.members?.some((m: GroupMember) => m.id === activeMember.id) ? activeMember : null) ||
      (savedMemberId ? activeSession.members?.find((m: GroupMember) => m.id === savedMemberId) : null) ||
      activeMember;

    if (!memberToUse) return false;

    // Optimistically remove from state
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId));

    try {
      const res = await fetch(
        `/api/group-shopping/${activeSession.code}/messages/${messageId}?memberId=${memberToUse.id}`,
        { method: 'DELETE' }
      );
      const json = await res.json();
      if (json.success) {
        return true;
      }
      fetchMessages(activeSession.code);
      return false;
    } catch (err) {
      console.error('Error deleting message:', err);
      fetchMessages(activeSession.code);
      return false;
    }
  };

  const suggestProduct = async (productId: string, comment?: string): Promise<{ success: boolean; error?: string }> => {
    if (!activeSession || !productId) {
      return { success: false, error: 'Please start or join a group shopping session first.' };
    }

    const savedMemberId = localStorage.getItem(`shopora_group_member_${activeSession.code}`);
    const memberToUse =
      (activeMember && activeSession.members?.some((m: GroupMember) => m.id === activeMember.id) ? activeMember : null) ||
      (savedMemberId ? activeSession.members?.find((m: GroupMember) => m.id === savedMemberId) : null) ||
      activeMember;

    if (!memberToUse) {
      return { success: false, error: 'You must join the group session to share suggestions.' };
    }

    try {
      const res = await fetch(`/api/group-shopping/${activeSession.code}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: memberToUse.id,
          type: 'PRODUCT_SUGGESTION',
          content: comment || null,
          productId,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        if (!activeMember) {
          setActiveMember(memberToUse);
          localStorage.setItem(`shopora_group_member_${activeSession.code}`, memberToUse.id);
        }
        await fetchMessages(activeSession.code);
        return { success: true };
      }
      return { success: false, error: json.error || 'Failed to share product suggestion.' };
    } catch (err: any) {
      console.error('Error suggesting product:', err);
      return { success: false, error: err?.message || 'Failed to connect to server. Please try again.' };
    }
  };

  const toggleReaction = async (messageId: string, reaction: string) => {
    if (!activeSession) return false;
    const savedMemberId = localStorage.getItem(`shopora_group_member_${activeSession.code}`);
    const memberToUse =
      (activeMember && activeSession.members?.some((m: GroupMember) => m.id === activeMember.id) ? activeMember : null) ||
      (savedMemberId ? activeSession.members?.find((m: GroupMember) => m.id === savedMemberId) : null) ||
      activeMember;

    if (!memberToUse) return false;

    // Optimistically toggle reaction locally
    setMessages((prevMessages) =>
      prevMessages.map((msg) => {
        if (msg.id !== messageId) return msg;
        const currentReactions = { ...(msg.reactions || {}) };
        if (currentReactions[memberToUse.id] === reaction) {
          delete currentReactions[memberToUse.id];
        } else {
          currentReactions[memberToUse.id] = reaction;
        }
        return { ...msg, reactions: currentReactions };
      })
    );

    try {
      const res = await fetch(
        `/api/group-shopping/${activeSession.code}/messages/${messageId}/react`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memberId: memberToUse.id,
            reaction,
          }),
        }
      );
      const json = await res.json();
      if (json.success) {
        return true;
      }
      fetchMessages(activeSession.code);
      return false;
    } catch (err) {
      console.error('Error toggling reaction:', err);
      fetchMessages(activeSession.code);
      return false;
    }
  };

  const toggleVote = async (messageId: string, vote: string) => {
    if (!activeSession) return false;
    const savedMemberId = localStorage.getItem(`shopora_group_member_${activeSession.code}`);
    const memberToUse =
      (activeMember && activeSession.members?.some((m: GroupMember) => m.id === activeMember.id) ? activeMember : null) ||
      (savedMemberId ? activeSession.members?.find((m: GroupMember) => m.id === savedMemberId) : null) ||
      activeMember;

    if (!memberToUse) return false;

    try {
      const res = await fetch(
        `/api/group-shopping/${activeSession.code}/messages/${messageId}/vote`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memberId: memberToUse.id,
            vote,
          }),
        }
      );
      const json = await res.json();
      if (json.success) {
        fetchMessages(activeSession.code);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error toggling vote:', err);
      return false;
    }
  };

  const fetchSuggestedUsers = async (
    code?: string,
    query = ''
  ): Promise<{ success: boolean; suggestions: Array<{ id: string; name: string; email: string; avatar?: string | null; role: string }>; error?: string }> => {
    const sessionCode = code || activeSession?.code;
    if (!sessionCode) return { success: false, suggestions: [], error: 'No active session' };
    try {
      const url = `/api/group-shopping/${sessionCode}/suggestions${query ? `?q=${encodeURIComponent(query)}` : ''}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && Array.isArray(json.suggestions)) {
        return { success: true, suggestions: json.suggestions };
      }
      return { success: false, suggestions: [], error: json.error || 'Failed to fetch suggestions' };
    } catch (err: any) {
      console.error('Error fetching suggested users:', err);
      return { success: false, suggestions: [], error: err?.message || 'Failed to fetch suggestions' };
    }
  };

  const askGenie = async (prompt: string): Promise<{ success: boolean; error?: string }> => {
    let sessionCode = activeSession?.code || (typeof window !== 'undefined' ? localStorage.getItem('shopora_group_code') : null);

    if (!sessionCode || !prompt.trim()) {
      return { success: false, error: 'Please start or join a group shopping session first.' };
    }

    setIsGenieThinking(true);
    try {
      let res = await fetch(`/api/group-shopping/${sessionCode}/genie`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      let json = await res.json();

      // If session was stale or returned 404, auto-recover session details and retry
      if (!json.success && (json.error?.includes('Active group session') || res.status === 404)) {
        await fetchSessionDetails(sessionCode);
        const refreshedCode = (typeof window !== 'undefined' ? localStorage.getItem('shopora_group_code') : null) || sessionCode;
        res = await fetch(`/api/group-shopping/${refreshedCode}/genie`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });
        json = await res.json();
      }

      if (json.success) {
        await fetchMessages(sessionCode);
        return { success: true };
      }
      return { success: false, error: json.error || 'Shopora Genie could not process request.' };
    } catch (err: any) {
      console.error('Error asking Genie:', err);
      return { success: false, error: err?.message || 'Failed to contact Shopora Genie.' };
    } finally {
      setIsGenieThinking(false);
    }
  };

  return (
    <GroupShoppingContext.Provider
      value={{
        activeSession,
        isHost,
        activeMember,
        isGroupModalOpen,
        setIsGroupModalOpen,
        isChatDrawerOpen,
        setIsChatDrawerOpen,
        isInviteDrawerOpen,
        setIsInviteDrawerOpen,
        messages,
        unreadCount,
        resetUnreadCount,
        memberPresences,
        updateMyPresence,
        isItemInGroupCart,
        createSession,
        joinSession,
        fetchSessionDetails,
        fetchSuggestedUsers,
        addItemToGroup,
        updateItemQuantity,
        removeItemFromGroup,
        sendInviteEmails,
        removeMember,
        initiateGroupCheckout,
        leaveSession,
        sendMessage,
        deleteMessage,
        suggestProduct,
        isGenieThinking,
        askGenie,
        toggleReaction,
        toggleVote,
      }}
    >
      {children}
    </GroupShoppingContext.Provider>
  );
}

export function useGroupShopping() {
  const context = useContext(GroupShoppingContext);
  if (!context) {
    throw new Error('useGroupShopping must be used within a GroupShoppingProvider');
  }
  return context;
}
