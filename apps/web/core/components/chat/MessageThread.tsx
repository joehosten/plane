/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect } from "react";
import { observer } from "mobx-react";
import { useChat } from "@/hooks/store/use-chat";
import { MessageItem } from "./MessageItem";
import { MessageComposer } from "./MessageComposer";

export const MessageThread = observer(function MessageThread({
  workspaceSlug,
  channelId,
  parentMessageId,
}: {
  workspaceSlug: string;
  channelId: string;
  parentMessageId: string;
}) {
  const chat = useChat();
  const thread = chat.message.threadMessages.get(parentMessageId) ?? [];

  useEffect(() => {
    void chat.message.fetchThread(workspaceSlug, channelId, parentMessageId);
  }, [channelId, chat, parentMessageId, workspaceSlug]);

  return (
    <aside className="flex h-full w-96 flex-col border-l border-subtle bg-surface-2">
      <div className="text-sm border-b border-subtle px-4 py-3 font-semibold text-primary">Thread</div>
      <div className="flex-1 overflow-y-auto py-2">
        {thread.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
      </div>
      <MessageComposer workspaceSlug={workspaceSlug} channelId={channelId} parentId={parentMessageId} />
    </aside>
  );
});
