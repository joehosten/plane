/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { ChatLayout } from "@/components/chat/ChatLayout";
import { ChannelHeader } from "@/components/chat/ChannelHeader";
import { MessageComposer } from "@/components/chat/MessageComposer";
import { MessageList } from "@/components/chat/MessageList";
import type { Route } from "./+types/page";

function MessagingChannelPage({ params }: Route.ComponentProps) {
  const { workspaceSlug, channelId } = params;
  return (
    <ChatLayout workspaceSlug={workspaceSlug}>
      <ChannelHeader channelId={channelId} />
      <div className="flex min-h-0 flex-1 flex-col">
        <MessageList workspaceSlug={workspaceSlug} channelId={channelId} />
        <MessageComposer workspaceSlug={workspaceSlug} channelId={channelId} />
      </div>
    </ChatLayout>
  );
}

export default observer(MessagingChannelPage);
