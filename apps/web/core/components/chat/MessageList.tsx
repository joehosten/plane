/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { observer } from "mobx-react";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { ChevronDown } from "lucide-react";
import type { TMessage } from "@plane/types";
import { useUser } from "@/hooks/store/user";
import { useChat, useMessages } from "@/hooks/store/use-chat";
import { useMember } from "@/hooks/store/use-member";
import { MessageItem } from "./MessageItem";

/** Messages from the same sender within this window are grouped (compact mode: no avatar/name repeated). */
const MESSAGE_GROUP_THRESHOLD_MS = 5 * 60 * 1000;

function DateSeparator({ date }: { date: Date }) {
  let label: string;
  if (isToday(date)) label = "Today";
  else if (isYesterday(date)) label = "Yesterday";
  else label = format(date, "MMMM d, yyyy");

  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <div className="flex-1 h-px bg-subtle" />
      <span className="text-11 font-medium text-tertiary">{label}</span>
      <div className="flex-1 h-px bg-subtle" />
    </div>
  );
}

function groupMessages(messages: TMessage[]): Array<TMessage | Date> {
  const result: Array<TMessage | Date> = [];
  let lastDate: Date | null = null;
  messages.forEach((msg) => {
    const msgDate = new Date(msg.created_at);
    if (!lastDate || !isSameDay(lastDate, msgDate)) {
      result.push(msgDate);
      lastDate = msgDate;
    }
    result.push(msg);
  });
  return result;
}

export const MessageList = observer(function MessageList({
  workspaceSlug,
  channelId,
  onOpenThread,
}: {
  workspaceSlug: string;
  channelId: string;
  onOpenThread?: (messageId: string) => void;
}) {
  const chat = useChat();
  const { data: currentUser } = useUser();
  const { messages, pagination } = useMessages(channelId);
  const { getUserDetails } = useMember();
  const bottomRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const isUserScrolledUp = useRef(false);

  useEffect(() => {
    void chat.message.fetchMessages(workspaceSlug, channelId);
  }, [channelId, chat, workspaceSlug]);

  useEffect(() => {
    chat.realtime.connect({ channelId, workspaceSlug, userId: currentUser?.id });
    return () => chat.realtime.disconnect();
  }, [channelId, chat, currentUser?.id, workspaceSlug]);

  const scrollToBottom = useCallback((smooth = false) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }, []);

  useEffect(() => {
    if (!isUserScrolledUp.current) {
      scrollToBottom();
    } else {
      setShowScrollButton(true);
    }
  }, [messages.length, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [channelId, scrollToBottom]);

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    isUserScrolledUp.current = distFromBottom > 100;
    if (distFromBottom < 50) setShowScrollButton(false);
  };

  useEffect(() => {
    if (!topSentinelRef.current || !pagination?.next_cursor) return;
    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (entry.isIntersecting && pagination?.next_cursor && !isLoadingMore) {
          setIsLoadingMore(true);
          try {
            await chat.message.fetchMessages(workspaceSlug, channelId, pagination.next_cursor);
          } finally {
            setIsLoadingMore(false);
          }
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(topSentinelRef.current);
    return () => observer.disconnect();
  }, [pagination?.next_cursor, isLoadingMore, chat, workspaceSlug, channelId]);

  const typingUsers = chat.realtime.typingIndicators.get(channelId);
  const typingNames = typingUsers
    ? [...typingUsers].map((uid) => getUserDetails(uid)?.display_name ?? uid).filter(Boolean)
    : [];

  const topLevelMessages = messages.filter((message) => !message.parent);
  const grouped = groupMessages(topLevelMessages);

  if (!topLevelMessages.length) {
    const channel = chat.channel.getChannel(channelId);
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        <div className="text-4xl">💬</div>
        <p className="text-16 font-semibold text-primary">#{channel?.name ?? "Channel"}</p>
        {channel?.description && <p className="text-13 text-secondary max-w-xs">{channel.description}</p>}
        <p className="text-13 text-tertiary">No messages yet. Be the first to send one!</p>
      </div>
    );
  }

  return (
      <div className="relative flex h-full flex-col overflow-hidden bg-surface-1">
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex flex-1 flex-col overflow-y-auto py-3"
      >
        {/* Sentinel for infinite scroll upward */}
        <div ref={topSentinelRef} className="h-1">
          {isLoadingMore && (
            <div className="p-2 text-center text-13 text-tertiary">Loading older messages…</div>
          )}
        </div>

        {grouped.map((item, idx) => {
          if (item instanceof Date) {
            return <DateSeparator key={`sep-${idx}`} date={item} />;
          }

          const msg = item as TMessage;
          const prevMsg = grouped[idx - 1];
          const isCompact =
            prevMsg &&
            !(prevMsg instanceof Date) &&
            (prevMsg as TMessage).sender === msg.sender &&
            new Date(msg.created_at).getTime() - new Date((prevMsg as TMessage).created_at).getTime() <
              MESSAGE_GROUP_THRESHOLD_MS;

          return (
            <MessageItem
              key={msg.id}
              message={msg}
              workspaceSlug={workspaceSlug}
              channelId={channelId}
              isCompact={!!isCompact}
              onOpenThread={onOpenThread}
            />
          );
        })}

        {/* Typing indicator */}
        {typingNames.length > 0 && (
          <div className="px-5 py-2 text-13 text-tertiary italic transition-opacity">
            {typingNames.join(", ")} {typingNames.length === 1 ? "is" : "are"} typing…
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Scroll-to-bottom button */}
      {showScrollButton && (
        <button
          type="button"
          onClick={() => { scrollToBottom(true); setShowScrollButton(false); isUserScrolledUp.current = false; }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full border border-subtle bg-surface-1 px-4 py-2 text-13 text-primary shadow-md transition-all duration-200 hover:bg-surface-2"
        >
          <ChevronDown className="h-3.5 w-3.5" />
          New messages
        </button>
      )}
    </div>
  );
});
