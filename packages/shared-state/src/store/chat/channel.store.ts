/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { action, computed, makeObservable, observable } from "mobx";
import { computedFn } from "mobx-utils";
import type { TChannel, TChannelMembership, TChannelPermissions } from "@plane/types";
import { EChannelType } from "@plane/types";
import { ChannelService } from "@plane/services";

export interface IChannelStore {
  channels: Map<string, TChannel>;
  channelPermissions: Map<string, TChannelPermissions>;
  memberships: Map<string, TChannelMembership[]>;
  workspaceSlug: string | null;
  fetchWorkspaceChannels: (workspaceSlug: string) => Promise<TChannel[]>;
  fetchProjectChannels: (workspaceSlug: string, projectId: string) => Promise<TChannel[]>;
  fetchChannel: (workspaceSlug: string, channelId: string) => Promise<TChannel>;
  createChannel: (workspaceSlug: string, data: Partial<TChannel> & { member_ids?: string[] }) => Promise<TChannel>;
  updateChannel: (workspaceSlug: string, channelId: string, data: Partial<TChannel>) => Promise<TChannel>;
  archiveChannel: (workspaceSlug: string, channelId: string) => Promise<void>;
  lookupOrCreateDM: (workspaceSlug: string, memberIds: string[]) => Promise<TChannel>;
  getChannel: (channelId: string) => TChannel | undefined;
  upsertChannel: (channel: TChannel) => void;
  fetchPermissions: (workspaceSlug: string, channelId: string) => Promise<TChannelPermissions>;
  updatePermissions: (
    workspaceSlug: string,
    channelId: string,
    data: Partial<TChannelPermissions>
  ) => Promise<TChannelPermissions>;
  myPermissionsFor: (channelId: string) => TChannelPermissions | undefined;
  getPermissions: (channelId: string) => TChannelPermissions | undefined;
  fetchMembers: (workspaceSlug: string, channelId: string) => Promise<TChannelMembership[]>;
  addMember: (
    workspaceSlug: string,
    channelId: string,
    data: Partial<TChannelMembership>
  ) => Promise<TChannelMembership>;
  removeMember: (workspaceSlug: string, channelId: string, memberId: string) => Promise<void>;
  getMembers: (channelId: string) => TChannelMembership[];
  workspacePublicChannels: TChannel[];
  workspacePrivateChannels: TChannel[];
  dmChannels: TChannel[];
  groupDmChannels: TChannel[];
  projectChannels: TChannel[];
}

export class ChannelStore implements IChannelStore {
  channels = new Map<string, TChannel>();
  channelPermissions = new Map<string, TChannelPermissions>();
  memberships = new Map<string, TChannelMembership[]>();
  workspaceSlug: string | null = null;
  private readonly service = new ChannelService();

  constructor() {
    makeObservable(this, {
      channels: observable,
      channelPermissions: observable,
      memberships: observable,
      workspaceSlug: observable.ref,
      workspacePublicChannels: computed,
      workspacePrivateChannels: computed,
      dmChannels: computed,
      groupDmChannels: computed,
      projectChannels: computed,
      fetchWorkspaceChannels: action,
      fetchProjectChannels: action,
      fetchChannel: action,
      createChannel: action,
      updateChannel: action,
      archiveChannel: action,
      lookupOrCreateDM: action,
      fetchPermissions: action,
      updatePermissions: action,
      fetchMembers: action,
      addMember: action,
      removeMember: action,
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

  getPermissions = computedFn((channelId: string) => this.channelPermissions.get(channelId));

  myPermissionsFor = computedFn((channelId: string) => this.channelPermissions.get(channelId));

  getMembers = computedFn((channelId: string) => this.memberships.get(channelId) ?? []);

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

  fetchChannel = async (workspaceSlug: string, channelId: string) => {
    const channel = await this.service.retrieve(workspaceSlug, channelId);
    this.workspaceSlug = workspaceSlug;
    this.upsertChannel(channel);
    return channel;
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

  lookupOrCreateDM = async (workspaceSlug: string, memberIds: string[]) => {
    const channel = await this.service.lookupOrCreateDM(workspaceSlug, memberIds);
    this.upsertChannel(channel);
    return channel;
  };

  fetchPermissions = async (workspaceSlug: string, channelId: string) => {
    const permissions = await this.service.getPermissions(workspaceSlug, channelId);
    this.channelPermissions.set(channelId, permissions);
    return permissions;
  };

  updatePermissions = async (workspaceSlug: string, channelId: string, data: Partial<TChannelPermissions>) => {
    const permissions = await this.service.updatePermissions(workspaceSlug, channelId, data);
    this.channelPermissions.set(channelId, permissions);
    return permissions;
  };

  fetchMembers = async (workspaceSlug: string, channelId: string) => {
    const members = await this.service.listMembers(workspaceSlug, channelId);
    this.memberships.set(channelId, members);
    return members;
  };

  addMember = async (workspaceSlug: string, channelId: string, data: Partial<TChannelMembership>) => {
    const member = await this.service.addMember(workspaceSlug, channelId, data);
    const existing = this.memberships.get(channelId) ?? [];
    this.memberships.set(channelId, [...existing, member]);
    const channel = this.channels.get(channelId);
    if (channel) this.channels.set(channelId, { ...channel, member_count: channel.member_count + 1 });
    return member;
  };

  removeMember = async (workspaceSlug: string, channelId: string, memberId: string) => {
    await this.service.removeMember(workspaceSlug, channelId, memberId);
    const existing = this.memberships.get(channelId) ?? [];
    this.memberships.set(
      channelId,
      existing.filter((m) => m.id !== memberId)
    );
    const channel = this.channels.get(channelId);
    if (channel) this.channels.set(channelId, { ...channel, member_count: Math.max(0, channel.member_count - 1) });
  };
}
