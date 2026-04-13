/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect } from "react";
import { observer } from "mobx-react";
import { X } from "lucide-react";
import { Avatar } from "@plane/ui";
import type { TChannelMembership } from "@plane/types";
import { getFileURL } from "@plane/utils";
import { useChat, useChannelMembers, useChannelPermissions } from "@/hooks/store/use-chat";

const ROLE_LABELS: Record<number, string> = {
  20: "Admin",
  15: "Member",
  80: "Admin",
  50: "Member",
  10: "Read-only",
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
  const permissions = useChannelPermissions(channelId);
  const canManageMembers = permissions?.current_user_can_manage_members ?? permissions?.can_manage_members ?? false;

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
            className="hover:bg-surface-3 rounded p-1 text-tertiary hover:text-primary"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="flex max-h-48 flex-col overflow-y-auto">
        {members.map((member: TChannelMembership) => (
          <div key={member.id} className="flex items-center gap-2 px-4 py-1.5 hover:bg-surface-2">
            <Avatar
              src={getFileURL(member.member_detail?.avatar_url ?? "")}
              name={member.member_detail?.display_name ?? member.member}
              size="sm"
            />
            <span className="flex-1 truncate text-13 text-primary">
              {member.member_detail?.display_name ?? member.member}
            </span>
            {canManageMembers ? (
              <select
                value={member.role}
                onChange={(event) =>
                  void chat.channel.updateMember(workspaceSlug, channelId, member.member, {
                    role: Number(event.target.value),
                  })
                }
                className="rounded border border-subtle bg-transparent px-2 py-0.5 text-11 text-secondary outline-none"
              >
                <option value={20}>Admin</option>
                <option value={15}>Member</option>
              </select>
            ) : (
              <span className="text-11 text-tertiary">{ROLE_LABELS[member.role] ?? String(member.role)}</span>
            )}
            {canManageMembers && (
              <button
                type="button"
                onClick={() => void chat.channel.removeMember(workspaceSlug, channelId, member.member)}
                className="text-red-500 hover:bg-red-50 rounded px-1.5 py-0.5 text-11"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});
