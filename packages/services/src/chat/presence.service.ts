/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { API_BASE_URL } from "@plane/constants";
import type { TUserPresence } from "@plane/types";
import { APIService } from "../api.service";

export class PresenceService extends APIService {
  constructor(BASE_URL?: string) {
    super(BASE_URL || API_BASE_URL);
  }

  async list(workspaceSlug: string): Promise<TUserPresence[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/presence/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async update(workspaceSlug: string, data: Partial<TUserPresence>): Promise<TUserPresence> {
    return this.post(`/api/workspaces/${workspaceSlug}/presence/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
