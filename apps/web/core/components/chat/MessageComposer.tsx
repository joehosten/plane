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
import { useChat, useChannelMembers, useChannelPermissions } from "@/hooks/store/use-chat";
import { useEditorAsset } from "@/hooks/store/use-editor-asset";
import { useMember } from "@/hooks/store/use-member";

const QUICK_EMOJIS = ["😀", "😂", "❤️", "👍", "🎉", "🔥", "✅", "😎", "🤔", "😮"];
const EVERYONE_ID = "__everyone__";

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

type TPendingAttachment = {
  id: string;
  file: File;
  preview?: string;
  uploaded?: TMessageAttachment;
  isUploading: boolean;
  error?: string;
};

type TMentionDraft = {
  label: string;
  token: string;
  userIds: string[];
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
  const channelMembers = useChannelMembers(channelId);
  const channel = chat.channel.getChannel(channelId);

  const [value, setValue] = useState("");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionCandidates, setMentionCandidates] = useState<IUserLite[]>([]);
  const [draftMentions, setDraftMentions] = useState<TMentionDraft[]>([]);
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
    void chat.channel.fetchMembers(workspaceSlug, channelId);
  }, [channelId, chat, workspaceSlug]);

  useEffect(() => {
    if (!mentionQuery && mentionQuery !== "") {
      setMentionCandidates([]);
      return;
    }

    const sourceIds: string[] =
      channelMembers.length > 0
        ? (channelMembers as Array<{ member: string }>).map((member) => member.member)
        : getMemberIds();
    const results = [...new Set(sourceIds)]
      .map((id) => getUserDetails(id))
      .filter(
        (user): user is IUserLite => !!user && user.display_name.toLowerCase().includes(mentionQuery.toLowerCase())
      )
      .slice(0, 6);

    if ("everyone".includes(mentionQuery.toLowerCase())) {
      setMentionCandidates([{ id: EVERYONE_ID, display_name: "everyone" } as IUserLite, ...results]);
      return;
    }

    setMentionCandidates(results);
  }, [channelMembers, getMemberIds, getUserDetails, mentionQuery]);

  const syncDraftMentions = (text: string) => {
    const visibleMentions = draftMentions.filter((mention) => text.includes(mention.token));
    setDraftMentions(visibleMentions);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setValue(newVal);
    syncDraftMentions(newVal);

    const cursor = e.target.selectionStart ?? newVal.length;
    const textBeforeCursor = newVal.slice(0, cursor);
    const atMatch = textBeforeCursor.match(/@([\w-]*)$/);
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
    const isEveryone = user.id === EVERYONE_ID;
    const token = isEveryone ? "@everyone" : `@${user.display_name}`;
    const nextValue = `${before.replace(/@[\w-]*$/, token)} ${after}`;
    const userIds = isEveryone
      ? [...new Set((channelMembers as Array<{ member: string }>).map((member) => member.member))]
      : [user.id];

    setValue(nextValue);
    setDraftMentions((prev) => {
      return [...prev.filter((mention) => mention.token !== token), { label: token, token, userIds }];
    });
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
      const attachment = prev.find((item) => item.id === id);
      if (attachment?.preview) URL.revokeObjectURL(attachment.preview);
      return prev.filter((item) => item.id !== id);
    });
  };

  const buildContentHtml = (text: string): string => {
    let nextText = text;
    const mentionMarkup = new Map<string, string>();

    draftMentions.forEach((mention, index) => {
      const token = `__CHAT_MENTION_${index}__`;
      nextText = nextText.replace(new RegExp(escapeRegExp(mention.token), "g"), token);
      mentionMarkup.set(
        token,
        mention.userIds
          .map(
            (userId) =>
              `<mention-component id="${escapeHtml(
                mention.label.replace(/^@/, "")
              )}" entity_identifier="${escapeHtml(userId)}" entity_name="user_mention"></mention-component>`
          )
          .join("")
      );
    });

    let html = escapeHtml(nextText);
    mentionMarkup.forEach((markup, token) => {
      html = html.replaceAll(token, markup);
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
        attachment_payloads: pendingAttachments.flatMap((attachment) =>
          attachment.uploaded ? [attachment.uploaded] : []
        ),
        ...(replyingTo && !parentId ? { reply_to_id: replyingTo.id } : {}),
      };

      if (parentId) {
        await chat.message.sendThreadReply(workspaceSlug, channelId, parentId, data);
      } else {
        await chat.message.sendMessage(workspaceSlug, channelId, data);
      }

      setValue("");
      setDraftMentions([]);
      setPendingAttachments([]);
      chat.message.clearReplyingTo();
    } finally {
      setIsSubmitting(false);
    }
  };

  const canPost = permissions?.current_user_can_post ?? permissions?.can_post;

  if (permissions && !canPost) {
    return (
      <div className="border-t border-subtle px-4 py-3">
        <div className="rounded-md bg-surface-2 px-4 py-3 text-center text-13 text-tertiary">
          You don't have permission to post in this channel.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 border-t border-subtle bg-surface-1/80 px-4 py-3 backdrop-blur-sm">
      {replyingTo && !parentId && (
        <div className="border-amber-500/20 bg-amber-500/5 flex items-start justify-between rounded-xl border px-3.5 py-2.5 transition-colors">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-12 font-medium text-secondary">
              Replying to {replyingTo.sender_detail?.display_name ?? ""}
            </span>
            <span className="truncate text-13 text-tertiary">{replyingTo.content}</span>
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

      {pendingAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pendingAttachments.map((attachment) => (
            <div key={attachment.id} className="relative overflow-hidden rounded-xl border border-subtle bg-surface-2">
              {attachment.preview ? (
                <img src={attachment.preview} alt={attachment.file.name} className="h-20 w-20 object-cover" />
              ) : (
                <div className="flex h-20 w-28 items-center justify-center text-11 text-secondary">
                  {attachment.file.name}
                </div>
              )}
              {attachment.isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-11 font-medium text-white">
                  Uploading…
                </div>
              )}
              <button
                type="button"
                onClick={() => removeAttachment(attachment.id)}
                className="absolute top-1 right-1 rounded-full border border-subtle bg-surface-1/90 p-0.5 text-tertiary hover:text-primary"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {mentionQuery !== null && mentionCandidates.length > 0 && (
        <div className="shadow-lg overflow-hidden rounded-xl border border-subtle bg-surface-1 transition-all duration-200">
          {mentionCandidates.map((user) => (
            <button
              key={user.id}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                insertMention(user);
              }}
              className="flex w-full items-center gap-2 px-3.5 py-2.5 text-14 text-primary transition-colors hover:bg-surface-2"
            >
              {user.id === EVERYONE_ID ? (
                <span className="bg-amber-500/15 text-amber-700 dark:text-amber-300 flex size-7 items-center justify-center rounded-full text-12 font-semibold">
                  @
                </span>
              ) : (
                <Avatar src={getFileURL(user.avatar_url ?? "")} name={user.display_name} size="sm" />
              )}
              <span>{user.display_name}</span>
            </button>
          ))}
        </div>
      )}

      {draftMentions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {draftMentions.map((mention) => (
            <span
              key={mention.token}
              className="bg-amber-500/15 text-amber-700 dark:text-amber-300 rounded-full px-2.5 py-1 text-11 font-medium"
            >
              {mention.label}
            </span>
          ))}
        </div>
      )}

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
          className="focus:border-accent-primary min-h-24 w-full resize-none rounded-2xl border border-subtle bg-transparent px-4 py-3 pr-10 text-[16px] leading-6 text-primary transition-all duration-200 outline-none placeholder:text-tertiary focus:bg-surface-1"
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Tooltip tooltipHeading="Attach files" tooltipContent="Upload images or files to this message">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="hover:bg-surface-3 rounded-lg p-2 text-tertiary transition-colors hover:text-primary"
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

          <div className="relative">
            <Tooltip tooltipHeading="Insert emoji" tooltipContent="Add an emoji to your draft">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="hover:bg-surface-3 rounded-lg p-2 text-16 text-tertiary transition-colors hover:text-primary"
              >
                😊
              </button>
            </Tooltip>
            {showEmojiPicker && (
              <div className="shadow-lg absolute bottom-full left-0 mb-2 flex flex-wrap gap-1 rounded-xl border border-subtle bg-surface-1 p-2">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setValue((draft) => draft + emoji);
                      setShowEmojiPicker(false);
                      textareaRef.current?.focus();
                    }}
                    className="hover:bg-surface-3 rounded p-1 text-16"
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
