/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";

type TWorkspaceChatSettings = {
  enable_workspace_chat: boolean;
  default_channel_visibility: "public" | "private";
  who_can_create_channels: "admins_only" | "all_members";
};

type TProps = {
  workspaceSlug: string;
  isAdmin: boolean;
};

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public — visible to all workspace members" },
  { value: "private", label: "Private — only invited members can view" },
] as const;

const CREATE_CHANNEL_OPTIONS = [
  { value: "all_members", label: "All members" },
  { value: "admins_only", label: "Admins only" },
] as const;

export function WorkspaceChatSettings({ isAdmin }: TProps) {
  const [settings, setSettings] = useState<TWorkspaceChatSettings>({
    enable_workspace_chat: true,
    default_channel_visibility: "public",
    who_can_create_channels: "all_members",
  });

  const update = <K extends keyof TWorkspaceChatSettings>(key: K, value: TWorkspaceChatSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const isDisabled = !isAdmin;

  return (
    <div className="flex flex-col gap-6">
      {/* Enable Chat */}
      <div className="flex items-center justify-between rounded-md border border-subtle p-4">
        <div>
          <p className="text-13 font-medium text-primary">Enable workspace chat</p>
          <p className="text-12 text-tertiary">Allow members to use channels and direct messages in this workspace.</p>
        </div>
        <button
          type="button"
          disabled={isDisabled}
          onClick={() => update("enable_workspace_chat", !settings.enable_workspace_chat)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
            settings.enable_workspace_chat ? "bg-accent-primary" : "bg-surface-3"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              settings.enable_workspace_chat ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {/* Default channel visibility */}
      <div className="flex flex-col gap-3 rounded-md border border-subtle p-4">
        <div>
          <p className="text-13 font-medium text-primary">Default channel visibility for new channels</p>
          <p className="text-12 text-tertiary">Controls the default visibility when a new channel is created.</p>
        </div>
        <div className="flex flex-col gap-2">
          {VISIBILITY_OPTIONS.map((option) => (
            <label key={option.value} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="default_channel_visibility"
                value={option.value}
                checked={settings.default_channel_visibility === option.value}
                disabled={isDisabled}
                onChange={() => update("default_channel_visibility", option.value)}
                className="accent-accent-primary"
              />
              <span className="text-13 text-primary">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Who can create channels */}
      <div className="flex flex-col gap-3 rounded-md border border-subtle p-4">
        <div>
          <p className="text-13 font-medium text-primary">Who can create channels</p>
          <p className="text-12 text-tertiary">Restrict channel creation to specific roles.</p>
        </div>
        <div className="flex flex-col gap-2">
          {CREATE_CHANNEL_OPTIONS.map((option) => (
            <label key={option.value} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="who_can_create_channels"
                value={option.value}
                checked={settings.who_can_create_channels === option.value}
                disabled={isDisabled}
                onChange={() => update("who_can_create_channels", option.value)}
                className="accent-accent-primary"
              />
              <span className="text-13 text-primary">{option.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
