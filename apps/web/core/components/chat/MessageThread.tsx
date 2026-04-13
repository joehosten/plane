/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect } from "react";
import { observer } from "mobx-react";
import { X } from "lucide-react";
import { useChat, useMessages } from "@/hooks/store/use-chat";
import { MessageItem } from "./MessageItem";
import { MessageComposer } from "./MessageComposer";

export const MessageThread = observer(function MessageThread({
  workspaceSlug,
  channelId,
  parentMessageId,
  onClose,
}: {
  workspaceSlug: string;
  channelId: string;
  parentMessageId: string;
  onClose?: () => void;
}) {
  const chat = useChat();
  const thread = chat.message.threadMessages.get(parentMessageId) ?? [];
  const { messages: channelMessages } = useMessages(channelId);
  const parentMessage = channelMessages.find((m) => m.id === parentMessageId);

  useEffect(() => {
    void chat.message.fetchThread(workspaceSlug, channelId, parentMessageId);
  }, [channelId, chat, parentMessageId, workspaceSlug]);

  return (
    <aside className="flex h-full w-96 flex-shrink-0 flex-col border-l border-subtle bg-surface-2">
      {/* Thread header */}
      <div className="flex items-center justify-between border-b border-subtle px-4 py-3">
        <div>
          <div className="text-13 font-semibold text-primary">Thread</div>
          {thread.length > 0 && (
            <div className="text-11 text-tertiary">{thread.length} {thread.length === 1 ? "reply" : "replies"}</div>
          )}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-tertiary hover:bg-surface-3 hover:text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Parent message */}
        {parentMessage && (
          <div className="border-b border-subtle pb-2">
            <MessageItem
              message={parentMessage}
              workspaceSlug={workspaceSlug}
              channelId={channelId}
              isCompact={false}
            />
          </div>
        )}

        {thread.length > 0 && (
          <div className="px-4 py-2 text-11 font-medium text-tertiary">
            {thread.length} {thread.length === 1 ? "reply" : "replies"}
          </div>
        )}

        {thread.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            workspaceSlug={workspaceSlug}
            channelId={channelId}
          />
        ))}
      </div>
      <MessageComposer workspaceSlug={workspaceSlug} channelId={channelId} parentId={parentMessageId} />
    </aside>
  );
});
