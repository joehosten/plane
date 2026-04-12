/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { API_BASE_URL } from "@plane/constants";
import type { TChannel, TChannelMembership, TChannelReadState } from "@plane/types";
import { APIService } from "../api.service";

export class ChannelService extends APIService {
  constructor(BASE_URL?: string) {
    super(BASE_URL || API_BASE_URL);
  }

  async list(workspaceSlug: string, params?: { project_id?: string }): Promise<TChannel[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/channels/`, { params })
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async listProjectChannels(workspaceSlug: string, projectId: string): Promise<TChannel[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/projects/${projectId}/channels/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async create(workspaceSlug: string, data: Partial<TChannel> & { member_ids?: string[] }): Promise<TChannel> {
    return this.post(`/api/workspaces/${workspaceSlug}/channels/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async createProjectChannel(
    workspaceSlug: string,
    projectId: string,
    data: Partial<TChannel> & { member_ids?: string[] }
  ): Promise<TChannel> {
    return this.post(`/api/workspaces/${workspaceSlug}/projects/${projectId}/channels/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async retrieve(workspaceSlug: string, channelId: string): Promise<TChannel> {
    return this.get(`/api/workspaces/${workspaceSlug}/channels/${channelId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async update(workspaceSlug: string, channelId: string, data: Partial<TChannel>): Promise<TChannel> {
    return this.patch(`/api/workspaces/${workspaceSlug}/channels/${channelId}/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async archive(workspaceSlug: string, channelId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/channels/${channelId}/`)
      .then(() => undefined)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async listMembers(workspaceSlug: string, channelId: string): Promise<TChannelMembership[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/channels/${channelId}/members/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async addMember(
    workspaceSlug: string,
    channelId: string,
    data: Partial<TChannelMembership>
  ): Promise<TChannelMembership> {
    return this.post(`/api/workspaces/${workspaceSlug}/channels/${channelId}/members/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async removeMember(workspaceSlug: string, channelId: string, memberId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/channels/${channelId}/members/${memberId}/`)
      .then(() => undefined)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async getReadState(workspaceSlug: string, channelId: string): Promise<TChannelReadState> {
    return this.get(`/api/workspaces/${workspaceSlug}/channels/${channelId}/read-state/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async markRead(
    workspaceSlug: string,
    channelId: string,
    data: Partial<TChannelReadState>
  ): Promise<TChannelReadState> {
    return this.post(`/api/workspaces/${workspaceSlug}/channels/${channelId}/read-state/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async lookupOrCreateDM(workspaceSlug: string, member_ids: string[]): Promise<TChannel> {
    return this.post(`/api/workspaces/${workspaceSlug}/channels/dms/`, { member_ids })
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
