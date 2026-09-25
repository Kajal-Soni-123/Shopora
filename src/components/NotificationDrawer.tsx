'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useGroupShopping } from '@/context/GroupShoppingContext';

interface NotificationItem {
  id: string;
  userId?: string | null;
  email?: string | null;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  metadata?: any;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationDrawer() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isJoiningCode, setIsJoiningCode] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { joinSession, setIsGroupModalOpen } = useGroupShopping();

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (data.success && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 15 seconds for real-time in-app updates
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkItemRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: [id] }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const handleDirectJoinParty = async (notif: NotificationItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    let code = notif.metadata?.groupCode;
    if (!code && notif.link) {
      const match = notif.link.match(/groupCode=([A-Za-z0-9_-]+)/);
      if (match) code = match[1];
    }

    if (!code) return;

    setIsJoiningCode(code);
    if (!notif.isRead) {
      handleMarkItemRead(notif.id);
    }

    try {
      const res = await joinSession(code);
      setIsOpen(false);
      if (res.success) {
        setIsGroupModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to join party directly:', err);
    } finally {
      setIsJoiningCode(null);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'CO_SHOP_INVITE':
        return '🛍️';
      case 'CATEGORY_REQUEST':
        return '📂';
      case 'PRODUCT_BACK_IN_STOCK':
        return '🎉';
      case 'ORDER_UPDATE':
        return '📦';
      default:
        return '🔔';
    }
  };

  const filteredNotifications =
    activeFilter === 'UNREAD'
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2.5 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
        title="Notifications"
        aria-label="Notifications"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          ></path>
        </svg>

        {/* Unread Counter Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black text-white bg-rose-600 rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Drawer */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={isLoading}
                className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-semibold hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Filter Bar */}
          <div className="flex border-b border-slate-100 dark:border-slate-800 px-4 pt-2 bg-white dark:bg-slate-900">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-colors ${
                activeFilter === 'ALL'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveFilter('UNREAD')}
              className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-colors ${
                activeFilter === 'UNREAD'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notification Items List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-3xl mb-2">🔔</div>
                <p className="text-xs text-slate-500 font-medium">
                  {activeFilter === 'UNREAD' ? 'No unread notifications' : 'No notifications yet'}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const isCoShopInvite = notif.type === 'CO_SHOP_INVITE';

                const content = (
                  <div
                    key={notif.id}
                    onClick={(e) => {
                      if (isCoShopInvite) {
                        handleDirectJoinParty(notif, e);
                      } else {
                        if (!notif.isRead) handleMarkItemRead(notif.id);
                        setIsOpen(false);
                      }
                    }}
                    className={`p-3.5 flex items-start space-x-3 transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                      !notif.isRead
                        ? 'bg-indigo-50/40 dark:bg-indigo-950/20'
                        : 'bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="text-xl p-2 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0">
                      {getTypeIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-xs font-bold text-slate-900 dark:text-slate-100 truncate ${!notif.isRead ? 'text-indigo-950 dark:text-indigo-200' : ''}`}>
                          {notif.title}
                        </p>
                        <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                          {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>

                      {/* Direct Join Button for Co-Shop Invitations */}
                      {isCoShopInvite && (
                        <div className="mt-2.5">
                          <button
                            type="button"
                            onClick={(e) => handleDirectJoinParty(notif, e)}
                            disabled={isJoiningCode === (notif.metadata?.groupCode || notif.id)}
                            className="w-full py-1.5 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <span>{isJoiningCode ? 'Joining Party...' : '🎉 Join Party Now'}</span>
                            {!isJoiningCode && (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                              </svg>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                    {!notif.isRead && (
                      <span
                        onClick={(e) => handleMarkItemRead(notif.id, e)}
                        className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1.5 hover:scale-125 transition-transform"
                        title="Mark as read"
                      />
                    )}
                  </div>
                );

                let targetLink = notif.link;
                if (notif.type === 'CATEGORY_REQUEST' && (!targetLink || targetLink === '/admin/dashboard')) {
                  targetLink = '/admin/dashboard?tab=category-requests';
                }

                if (targetLink && !isCoShopInvite) {
                  return (
                    <Link key={notif.id} href={targetLink} className="block">
                      {content}
                    </Link>
                  );
                }

                return <div key={notif.id}>{content}</div>;
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
