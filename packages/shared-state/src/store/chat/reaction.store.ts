/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { action, makeObservable } from "mobx";
import type { TMessage, TMessageReaction } from "@plane/types";
import { ReactionService } from "@plane/services";
import type { IChatRootStore } from "./index";

export interface IReactionStore {
  addReaction: (
    workspaceSlug: string,
    channelId: string,
    messageId: string,
    emoji: string
  ) => Promise<TMessageReaction>;
  removeReaction: (workspaceSlug: string, channelId: string, messageId: string, emoji: string) => Promise<void>;
  applyReactionAdded: (reaction: TMessageReaction) => void;
  applyReactionRemoved: (payload: { message: string; reaction: string }) => void;
}

export class ReactionStore implements IReactionStore {
  private readonly service = new ReactionService();
  constructor(private readonly rootStore: IChatRootStore) {
    makeObservable(this, {
      addReaction: action,
      removeReaction: action,
      applyReactionAdded: action,
      applyReactionRemoved: action,
    });
  }

  addReaction = async (workspaceSlug: string, channelId: string, messageId: string, emoji: string) => {
    const reaction = await this.service.add(workspaceSlug, channelId, messageId, emoji);
    this.applyReactionAdded(reaction);
    return reaction;
  };

  removeReaction = async (workspaceSlug: string, channelId: string, messageId: string, emoji: string) => {
    await this.service.remove(workspaceSlug, channelId, messageId, emoji);
    this.applyReactionRemoved({ message: messageId, reaction: emoji });
  };

  applyReactionAdded = (reaction: TMessageReaction) => {
    this.updateMessageReactionSummary(reaction.message, reaction.reaction, 1);
  };

  applyReactionRemoved = (payload: { message: string; reaction: string }) => {
    this.updateMessageReactionSummary(payload.message, payload.reaction, -1);
  };

  private updateMessageReactionSummary(messageId: string, reactionCode: string, delta: number) {
    const updateMessage = (message: TMessage): TMessage => {
      if (message.id !== messageId) return message;
      const existing = message.reactions.find((reaction) => reaction.reaction === reactionCode);
      if (!existing && delta < 0) return message;
      const reactions = existing
        ? message.reactions
            .map((reaction) =>
              reaction.reaction === reactionCode
                ? { ...reaction, count: Math.max(reaction.count + delta, 0) }
                : reaction
            )
            .filter((reaction) => reaction.count > 0)
        : [...message.reactions, { reaction: reactionCode, count: 1 }];
      return { ...message, reactions };
    };

    this.rootStore.message.channelMessages.forEach((messages, channelId) => {
      this.rootStore.message.channelMessages.set(channelId, messages.map(updateMessage));
    });
    this.rootStore.message.threadMessages.forEach((messages, threadId) => {
      this.rootStore.message.threadMessages.set(threadId, messages.map(updateMessage));
    });
  }
}
