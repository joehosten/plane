/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { observer } from "mobx-react";
import { X } from "lucide-react";
import { Avatar } from "@plane/ui";
import { getFileURL } from "@plane/utils";
import type { IUserLite } from "@plane/types";
import { useChat, useChannelMembers } from "@/hooks/store/use-chat";
import { useMember } from "@/hooks/store/use-member";

export const InviteToChannelModal = observer(function InviteToChannelModal({
  workspaceSlug,
  channelId,
  onClose,
}: {
  workspaceSlug: string;
  channelId: string;
  onClose: () => void;
}) {
  const chat = useChat();
  const { getUserDetails, getMemberIds } = useMember();
  const existingMembers = useChannelMembers(channelId);
  const existingMemberIds = new Set(existingMembers.map((m) => m.member));

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<IUserLite[]>([]);
  const [isInviting, setIsInviting] = useState(false);

  const allMembers = getMemberIds()
    .map((id) => getUserDetails(id))
    .filter((u): u is IUserLite => !!u && !existingMemberIds.has(u.id));

  const filtered = allMembers.filter((u) => u.display_name.toLowerCase().includes(query.toLowerCase()));

  const toggle = (user: IUserLite) => {
    setSelected((prev) =>
      prev.some((u) => u.id === user.id) ? prev.filter((u) => u.id !== user.id) : [...prev, user]
    );
  };

  const handleInvite = async () => {
    setIsInviting(true);
    try {
      await Promise.all(
        selected.map((user) => chat.channel.addMember(workspaceSlug, channelId, { member: user.id }))
      );
      onClose();
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex w-[420px] flex-col rounded-xl border border-subtle bg-surface-1 shadow-xl">
        <div className="flex items-center justify-between border-b border-subtle px-5 py-4">
          <h2 className="text-14 font-semibold text-primary">Invite to Channel</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-tertiary hover:bg-surface-3">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-col gap-3 p-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search members…"
            className="rounded-md border border-subtle bg-transparent px-3 py-2 text-13 text-primary outline-none focus:border-accent-primary"
          />
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selected.map((u) => (
                <span
                  key={u.id}
                  className="flex items-center gap-1 rounded-full bg-accent-primary/10 px-2 py-0.5 text-11 text-accent-primary"
                >
                  {u.display_name}
                  <button type="button" onClick={() => toggle(u)}>
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex max-h-48 flex-col overflow-y-auto">
            {filtered.slice(0, 10).map((user) => {
              const isSelected = selected.some((u) => u.id === user.id);
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => toggle(user)}
                  className={`flex items-center gap-2 rounded px-3 py-2 text-13 text-primary hover:bg-surface-2 ${isSelected ? "bg-accent-primary/5" : ""}`}
                >
                  <Avatar src={getFileURL(user.avatar_url ?? "")} name={user.display_name} size="sm" />
                  <span className="flex-1 text-left">{user.display_name}</span>
                  {isSelected && <span className="text-11 text-accent-primary">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-subtle px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-3 py-1.5 text-12 text-secondary hover:bg-surface-3"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selected.length || isInviting}
            onClick={() => void handleInvite()}
            className="rounded bg-accent-primary px-3 py-1.5 text-12 font-medium text-white disabled:opacity-50"
          >
            {isInviting ? "Inviting…" : `Invite ${selected.length > 0 ? `(${selected.length})` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
});

