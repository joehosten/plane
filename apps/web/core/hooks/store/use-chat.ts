/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useContext } from "react";
import type { TUserPresence } from "@plane/types";
import { StoreContext } from "@/lib/store-context";
import type { IChatRootStore } from "@plane/shared-state";

export const useChat = (): IChatRootStore => {
  const context = useContext(StoreContext);
  if (context === undefined) throw new Error("useChat must be used within StoreProvider");
  return context.chatRoot;
};

export const useChannel = (channelId: string) => {
  const chat = useChat();
  return chat.channel.getChannel(channelId);
};

export const useMessages = (channelId: string) => {
  const chat = useChat();
  return {
    messages: chat.message.getMessages(channelId),
    pagination: chat.message.messagePagination.get(channelId),
  };
};

export const usePresence = (_workspaceSlug: string): TUserPresence[] => {
  const chat = useChat();
  return [...chat.presence.workspacePresence.values()];
};

export const useChannelMembers = (channelId: string) => {
  const chat = useChat();
  return chat.channel.getMembers(channelId);
};

export const useChannelPermissions = (channelId: string) => {
  const chat = useChat();
  return chat.channel.getPermissions(channelId);
};
