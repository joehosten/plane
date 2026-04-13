/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useState } from "react";
import { observer } from "mobx-react";
import { Search, Settings, UserPlus, Users } from "lucide-react";
import { Tooltip } from "@plane/propel/tooltip";
import { EChannelType } from "@plane/types";
import { useChat, useChannel, useChannelPermissions } from "@/hooks/store/use-chat";
import { ChannelMembersList } from "./ChannelMembersList";
import { ChannelSettingsModal } from "./ChannelSettingsModal";
import { InviteToChannelModal } from "./InviteToChannelModal";
import { MessageSearchPanel } from "./MessageSearchPanel";

export const ChannelHeader = observer(function ChannelHeader({
  channelId,
  workspaceSlug,
}: {
  channelId: string;
  workspaceSlug: string;
}) {
  const channel = useChannel(channelId);
  const chat = useChat();
  const permissions = useChannelPermissions(channelId);
  const [showMembers, setShowMembers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    void chat.channel.fetchPermissions(workspaceSlug, channelId);
  }, [channelId, chat, workspaceSlug]);

  if (!channel) return null;

  const isDm = channel.channel_type === EChannelType.DM || channel.channel_type === EChannelType.GROUP_DM;
  const isPrivate = channel.channel_type === EChannelType.WORKSPACE_PRIVATE;
  const canManage = permissions?.can_manage_members;

  return (
    <>
      <div className="flex items-center justify-between border-b border-subtle bg-surface-1/90 px-5 py-4 backdrop-blur-sm">
        <div className="min-w-0">
          <div className="truncate text-[16px] font-semibold text-primary">
            {isDm ? channel.name : `# ${channel.name}`}
          </div>
          {channel.description && (
            <div className="truncate pt-0.5 text-13 text-secondary">{channel.description}</div>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowMembers(!showMembers)}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-13 text-secondary transition-colors hover:bg-surface-3 hover:text-primary"
          >
            <Users className="h-3.5 w-3.5" />
            <span>{channel.member_count}</span>
          </button>
          <Tooltip tooltipHeading="Search messages" tooltipContent="Find messages in this channel">
            <button
              type="button"
              onClick={() => setShowSearch((prev) => !prev)}
              className="rounded-xl p-2 text-tertiary transition-colors hover:bg-surface-3 hover:text-primary"
            >
              <Search className="h-4 w-4" />
            </button>
          </Tooltip>
          {isPrivate && (
            <Tooltip tooltipHeading="Invite to channel" tooltipContent="Add more people to this private channel">
              <button
                type="button"
                onClick={() => setShowInvite(true)}
                className="rounded-xl p-2 text-tertiary transition-colors hover:bg-surface-3 hover:text-primary"
              >
                <UserPlus className="h-4 w-4" />
              </button>
            </Tooltip>
          )}
          {canManage && (
            <Tooltip tooltipHeading="Channel settings" tooltipContent="Manage members, permissions, and details">
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="rounded-xl p-2 text-tertiary transition-colors hover:bg-surface-3 hover:text-primary"
              >
                <Settings className="h-4 w-4" />
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Search panel (inline, below header) */}
      {showSearch && (
        <MessageSearchPanel workspaceSlug={workspaceSlug} onClose={() => setShowSearch(false)} />
      )}

      {/* Members side panel */}
      {showMembers && (
        <ChannelMembersList
          workspaceSlug={workspaceSlug}
          channelId={channelId}
          onClose={() => setShowMembers(false)}
        />
      )}

      {/* Settings modal */}
      {showSettings && (
        <ChannelSettingsModal
          workspaceSlug={workspaceSlug}
          channelId={channelId}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Invite modal */}
      {showInvite && (
        <InviteToChannelModal
          workspaceSlug={workspaceSlug}
          channelId={channelId}
          onClose={() => setShowInvite(false)}
        />
      )}
    </>
  );
});
