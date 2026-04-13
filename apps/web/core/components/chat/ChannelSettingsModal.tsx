/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useState } from "react";
import { observer } from "mobx-react";
import { X } from "lucide-react";
import { useChat, useChannelPermissions } from "@/hooks/store/use-chat";
import { ChannelMembersList } from "./ChannelMembersList";

type TTab = "general" | "members" | "permissions";

export const ChannelSettingsModal = observer(function ChannelSettingsModal({
  workspaceSlug,
  channelId,
  onClose,
}: {
  workspaceSlug: string;
  channelId: string;
  onClose: () => void;
}) {
  const chat = useChat();
  const channel = chat.channel.getChannel(channelId);
  const permissions = useChannelPermissions(channelId);
  const [tab, setTab] = useState<TTab>("general");
  const [name, setName] = useState(channel?.name ?? "");
  const [description, setDescription] = useState(channel?.description ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const canManagePermissions = permissions?.can_manage_permissions ?? false;
  const canEditChannel = permissions?.current_user_can_create_channels ?? permissions?.can_create_channels ?? false;

  useEffect(() => {
    void chat.channel.fetchPermissions(workspaceSlug, channelId);
  }, [chat, channelId, workspaceSlug]);

  const handleSaveGeneral = async () => {
    setIsSaving(true);
    try {
      if (!canEditChannel) return;
      await chat.channel.updateChannel(workspaceSlug, channelId, { name, description });
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!window.confirm("Archive this channel? It will be hidden from the sidebar.")) return;
    await chat.channel.archiveChannel(workspaceSlug, channelId);
    onClose();
  };

  const togglePermission = async (key: "can_post" | "can_create_channels" | "can_manage_members") => {
    if (!permissions || !canManagePermissions) return;
    await chat.channel.updatePermissions(workspaceSlug, channelId, { [key]: !permissions[key] });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="shadow-xl relative flex w-[480px] flex-col rounded-xl border border-subtle bg-surface-1">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-subtle px-5 py-4">
          <h2 className="text-14 font-semibold text-primary">Channel Settings</h2>
          <button type="button" onClick={onClose} className="hover:bg-surface-3 rounded p-1 text-tertiary">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-subtle px-5">
          {(["general", "members", "permissions"] as TTab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-3 py-2.5 text-13 capitalize transition-colors ${
                tab === t
                  ? "border-accent-primary border-b-2 font-medium text-primary"
                  : "text-secondary hover:text-primary"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex flex-col gap-4 p-5">
          {tab === "general" && (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="chat-channel-name" className="text-12 font-medium text-secondary">
                  Channel name
                </label>
                <input
                  id="chat-channel-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="focus:border-accent-primary rounded-md border border-subtle bg-transparent px-3 py-2 text-13 text-primary outline-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="chat-channel-description" className="text-12 font-medium text-secondary">
                  Description
                </label>
                <textarea
                  id="chat-channel-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="focus:border-accent-primary resize-none rounded-md border border-subtle bg-transparent px-3 py-2 text-13 text-primary outline-none"
                />
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => void handleArchive()}
                  disabled={!canEditChannel}
                  className="text-red-500 text-12 hover:underline"
                >
                  Archive channel
                </button>
                <button
                  type="button"
                  disabled={isSaving || !canEditChannel}
                  onClick={() => void handleSaveGeneral()}
                  className="rounded bg-accent-primary px-3 py-1.5 text-12 font-medium text-white disabled:opacity-50"
                >
                  {isSaving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </>
          )}

          {tab === "members" && <ChannelMembersList workspaceSlug={workspaceSlug} channelId={channelId} />}

          {tab === "permissions" && permissions && (
            <div className="flex flex-col gap-3">
              {(
                [
                  { key: "can_post", label: "Members can post messages" },
                  { key: "can_create_channels", label: "Members can edit channel details" },
                  { key: "can_manage_members", label: "Members can manage channel members" },
                ] as const
              ).map(({ key, label }) => (
                <label key={key} className="flex cursor-pointer items-center justify-between gap-3">
                  <span className="text-13 text-primary">{label}</span>
                  <button
                    type="button"
                    disabled={!canManagePermissions}
                    onClick={() => void togglePermission(key)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
                      permissions[key] ? "bg-accent-primary" : "bg-surface-3"
                    }`}
                  >
                    <span
                      className={`shadow inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        permissions[key] ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
