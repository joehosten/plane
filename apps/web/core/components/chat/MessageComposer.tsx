/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { observer } from "mobx-react";
import { Paperclip, X } from "lucide-react";
import { Avatar } from "@plane/ui";
import { Tooltip } from "@plane/propel/tooltip";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { escapeHtml, getFileURL } from "@plane/utils";
import { EFileAssetType } from "@plane/types";
import type { IUserLite, TMessageAttachment } from "@plane/types";
import { useChat } from "@/hooks/store/use-chat";
import { useEditorAsset } from "@/hooks/store/use-editor-asset";
import { useMember } from "@/hooks/store/use-member";
import { useChannelPermissions } from "@/hooks/store/use-chat";

const QUICK_EMOJIS = ["😀", "😂", "❤️", "👍", "🎉", "🔥", "✅", "😎", "🤔", "😮"];

type TPendingAttachment = {
  id: string;
  file: File;
  preview?: string;
  uploaded?: TMessageAttachment;
  isUploading: boolean;
  error?: string;
};

export const MessageComposer = observer(function MessageComposer({
  workspaceSlug,
  channelId,
  parentId,
}: {
  workspaceSlug: string;
  channelId: string;
  parentId?: string;
}) {
  const chat = useChat();
  const { getUserDetails, getMemberIds } = useMember();
  const { uploadEditorAsset } = useEditorAsset();
  const permissions = useChannelPermissions(channelId);
  const channel = chat.channel.getChannel(channelId);

  const [value, setValue] = useState("");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionCandidates, setMentionCandidates] = useState<IUserLite[]>([]);
  const [pendingMentions, setPendingMentions] = useState<string[]>([]);
  const [pendingAttachments, setPendingAttachments] = useState<TPendingAttachment[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadingCount = useMemo(
    () => pendingAttachments.filter((attachment) => attachment.isUploading).length,
    [pendingAttachments]
  );

  const replyingTo = chat.message.replyingTo;

  useEffect(() => {
    void chat.channel.fetchPermissions(workspaceSlug, channelId);
  }, [channelId, chat, workspaceSlug]);

  useEffect(() => {
    if (!mentionQuery && mentionQuery !== "") {
      setMentionCandidates([]);
      return;
    }
    const ids = getMemberIds();
    const results = ids
      .map((id) => getUserDetails(id))
      .filter((u): u is IUserLite => !!u && u.display_name.toLowerCase().includes(mentionQuery.toLowerCase()))
      .slice(0, 6);
    setMentionCandidates(results);
  }, [mentionQuery, getMemberIds, getUserDetails]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setValue(newVal);

    const cursor = e.target.selectionStart ?? newVal.length;
    const textBeforeCursor = newVal.slice(0, cursor);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
    } else {
      setMentionQuery(null);
    }
  };

  const insertMention = (user: IUserLite) => {
    const cursor = textareaRef.current?.selectionStart ?? value.length;
    const before = value.slice(0, cursor);
    const after = value.slice(cursor);
    const newBefore = before.replace(/@\w*$/, `@${user.display_name} `);
    setValue(newBefore + after);
    setPendingMentions((prev) => [...new Set([...prev, user.id])]);
    setMentionQuery(null);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      const id = crypto.randomUUID();
      const att: TPendingAttachment = { id, file, isUploading: true };
      if (file.type.startsWith("image/")) {
        att.preview = URL.createObjectURL(file);
      }
      setPendingAttachments((prev) => [...prev, att]);
      void uploadAttachment(id, file);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadAttachment = async (attachmentId: string, file: File) => {
    try {
      const { asset_id } = await uploadEditorAsset({
        blockId: attachmentId,
        data: {
          entity_identifier: channelId,
          entity_type: EFileAssetType.CHAT_MESSAGE_ATTACHMENT,
        },
        file,
        projectId: channel?.project ?? undefined,
        workspaceSlug,
      });
      setPendingAttachments((prev) =>
        prev.map((attachment) =>
          attachment.id === attachmentId
            ? {
                ...attachment,
                isUploading: false,
                uploaded: {
                  asset_id,
                  file_name: file.name,
                  file_size: file.size,
                  mime_type: file.type || "application/octet-stream",
                },
              }
            : attachment
        )
      );
    } catch {
      setPendingAttachments((prev) =>
        prev.map((attachment) =>
          attachment.id === attachmentId ? { ...attachment, error: "Upload failed", isUploading: false } : attachment
        )
      );
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "Upload failed",
        message: `${file.name} could not be uploaded.`,
      });
    }
  };

  const removeAttachment = (id: string) => {
    setPendingAttachments((prev) => {
      const att = prev.find((a) => a.id === id);
      if (att?.preview) URL.revokeObjectURL(att.preview);
      return prev.filter((a) => a.id !== id);
    });
  };

  const buildContentHtml = (text: string): string => {
    let html = escapeHtml(text);
    pendingMentions.forEach((userId) => {
      const user = getUserDetails(userId);
      if (user) {
        html = html.replace(
          new RegExp(`@${escapeHtml(user.display_name)}`, "g"),
          `<mention data-id="${escapeHtml(userId)}" data-type="user_mention">@${escapeHtml(user.display_name)}</mention>`
        );
      }
    });
    return `<p>${html}</p>`;
  };

  const handleSubmit = async () => {
    const content = value.trim();
    if (!content && !pendingAttachments.length) return;
    if (uploadingCount > 0) return;
    setIsSubmitting(true);

    try {
      const data = {
        content,
        content_html: buildContentHtml(content),
        mentions: pendingMentions,
        attachment_payloads: pendingAttachments.flatMap((attachment) => (attachment.uploaded ? [attachment.uploaded] : [])),
        ...(replyingTo ? { parent: replyingTo.id } : {}),
      };

      if (parentId) {
        await chat.message.sendThreadReply(workspaceSlug, channelId, parentId, data);
      } else {
        await chat.message.sendMessage(workspaceSlug, channelId, data);
      }

      setValue("");
      setPendingMentions([]);
      setPendingAttachments([]);
      chat.message.clearReplyingTo();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (permissions && !permissions.can_post) {
    return (
      <div className="border-t border-subtle px-4 py-3">
        <div className="rounded-md bg-surface-2 px-4 py-3 text-13 text-tertiary text-center">
          You don't have permission to post in this channel.
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-subtle px-5 py-4 flex flex-col gap-3 bg-surface-1/80 backdrop-blur-sm">
      {/* Reply-to strip */}
      {replyingTo && !parentId && (
        <div className="flex items-start justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 px-3.5 py-2.5 transition-colors">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-12 font-medium text-secondary">
              Replying to {replyingTo.sender_detail?.display_name ?? ""}
            </span>
            <span className="text-13 text-tertiary truncate">{replyingTo.content}</span>
          </div>
          <button
            type="button"
            onClick={() => chat.message.clearReplyingTo()}
            className="ml-2 flex-shrink-0 text-tertiary hover:text-primary"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Attachment previews */}
      {pendingAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pendingAttachments.map((att) => (
            <div key={att.id} className="relative overflow-hidden rounded-xl border border-subtle bg-surface-2">
              {att.preview ? (
                <img src={att.preview} alt={att.file.name} className="h-20 w-20 object-cover" />
              ) : (
                <div className="flex h-20 w-28 items-center justify-center text-11 text-secondary">
                  {att.file.name}
                </div>
              )}
              {att.isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-11 font-medium text-white">
                  Uploading…
                </div>
              )}
              <button
                type="button"
                onClick={() => removeAttachment(att.id)}
                className="absolute right-1 top-1 rounded-full bg-surface-1/90 border border-subtle p-0.5 text-tertiary hover:text-primary"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Mention dropdown */}
      {mentionQuery !== null && mentionCandidates.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-subtle bg-surface-1 shadow-lg transition-all duration-200">
          {mentionCandidates.map((user) => (
            <button
              key={user.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); insertMention(user); }}
              className="flex w-full items-center gap-2 px-3.5 py-2.5 text-14 text-primary transition-colors hover:bg-surface-2"
            >
              <Avatar src={getFileURL(user.avatar_url ?? "")} name={user.display_name} size="sm" />
              <span>{user.display_name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={(event) => {
            if (mentionQuery !== null && mentionCandidates.length > 0) return;
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void handleSubmit();
            }
          }}
          placeholder="Write a message… (@ to mention, Shift+Enter for new line)"
          rows={3}
          className="min-h-24 w-full rounded-2xl border border-subtle bg-transparent px-4 py-3 pr-10 text-[15px] leading-6 text-primary placeholder:text-tertiary outline-none resize-none transition-all duration-200 focus:border-accent-primary focus:bg-surface-1"
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {/* File upload */}
          <Tooltip tooltipHeading="Attach files" tooltipContent="Upload images or files to this message">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg p-2 text-tertiary transition-colors hover:bg-surface-3 hover:text-primary"
            >
              <Paperclip className="h-4 w-4" />
            </button>
          </Tooltip>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,application/*,text/*"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Emoji picker */}
          <div className="relative">
            <Tooltip tooltipHeading="Insert emoji" tooltipContent="Add an emoji to your draft">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="rounded-lg p-2 text-16 text-tertiary transition-colors hover:bg-surface-3 hover:text-primary"
              >
                😊
              </button>
            </Tooltip>
            {showEmojiPicker && (
              <div className="absolute bottom-full left-0 mb-2 flex flex-wrap gap-1 rounded-xl border border-subtle bg-surface-1 p-2 shadow-lg">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setValue((v) => v + emoji);
                      setShowEmojiPicker(false);
                      textareaRef.current?.focus();
                    }}
                    className="rounded p-1 text-16 hover:bg-surface-3"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          disabled={isSubmitting || uploadingCount > 0 || (!value.trim() && !pendingAttachments.length)}
          className="rounded-xl bg-accent-primary px-4 py-2 text-13 font-medium text-white transition-all duration-200 disabled:opacity-50"
          onClick={() => void handleSubmit()}
        >
          {uploadingCount > 0 ? `Uploading ${uploadingCount}…` : isSubmitting ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
});
