/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { API_BASE_URL } from "@plane/constants";
import type { TMessageReaction } from "@plane/types";
import { APIService } from "../api.service";

export class ReactionService extends APIService {
  constructor(BASE_URL?: string) {
    super(BASE_URL || API_BASE_URL);
  }

  async list(workspaceSlug: string, channelId: string, messageId: string): Promise<TMessageReaction[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/channels/${channelId}/messages/${messageId}/reactions/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async add(workspaceSlug: string, channelId: string, messageId: string, reaction: string): Promise<TMessageReaction> {
    return this.post(`/api/workspaces/${workspaceSlug}/channels/${channelId}/messages/${messageId}/reactions/`, {
      reaction,
    })
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async remove(workspaceSlug: string, channelId: string, messageId: string, reaction: string): Promise<void> {
    return this.delete(
      `/api/workspaces/${workspaceSlug}/channels/${channelId}/messages/${messageId}/reactions/${reaction}/`
    )
      .then(() => undefined)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
