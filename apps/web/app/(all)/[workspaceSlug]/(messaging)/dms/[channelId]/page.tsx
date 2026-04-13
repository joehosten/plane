/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { observer } from "mobx-react";
import { ChatLayout } from "@/components/chat/ChatLayout";
import { ChannelHeader } from "@/components/chat/ChannelHeader";
import { MessageComposer } from "@/components/chat/MessageComposer";
import { MessageList } from "@/components/chat/MessageList";
import { MessageThread } from "@/components/chat/MessageThread";
import type { Route } from "./+types/page";

function DirectMessagePage({ params }: Route.ComponentProps) {
  const { workspaceSlug, channelId } = params;
  const [threadMessageId, setThreadMessageId] = useState<string | null>(null);

  return (
    <ChatLayout workspaceSlug={workspaceSlug}>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col">
          <ChannelHeader channelId={channelId} workspaceSlug={workspaceSlug} />
          <div className="flex min-h-0 flex-1 flex-col">
            <MessageList
              workspaceSlug={workspaceSlug}
              channelId={channelId}
              onOpenThread={(msgId) => setThreadMessageId(msgId)}
            />
            <MessageComposer workspaceSlug={workspaceSlug} channelId={channelId} />
          </div>
        </div>
        {threadMessageId && (
          <MessageThread
            workspaceSlug={workspaceSlug}
            channelId={channelId}
            parentMessageId={threadMessageId}
            onClose={() => setThreadMessageId(null)}
          />
        )}
      </div>
    </ChatLayout>
  );
}

export default observer(DirectMessagePage);
