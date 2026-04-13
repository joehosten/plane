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
import { useChat } from "@/hooks/store/use-chat";
import { useMember } from "@/hooks/store/use-member";

export const NewDMModal = observer(function NewDMModal({
  workspaceSlug,
  isOpen,
  onClose,
  onCreated,
}: {
  workspaceSlug: string;
  isOpen: boolean;
  onClose: () => void;
  onCreated: (channelId: string) => void;
}) {
  const chat = useChat();
  const { getUserDetails, getMemberIds } = useMember();
  const [query, setQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const members = getMemberIds()
    .map((id) => getUserDetails(id))
    .filter((u): u is IUserLite => !!u && u.display_name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);

  const handleSelect = async (user: IUserLite) => {
    setIsCreating(true);
    try {
      const channel = await chat.channel.lookupOrCreateDM(workspaceSlug, [user.id]);
      onCreated(channel.id);
      chat.channel.upsertChannel(channel);
      onClose();
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex w-[380px] flex-col rounded-xl border border-subtle bg-surface-1 shadow-xl">
        <div className="flex items-center justify-between border-b border-subtle px-5 py-4">
          <h2 className="text-14 font-semibold text-primary">New Direct Message</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-tertiary hover:bg-surface-3">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-col gap-3 p-4">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search members…"
            className="rounded-md border border-subtle bg-transparent px-3 py-2 text-13 text-primary outline-none focus:border-accent-primary"
          />
          <div className="flex max-h-48 flex-col overflow-y-auto">
            {members.map((user) => (
              <button
                key={user.id}
                type="button"
                disabled={isCreating}
                onClick={() => void handleSelect(user)}
                className="flex items-center gap-2 rounded px-3 py-2 text-13 text-primary hover:bg-surface-2 disabled:opacity-50"
              >
                <Avatar src={getFileURL(user.avatar_url ?? "")} name={user.display_name} size="sm" />
                <span>{user.display_name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});
