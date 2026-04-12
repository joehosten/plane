/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { observer } from "mobx-react";
import { EChannelType } from "@plane/types";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { EModalPosition, EModalWidth, ModalCore } from "@plane/ui";
import { useChat } from "@/hooks/store/use-chat";

type TCreateChannelModalProps = {
  workspaceSlug: string;
  projectId?: string;
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (channelId: string) => void;
};

export const CreateChannelModal = observer(function CreateChannelModal(props: TCreateChannelModalProps) {
  const { workspaceSlug, projectId, isOpen, onClose, onCreated } = props;
  const chat = useChat();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setName("");
    setDescription("");
    setIsPrivate(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      let channelType: EChannelType;
      if (projectId) {
        channelType = EChannelType.PROJECT;
      } else {
        channelType = isPrivate ? EChannelType.WORKSPACE_PRIVATE : EChannelType.WORKSPACE_PUBLIC;
      }
      const channel = await chat.channel.createChannel(workspaceSlug, {
        name: name.trim(),
        description: description.trim(),
        channel_type: channelType,
        ...(projectId ? { project: projectId } : {}),
      });
      setToast({ type: TOAST_TYPE.SUCCESS, title: "Channel created", message: `#${channel.name} is ready.` });
      onCreated?.(channel.id);
      handleClose();
    } catch {
      setToast({ type: TOAST_TYPE.ERROR, title: "Failed to create channel", message: "Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalCore isOpen={isOpen} handleClose={handleClose} position={EModalPosition.TOP} width={EModalWidth.MD}>
      <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
        <h3 className="text-base font-semibold text-primary">Create a channel</h3>

        <div className="flex flex-col gap-1">
          <label className="text-13 font-medium text-secondary">Channel name</label>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. announcements"
            maxLength={80}
            required
            className="rounded-md border border-subtle bg-surface-1 px-3 py-2 text-sm text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-13 font-medium text-secondary">Description (optional)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this channel about?"
            maxLength={255}
            className="rounded-md border border-subtle bg-surface-1 px-3 py-2 text-sm text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>

        {!projectId && (
          <label className="flex cursor-pointer items-center gap-2 text-13 text-secondary">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="h-4 w-4 rounded border-subtle accent-brand-400"
            />
            Make this channel private
          </label>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md px-3 py-1.5 text-13 text-secondary hover:bg-surface-3"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="rounded-md bg-brand-400 px-3 py-1.5 text-13 font-medium text-white disabled:opacity-50"
          >
            {isSubmitting ? "Creating…" : "Create channel"}
          </button>
        </div>
      </form>
    </ModalCore>
  );
});
