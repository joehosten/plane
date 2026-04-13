/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect } from "react";
import { observer } from "mobx-react";
import { X } from "lucide-react";
import { Avatar } from "@plane/ui";
import { getFileURL } from "@plane/utils";
import { EChannelRole } from "@plane/types";
import { useChat, useChannelMembers } from "@/hooks/store/use-chat";

const ROLE_LABELS: Record<number, string> = {
  [EChannelRole.OWNER]: "Owner",
  [EChannelRole.ADMIN]: "Admin",
  [EChannelRole.MEMBER]: "Member",
  [EChannelRole.READONLY]: "Read-only",
};

export const ChannelMembersList = observer(function ChannelMembersList({
  workspaceSlug,
  channelId,
  onClose,
}: {
  workspaceSlug: string;
  channelId: string;
  onClose?: () => void;
}) {
  const chat = useChat();
  const members = useChannelMembers(channelId);

  useEffect(() => {
    void chat.channel.fetchMembers(workspaceSlug, channelId);
  }, [chat, channelId, workspaceSlug]);

  return (
    <div className="flex flex-col border-b border-subtle">
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-12 font-semibold text-secondary">Members ({members.length})</span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-tertiary hover:bg-surface-3 hover:text-primary"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="flex max-h-48 flex-col overflow-y-auto">
        {members.map((member) => (
          <div key={member.id} className="flex items-center gap-2 px-4 py-1.5 hover:bg-surface-2">
            <Avatar
              src={getFileURL(member.member_detail?.avatar_url ?? "")}
              name={member.member_detail?.display_name ?? member.member}
              size="sm"
            />
            <span className="flex-1 truncate text-13 text-primary">
              {member.member_detail?.display_name ?? member.member}
            </span>
            <span className="text-11 text-tertiary">{ROLE_LABELS[member.role] ?? String(member.role)}</span>
            <button
              type="button"
              onClick={() => void chat.channel.removeMember(workspaceSlug, channelId, member.id)}
              className="rounded px-1.5 py-0.5 text-11 text-red-500 hover:bg-red-50"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
});

