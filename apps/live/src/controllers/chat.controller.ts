/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { Request } from "express";
import type WS from "ws";
import { Controller, WebSocket as WSDecorator } from "@plane/decorators";
import { logger } from "@plane/logger";
import { onAuthenticate } from "@/lib/auth";
import { ChatPubSubService } from "@/services/chat";

@Controller("/chat")
export class ChatController {
  private readonly pubSub = ChatPubSubService.getInstance();
  private readonly subscriptions = new WeakMap<WS, () => void | Promise<void>>();

  @WSDecorator("/:channelId")
  async handleConnection(ws: WS, req: Request) {
    try {
      const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
      const token = url.searchParams.get("token") || "";
      await onAuthenticate({
        requestHeaders: req.headers,
        requestParameters: url.searchParams,
        context: { cookie: "", documentType: "project_page", projectId: null, userId: "", workspaceSlug: null },
        token,
      });

      const channelId = req.params.channelId;
      const unsubscribe = await this.pubSub.subscribe(channelId, (message) => {
        if (ws.readyState === 1) ws.send(message);
      });
      this.subscriptions.set(ws, unsubscribe);

      ws.on("message", async (message) => {
        const raw = message.toString();
        try {
          const event = JSON.parse(raw) as { type?: string; payload?: Record<string, unknown> };
          if (event.type === "ping") {
            if (ws.readyState === 1) ws.send(JSON.stringify({ type: "pong", payload: { ts: Date.now() } }));
            return;
          }
        } catch {
          logger.warn("CHAT_CONTROLLER: Failed to parse chat websocket message");
        }
        await this.pubSub.publish(channelId, raw);
      });

      ws.on("close", async () => {
        const cleanup = this.subscriptions.get(ws);
        if (cleanup) await cleanup();
      });

      ws.on("error", (error: Error) => {
        logger.error("CHAT_CONTROLLER: WebSocket error", error);
        ws.close(1011, "Internal server error");
      });
    } catch (error) {
      logger.error("CHAT_CONTROLLER: Failed to initialize connection", error);
      ws.close(1008, "Authentication failed");
    }
  }
}
