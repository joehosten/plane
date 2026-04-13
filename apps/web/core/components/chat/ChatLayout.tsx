/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { useChat } from "@/hooks/store/use-chat";
import { useUser } from "@/hooks/store/user";
import { ChannelSidebar } from "./ChannelSidebar";
import { MessageThread } from "./MessageThread";

export function ChatLayout({
  workspaceSlug,
  projectId,
  children,
}: {
  workspaceSlug: string;
  projectId?: string;
  children: ReactNode;
}) {
  const chat = useChat();
  const { data: currentUser } = useUser();
  const [threadMessageId, setThreadMessageId] = useState<string | null>(null);
  const [threadChannelId, setThreadChannelId] = useState<string | null>(null);

  // Register current user ID and toast callback with realtime store
  useEffect(() => {
    if (!currentUser?.id) return;
    chat.realtime.setCurrentUserId(currentUser.id);
    chat.realtime.setToastCallback(({ title, message }) => {
      setToast({ type: TOAST_TYPE.INFO, title, message });
    });
  }, [chat, currentUser?.id]);

  const openThread = (channelId: string, messageId: string) => {
    setThreadChannelId(channelId);
    setThreadMessageId(messageId);
  };

  const closeThread = () => {
    setThreadMessageId(null);
    setThreadChannelId(null);
  };

  return (
    <div className="flex h-full overflow-hidden">
      <ChannelSidebar workspaceSlug={workspaceSlug} projectId={projectId} />
      <div className="flex min-w-0 flex-1 flex-col">
        {typeof children === "function"
          ? (children as (openThread: (channelId: string, messageId: string) => void) => ReactNode)(openThread)
          : children}
      </div>
      {threadMessageId && threadChannelId && (
        <MessageThread
          workspaceSlug={workspaceSlug}
          channelId={threadChannelId}
          parentMessageId={threadMessageId}
          onClose={closeThread}
        />
      )}
    </div>
  );
}
