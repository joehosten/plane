/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect } from "react";
import { observer } from "mobx-react";
import { useChat, useMessages } from "@/hooks/store/use-chat";
import { MessageItem } from "./MessageItem";

export const MessageList = observer(function MessageList({
  workspaceSlug,
  channelId,
}: {
  workspaceSlug: string;
  channelId: string;
}) {
  const chat = useChat();
  const { messages, pagination } = useMessages(channelId);

  useEffect(() => {
    void chat.message.fetchMessages(workspaceSlug, channelId);
  }, [channelId, chat, workspaceSlug]);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {pagination?.next_cursor && (
        <div className="p-2">
          <button
            type="button"
            className="rounded border border-subtle px-3 py-1 text-12 text-secondary"
            onClick={() => void chat.message.fetchMessages(workspaceSlug, channelId, pagination.next_cursor)}
          >
            Load older messages
          </button>
        </div>
      )}
      <div className="flex flex-col gap-1 py-2">
        {messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
      </div>
    </div>
  );
});
