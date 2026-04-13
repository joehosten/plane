/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { action, makeObservable, observable } from "mobx";
import { computedFn } from "mobx-utils";
import type { TUserPresence } from "@plane/types";
import { PresenceService } from "@plane/services";

export interface IPresenceStore {
  workspacePresence: Map<string, TUserPresence>;
  fetchPresence: (workspaceSlug: string) => Promise<TUserPresence[]>;
  updateOwnStatus: (workspaceSlug: string, data: Partial<TUserPresence>) => Promise<TUserPresence>;
  getPresence: (userId: string) => TUserPresence | undefined;
  upsertPresence: (presence: TUserPresence) => void;
}

export class PresenceStore implements IPresenceStore {
  workspacePresence = new Map<string, TUserPresence>();
  private readonly service = new PresenceService();

  constructor() {
    makeObservable(this, {
      workspacePresence: observable,
      fetchPresence: action,
      updateOwnStatus: action,
      upsertPresence: action,
    });
  }

  getPresence = computedFn((userId: string) => this.workspacePresence.get(userId));

  fetchPresence = async (workspaceSlug: string) => {
    const presence = await this.service.list(workspaceSlug);
    presence.forEach((item) => this.workspacePresence.set(item.user, item));
    return presence;
  };

  updateOwnStatus = async (workspaceSlug: string, data: Partial<TUserPresence>) => {
    const presence = await this.service.update(workspaceSlug, data);
    this.upsertPresence(presence);
    return presence;
  };

  upsertPresence = (presence: TUserPresence) => {
    this.workspacePresence.set(presence.user, presence);
  };
}
