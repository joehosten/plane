/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { action, makeObservable, observable } from "mobx";
import type { TMessage, TMessageReaction } from "@plane/types";
import { ReactionService } from "@plane/services";
import type { IChatRootStore } from "./index";

export interface IReactionStore {
  myReactions: Map<string, Set<string>>;
  addReaction: (
    workspaceSlug: string,
    channelId: string,
    messageId: string,
    emoji: string
  ) => Promise<TMessageReaction>;
  removeReaction: (workspaceSlug: string, channelId: string, messageId: string, emoji: string) => Promise<void>;
  applyReactionAdded: (reaction: TMessageReaction) => void;
  applyReactionRemoved: (payload: { message: string; reaction: string; actor: string }) => void;
  hasMyReaction: (messageId: string, emoji: string) => boolean;
  setCurrentUserId: (userId: string) => void;
}

export class ReactionStore implements IReactionStore {
  /** Map from messageId → Set of emoji strings that the current user has reacted with. */
  myReactions = new Map<string, Set<string>>();
  private currentUserId: string | null = null;
  private readonly service = new ReactionService();
  constructor(private readonly rootStore: IChatRootStore) {
    makeObservable(this, {
      myReactions: observable,
      addReaction: action,
      removeReaction: action,
      applyReactionAdded: action,
      applyReactionRemoved: action,
    });
  }

  setCurrentUserId = (userId: string) => {
    this.currentUserId = userId;
  };

  hasMyReaction = (messageId: string, emoji: string): boolean => {
    return this.myReactions.get(messageId)?.has(emoji) ?? false;
  };

  addReaction = async (workspaceSlug: string, channelId: string, messageId: string, emoji: string) => {
    const reaction = await this.service.add(workspaceSlug, channelId, messageId, emoji);
    this.applyReactionAdded(reaction);
    const mine = new Set(this.myReactions.get(messageId) ?? []);
    mine.add(emoji);
    this.myReactions.set(messageId, mine);
    return reaction;
  };

  removeReaction = async (workspaceSlug: string, channelId: string, messageId: string, emoji: string) => {
    await this.service.remove(workspaceSlug, channelId, messageId, emoji);
    this.applyReactionRemoved({ message: messageId, reaction: emoji, actor: this.currentUserId ?? "" });
    const mine = new Set(this.myReactions.get(messageId) ?? []);
    mine.delete(emoji);
    this.myReactions.set(messageId, mine);
  };

  applyReactionAdded = (reaction: TMessageReaction) => {
    this.updateMessageReactionSummary(reaction.message, reaction.reaction, 1);
    if (this.currentUserId && reaction.actor === this.currentUserId) {
      const mine = new Set(this.myReactions.get(reaction.message) ?? []);
      mine.add(reaction.reaction);
      this.myReactions.set(reaction.message, mine);
    }
  };

  applyReactionRemoved = (payload: { message: string; reaction: string; actor: string }) => {
    this.updateMessageReactionSummary(payload.message, payload.reaction, -1);
    if (this.currentUserId && payload.actor === this.currentUserId) {
      const mine = new Set(this.myReactions.get(payload.message) ?? []);
      mine.delete(payload.reaction);
      this.myReactions.set(payload.message, mine);
    }
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
