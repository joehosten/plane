/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { LIVE_URL } from "@plane/constants";
import type { TChatWebSocketEvent } from "@plane/types";

type TConnectParams = {
  channelId: string;
  workspaceSlug: string;
  projectId?: string;
};

type TEventListener = (event: TChatWebSocketEvent) => void;

export class ChatWebSocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempt = 0;
  private readonly listeners = new Set<TEventListener>();
  private readonly baseDelay = 1000;
  private shouldReconnect = true;
  private latestParams: TConnectParams | null = null;

  connect(params: TConnectParams) {
    this.latestParams = params;
    this.shouldReconnect = true;
    const baseUrl = (LIVE_URL || window.location.origin).replace(/^http/, "ws").replace(/\/$/, "");
    const query = new URLSearchParams({ workspaceSlug: params.workspaceSlug });
    if (params.projectId) query.set("projectId", params.projectId);
    this.socket = new WebSocket(`${baseUrl}/chat/${params.channelId}?${query.toString()}`);
    this.attachSocketListeners();
  }

  disconnect() {
    this.shouldReconnect = false;
    this.socket?.close();
    this.socket = null;
  }

  on(listener: TEventListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  send(event: TChatWebSocketEvent) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(event));
    }
  }

  private attachSocketListeners() {
    if (!this.socket) return;

    this.socket.addEventListener("open", () => {
      this.reconnectAttempt = 0;
    });

    this.socket.addEventListener("message", (message) => {
      try {
        const payload = JSON.parse(message.data) as TChatWebSocketEvent;
        this.listeners.forEach((listener) => listener(payload));
      } catch {
        // ignore malformed events
      }
    });

    this.socket.addEventListener("close", () => {
      if (!this.shouldReconnect || !this.latestParams) return;
      const delay = Math.min(this.baseDelay * 2 ** this.reconnectAttempt, 15000);
      this.reconnectAttempt += 1;
      window.setTimeout(() => {
        if (this.latestParams) this.connect(this.latestParams);
      }, delay);
    });
  }
}
