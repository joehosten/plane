/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useRef, useState } from "react";
import { observer } from "mobx-react";
import { Paperclip, X } from "lucide-react";
import { Avatar } from "@plane/ui";
import { getFileURL } from "@plane/utils";
import type { IUserLite } from "@plane/types";
import { useChat } from "@/hooks/store/use-chat";
import { useMember } from "@/hooks/store/use-member";
import { useChannelPermissions } from "@/hooks/store/use-chat";

const QUICK_EMOJIS = ["😀", "😂", "❤️", "👍", "🎉", "🔥", "✅", "😎", "🤔", "😮"];

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

type TPendingAttachment = {
  id: string;
  file: File;
  preview?: string;
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
  const permissions = useChannelPermissions(channelId);

  const [value, setValue] = useState("");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionCandidates, setMentionCandidates] = useState<IUserLite[]>([]);
  const [pendingMentions, setPendingMentions] = useState<string[]>([]);
  const [pendingAttachments, setPendingAttachments] = useState<TPendingAttachment[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const replyingTo = chat.message.replyingTo;

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
      const att: TPendingAttachment = { id: crypto.randomUUID(), file };
      if (file.type.startsWith("image/")) {
        att.preview = URL.createObjectURL(file);
      }
      setPendingAttachments((prev) => [...prev, att]);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
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
          `<mention data-id="${userId}" data-type="user_mention">@${escapeHtml(user.display_name)}</mention>`
        );
      }
    });
    return `<p>${html}</p>`;
  };

  const handleSubmit = async () => {
    const content = value.trim();
    if (!content && !pendingAttachments.length) return;
    setIsSubmitting(true);

    try {
      const data = {
        content,
        content_html: buildContentHtml(content),
        mentions: pendingMentions,
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
    <div className="border-t border-subtle px-4 py-3 flex flex-col gap-2">
      {/* Reply-to strip */}
      {replyingTo && !parentId && (
        <div className="flex items-start justify-between rounded-md border border-subtle bg-surface-2 px-3 py-2">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-11 font-medium text-secondary">
              Replying to {replyingTo.sender_detail?.display_name ?? ""}
            </span>
            <span className="text-12 text-tertiary truncate">{replyingTo.content}</span>
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
            <div key={att.id} className="relative">
              {att.preview ? (
                <img src={att.preview} alt={att.file.name} className="h-16 w-16 rounded-md object-cover border border-subtle" />
              ) : (
                <div className="flex h-16 w-24 items-center justify-center rounded-md border border-subtle bg-surface-2 text-11 text-secondary">
                  {att.file.name}
                </div>
              )}
              <button
                type="button"
                onClick={() => removeAttachment(att.id)}
                className="absolute -right-1 -top-1 rounded-full bg-surface-1 border border-subtle p-0.5 text-tertiary hover:text-primary"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Mention dropdown */}
      {mentionQuery !== null && mentionCandidates.length > 0 && (
        <div className="rounded-md border border-subtle bg-surface-1 shadow-md">
          {mentionCandidates.map((user) => (
            <button
              key={user.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); insertMention(user); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-13 text-primary hover:bg-surface-2"
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
          rows={2}
          className="min-h-16 w-full rounded-md border border-subtle bg-transparent px-3 py-2 pr-10 text-13 text-primary placeholder:text-tertiary outline-none resize-none focus:border-accent-primary"
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {/* File upload */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded p-1.5 text-tertiary hover:bg-surface-3 hover:text-primary"
            title="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </button>
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
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="rounded p-1.5 text-tertiary hover:bg-surface-3 hover:text-primary text-16"
              title="Add emoji"
            >
              😊
            </button>
            {showEmojiPicker && (
              <div className="absolute bottom-full left-0 mb-1 flex flex-wrap gap-1 rounded-md border border-subtle bg-surface-1 p-2 shadow-md">
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
          disabled={isSubmitting || (!value.trim() && !pendingAttachments.length)}
          className="rounded bg-accent-primary px-3 py-1.5 text-12 font-medium text-white disabled:opacity-50"
          onClick={() => void handleSubmit()}
        >
          {isSubmitting ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
});
