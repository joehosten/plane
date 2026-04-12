/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { action, computed, makeObservable, observable } from "mobx";
import { computedFn } from "mobx-utils";
import type { TChannel } from "@plane/types";
import { EChannelType } from "@plane/types";
import { ChannelService } from "@plane/services";

export interface IChannelStore {
  channels: Map<string, TChannel>;
  workspaceSlug: string | null;
  fetchWorkspaceChannels: (workspaceSlug: string) => Promise<TChannel[]>;
  fetchProjectChannels: (workspaceSlug: string, projectId: string) => Promise<TChannel[]>;
  createChannel: (workspaceSlug: string, data: Partial<TChannel> & { member_ids?: string[] }) => Promise<TChannel>;
  updateChannel: (workspaceSlug: string, channelId: string, data: Partial<TChannel>) => Promise<TChannel>;
  archiveChannel: (workspaceSlug: string, channelId: string) => Promise<void>;
  getChannel: (channelId: string) => TChannel | undefined;
  workspacePublicChannels: TChannel[];
  workspacePrivateChannels: TChannel[];
  dmChannels: TChannel[];
  groupDmChannels: TChannel[];
  projectChannels: TChannel[];
}

export class ChannelStore implements IChannelStore {
  channels = new Map<string, TChannel>();
  workspaceSlug: string | null = null;
  private readonly service = new ChannelService();

  constructor() {
    makeObservable(this, {
      channels: observable,
      workspaceSlug: observable.ref,
      workspacePublicChannels: computed,
      workspacePrivateChannels: computed,
      dmChannels: computed,
      groupDmChannels: computed,
      projectChannels: computed,
      fetchWorkspaceChannels: action,
      fetchProjectChannels: action,
      createChannel: action,
      updateChannel: action,
      archiveChannel: action,
      setChannels: action,
      upsertChannel: action,
    });
  }

  get workspacePublicChannels() {
    return [...this.channels.values()].filter((channel) => channel.channel_type === EChannelType.WORKSPACE_PUBLIC);
  }

  get workspacePrivateChannels() {
    return [...this.channels.values()].filter((channel) => channel.channel_type === EChannelType.WORKSPACE_PRIVATE);
  }

  get dmChannels() {
    return [...this.channels.values()].filter((channel) => channel.channel_type === EChannelType.DM);
  }

  get groupDmChannels() {
    return [...this.channels.values()].filter((channel) => channel.channel_type === EChannelType.GROUP_DM);
  }

  get projectChannels() {
    return [...this.channels.values()].filter((channel) => channel.channel_type === EChannelType.PROJECT);
  }

  getChannel = computedFn((channelId: string) => this.channels.get(channelId));

  setChannels = (channels: TChannel[]) => {
    channels.forEach((channel) => this.channels.set(channel.id, channel));
  };

  upsertChannel = (channel: TChannel) => {
    this.channels.set(channel.id, channel);
  };

  fetchWorkspaceChannels = async (workspaceSlug: string) => {
    const channels = await this.service.list(workspaceSlug);
    this.workspaceSlug = workspaceSlug;
    this.setChannels(channels);
    return channels;
  };

  fetchProjectChannels = async (workspaceSlug: string, projectId: string) => {
    const channels = await this.service.listProjectChannels(workspaceSlug, projectId);
    this.workspaceSlug = workspaceSlug;
    this.setChannels(channels);
    return channels;
  };

  createChannel = async (workspaceSlug: string, data: Partial<TChannel> & { member_ids?: string[] }) => {
    const channel = await this.service.create(workspaceSlug, data);
    this.upsertChannel(channel);
    return channel;
  };

  updateChannel = async (workspaceSlug: string, channelId: string, data: Partial<TChannel>) => {
    const channel = await this.service.update(workspaceSlug, channelId, data);
    this.upsertChannel(channel);
    return channel;
  };

  archiveChannel = async (workspaceSlug: string, channelId: string) => {
    await this.service.archive(workspaceSlug, channelId);
    const channel = this.channels.get(channelId);
    if (channel) this.channels.set(channelId, { ...channel, is_archived: true });
  };
}
