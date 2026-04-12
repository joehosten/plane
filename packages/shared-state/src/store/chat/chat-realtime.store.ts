/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { action, makeObservable, observable } from "mobx";
import { ChatWebSocketService } from "@plane/services";
import type { TChatWebSocketEvent, TUserPresence } from "@plane/types";
import type { IChatRootStore } from "./index";

export interface IChatRealtimeStore {
  typingIndicators: Map<string, Set<string>>;
  connect: (params: { channelId: string; workspaceSlug: string; userId: string; projectId?: string }) => void;
  disconnect: () => void;
  sendEvent: (event: TChatWebSocketEvent) => void;
  sendTypingStart: (channelId: string, userId: string) => void;
  sendTypingStop: (channelId: string, userId: string) => void;
}

export class ChatRealtimeStore implements IChatRealtimeStore {
  typingIndicators = new Map<string, Set<string>>();
  private readonly service = new ChatWebSocketService();
  private heartbeatId: number | null = null;

  constructor(private readonly rootStore: IChatRootStore) {
    makeObservable(this, {
      typingIndicators: observable,
      connect: action,
      disconnect: action,
      sendTypingStart: action,
      sendTypingStop: action,
    });
    this.service.on((event) => this.handleEvent(event));
  }

  connect = (params: { channelId: string; workspaceSlug: string; userId: string; projectId?: string }) => {
    this.service.connect(params);
    if (this.heartbeatId) window.clearInterval(this.heartbeatId);
    this.heartbeatId = window.setInterval(() => {
      this.sendEvent({ type: "ping", payload: { ts: Date.now() } });
    }, 30000);
  };

  disconnect = () => {
    if (this.heartbeatId) window.clearInterval(this.heartbeatId);
    this.heartbeatId = null;
    this.service.disconnect();
  };

  sendEvent = (event: TChatWebSocketEvent) => {
    this.service.send(event);
  };

  sendTypingStart = (channelId: string, userId: string) => {
    this.applyTypingIndicator(channelId, userId, true);
    this.sendEvent({ type: "typing_start", payload: { channelId, userId } });
  };

  sendTypingStop = (channelId: string, userId: string) => {
    this.applyTypingIndicator(channelId, userId, false);
    this.sendEvent({ type: "typing_stop", payload: { channelId, userId } });
  };

  private handleEvent(event: TChatWebSocketEvent) {
    switch (event.type) {
      case "message.created":
      case "message.updated":
        this.rootStore.message.upsertMessage(event.payload as TChatWebSocketEvent<"message.created">["payload"]);
        break;
      case "message.deleted": {
        const payload = event.payload as TChatWebSocketEvent<"message.deleted">["payload"];
        this.rootStore.message.removeMessage(payload.channel, payload.id);
        break;
      }
      case "reaction.added":
        this.rootStore.reaction.applyReactionAdded(event.payload as TChatWebSocketEvent<"reaction.added">["payload"]);
        break;
      case "reaction.removed":
        this.rootStore.reaction.applyReactionRemoved(
          event.payload as TChatWebSocketEvent<"reaction.removed">["payload"]
        );
        break;
      case "presence.changed":
        this.rootStore.presence.upsertPresence(event.payload as TUserPresence);
        break;
      case "typing_start": {
        const payload = event.payload as TChatWebSocketEvent<"typing_start">["payload"];
        this.applyTypingIndicator(payload.channelId, payload.userId, true);
        break;
      }
      case "typing_stop": {
        const payload = event.payload as TChatWebSocketEvent<"typing_stop">["payload"];
        this.applyTypingIndicator(payload.channelId, payload.userId, false);
        break;
      }
      default:
        break;
    }
  }

  private applyTypingIndicator(channelId: string, userId: string, isTyping: boolean) {
    const current = new Set(this.typingIndicators.get(channelId) ?? []);
    if (isTyping) current.add(userId);
    else current.delete(userId);
    this.typingIndicators.set(channelId, current);
  }
}
