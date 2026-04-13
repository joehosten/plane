/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { API_BASE_URL } from "@plane/constants";
import type { TMessage, TMessageAttachment, TMessagePaginatedResponse } from "@plane/types";
import { APIService } from "../api.service";

export class MessageService extends APIService {
  constructor(BASE_URL?: string) {
    super(BASE_URL || API_BASE_URL);
  }

  async list(workspaceSlug: string, channelId: string, cursor?: string): Promise<TMessagePaginatedResponse> {
    return this.get(`/api/workspaces/${workspaceSlug}/channels/${channelId}/messages/`, {
      params: cursor ? { cursor } : {},
    })
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async create(
    workspaceSlug: string,
    channelId: string,
    data: Partial<TMessage> & { attachment_payloads?: TMessageAttachment[] }
  ): Promise<TMessage> {
    return this.post(`/api/workspaces/${workspaceSlug}/channels/${channelId}/messages/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async update(
    workspaceSlug: string,
    channelId: string,
    messageId: string,
    data: Partial<TMessage>
  ): Promise<TMessage> {
    return this.patch(`/api/workspaces/${workspaceSlug}/channels/${channelId}/messages/${messageId}/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async destroy(workspaceSlug: string, channelId: string, messageId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/channels/${channelId}/messages/${messageId}/`)
      .then(() => undefined)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async fetchThread(workspaceSlug: string, channelId: string, messageId: string): Promise<TMessage[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/channels/${channelId}/messages/${messageId}/threads/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async sendThreadReply(
    workspaceSlug: string,
    channelId: string,
    messageId: string,
    data: Partial<TMessage> & { attachment_payloads?: TMessageAttachment[] }
  ): Promise<TMessage> {
    return this.post(`/api/workspaces/${workspaceSlug}/channels/${channelId}/messages/${messageId}/threads/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async search(workspaceSlug: string, query: string): Promise<TMessage[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/channels/search/messages/`, { params: { query } })
      .then((response) => response?.data?.results ?? [])
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
