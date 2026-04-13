/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { IChannelStore } from "./channel.store";
import { ChannelStore } from "./channel.store";
import type { IMessageStore } from "./message.store";
import { MessageStore } from "./message.store";
import type { IReactionStore } from "./reaction.store";
import { ReactionStore } from "./reaction.store";
import type { IPresenceStore } from "./presence.store";
import { PresenceStore } from "./presence.store";
import type { IChatRealtimeStore } from "./chat-realtime.store";
import { ChatRealtimeStore } from "./chat-realtime.store";

export interface IChatRootStore {
  channel: IChannelStore;
  message: IMessageStore;
  reaction: IReactionStore;
  presence: IPresenceStore;
  realtime: IChatRealtimeStore;
}

export class ChatRootStore implements IChatRootStore {
  channel: IChannelStore;
  message: IMessageStore;
  reaction: IReactionStore;
  presence: IPresenceStore;
  realtime: IChatRealtimeStore;

  constructor() {
    this.channel = new ChannelStore();
    this.message = new MessageStore();
    this.presence = new PresenceStore();
    this.reaction = new ReactionStore(this);
    this.realtime = new ChatRealtimeStore(this);
  }
}

export * from "./channel.store";
export * from "./message.store";
export * from "./reaction.store";
export * from "./presence.store";
export * from "./chat-realtime.store";
