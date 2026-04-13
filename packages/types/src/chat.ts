/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { TPaginationInfo } from "./common";
import type { EChannelRole, EChannelType, EUserPresenceStatus } from "./enums";
import type { IUserLite } from "./users";

export type TMessageReactionSummary = {
  reaction: string;
  count: number;
  my_reaction?: boolean;
};

export type TMessageAttachment = {
  id?: string;
  message?: string;
  asset_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
};

export type TChannel = {
  id: string;
  workspace: string;
  project: string | null;
  name: string;
  description: string;
  channel_type: EChannelType;
  is_archived: boolean;
  created_by: string | null;
  created_by_detail?: IUserLite;
  member_count: number;
  unread_count: number;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TChannelMembership = {
  id: string;
  channel: string;
  member: string;
  member_detail?: IUserLite;
  role: EChannelRole;
  joined_at: string;
};

export type TChannelPermissions = {
  can_post: boolean;
  can_create_channels: boolean;
  can_manage_members: boolean;
  current_user_can_post?: boolean;
  current_user_can_create_channels?: boolean;
  current_user_can_manage_members?: boolean;
  can_manage_permissions?: boolean;
};

export type TMessage = {
  id: string;
  channel: string;
  sender: string;
  sender_detail?: IUserLite;
  content: string;
  content_html: string;
  content_json: Record<string, unknown>;
  parent: string | null;
  reply_to: string | null;
  thread_count: number;
  issue: string | null;
  issue_detail?: {
    id: string;
    name: string;
    project_id: string;
    sequence_id: number;
  } | null;
  reactions: TMessageReactionSummary[];
  attachments: TMessageAttachment[];
  /** Array of workspace user IDs mentioned in this message (e.g. used to trigger mention toasts). */
  mentions: string[];
  reply_to_id?: string | null;
  reply_to_detail?: Pick<TMessage, "id" | "content" | "sender_detail"> | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TMessageReaction = {
  id: string;
  message: string;
  actor: string;
  actor_detail?: IUserLite;
  reaction: string;
  created_at: string;
};

export type TChannelReadState = {
  id?: string;
  channel: string;
  member?: string;
  last_read_message?: string | null;
  last_read_at: string | null;
  unread_count: number;
};

export type TUserPresence = {
  id?: string;
  workspace: string;
  user: string;
  user_detail?: IUserLite;
  status: EUserPresenceStatus;
  last_seen: string;
};

export type TChatWebSocketEventMap = {
  "message.created": TMessage;
  "message.updated": TMessage;
  "message.deleted": { id: string; channel: string };
  "reaction.added": TMessageReaction;
  "reaction.removed": { message: string; reaction: string; actor: string };
  "message.pinned": { id: string; channel: string; message: string };
  typing_start: { channelId: string; userId: string };
  typing_stop: { channelId: string; userId: string };
  "presence.changed": TUserPresence;
  ping: { ts: number };
  pong: { ts: number };
};

export type TChatWebSocketEvent<TType extends keyof TChatWebSocketEventMap = keyof TChatWebSocketEventMap> = {
  type: TType;
  payload: TChatWebSocketEventMap[TType];
};

export type TMessagePaginatedResponse = TPaginationInfo & {
  cursor: string;
  page_count: number;
  results: TMessage[];
};
