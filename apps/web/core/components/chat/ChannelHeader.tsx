/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { observer } from "mobx-react";
import { Settings, UserPlus, Users } from "lucide-react";
import { EChannelType } from "@plane/types";
import { useChannel, useChannelPermissions } from "@/hooks/store/use-chat";
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
  const permissions = useChannelPermissions(channelId);
  const [showMembers, setShowMembers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  if (!channel) return null;

  const isDm = channel.channel_type === EChannelType.DM || channel.channel_type === EChannelType.GROUP_DM;
  const isPrivate = channel.channel_type === EChannelType.WORKSPACE_PRIVATE;
  const canManage = permissions?.can_manage_members;

  return (
    <>
      <div className="flex items-center justify-between border-b border-subtle px-4 py-3">
        <div className="min-w-0">
          <div className="text-13 font-semibold text-primary truncate">
            {isDm ? channel.name : `# ${channel.name}`}
          </div>
          {channel.description && (
            <div className="text-12 text-secondary truncate">{channel.description}</div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => setShowMembers(!showMembers)}
            className="flex items-center gap-1.5 rounded px-2 py-1 text-12 text-secondary hover:bg-surface-3 hover:text-primary"
          >
            <Users className="h-3.5 w-3.5" />
            <span>{channel.member_count}</span>
          </button>
          {isPrivate && (
            <button
              type="button"
              onClick={() => setShowInvite(true)}
              className="rounded p-1.5 text-tertiary hover:bg-surface-3 hover:text-primary"
              title="Invite members"
            >
              <UserPlus className="h-4 w-4" />
            </button>
          )}
          {canManage && (
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="rounded p-1.5 text-tertiary hover:bg-surface-3 hover:text-primary"
              title="Channel settings"
            >
              <Settings className="h-4 w-4" />
            </button>
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
