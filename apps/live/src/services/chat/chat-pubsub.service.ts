/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type Redis from "ioredis";
import { logger } from "@plane/logger";
import { redisManager } from "@/redis";

export class ChatPubSubService {
  private static instance: ChatPubSubService;
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  private readonly callbacks = new Map<string, Set<(message: string) => void>>();

  static getInstance() {
    if (!ChatPubSubService.instance) {
      ChatPubSubService.instance = new ChatPubSubService();
    }
    return ChatPubSubService.instance;
  }

  private ensureClients() {
    const client = redisManager.getClient();
    if (!client) return;
    if (!this.publisher) this.publisher = client.duplicate();
    if (!this.subscriber) {
      this.subscriber = client.duplicate();
      this.subscriber.on("message", (channel, message) => {
        this.callbacks.get(channel)?.forEach((callback) => callback(message));
      });
    }
  }

  async subscribe(channelId: string, callback: (message: string) => void) {
    this.ensureClients();
    const redisChannel = `chat:${channelId}`;
    if (!this.subscriber) return () => undefined;
    const callbacks = this.callbacks.get(redisChannel) ?? new Set();
    callbacks.add(callback);
    this.callbacks.set(redisChannel, callbacks);
    if (callbacks.size === 1) await this.subscriber.subscribe(redisChannel);
    return async () => {
      const currentCallbacks = this.callbacks.get(redisChannel);
      if (!currentCallbacks) return;
      currentCallbacks.delete(callback);
      if (currentCallbacks.size === 0) {
        this.callbacks.delete(redisChannel);
        await this.subscriber?.unsubscribe(redisChannel);
      }
    };
  }

  async publish(channelId: string, event: string) {
    this.ensureClients();
    if (!this.publisher) {
      logger.warn("CHAT_PUBSUB: Publisher unavailable, skipping publish");
      return;
    }
    await this.publisher.publish(`chat:${channelId}`, event);
  }
}
