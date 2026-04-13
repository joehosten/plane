/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useRef, useState } from "react";
import { observer } from "mobx-react";
import { formatDistanceToNow, format } from "date-fns";
import { Copy, MessageSquareReply, MoreHorizontal, Pencil, Plus, Reply, Trash2 } from "lucide-react";
import { Tooltip } from "@plane/propel/tooltip";
import { Avatar } from "@plane/ui";
import { escapeHtml, getFileURL } from "@plane/utils";
import { EChannelType } from "@plane/types";
import type { TMessage } from "@plane/types";
import { useChat } from "@/hooks/store/use-chat";
import { useUser } from "@/hooks/store/user";
import { MessageContent } from "./MessageContent";
import { IssueChip } from "./IssueChip";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🎉"];

type TMessageItemProps = {
  message: TMessage;
  workspaceSlug: string;
  channelId: string;
  isCompact?: boolean;
  onOpenThread?: (messageId: string) => void;
};

const AttachmentList = ({ attachments }: { attachments: TMessage["attachments"] }) => {
  if (!attachments?.length) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-2">
      {attachments.map((att) => {
        if (att.mime_type.startsWith("image/")) {
          return (
            <a key={att.asset_id} href={getFileURL(att.asset_id)} target="_blank" rel="noopener noreferrer">
              <img
                src={getFileURL(att.asset_id)}
                alt={att.file_name}
                className="max-h-48 max-w-xs rounded-md border border-subtle object-cover"
              />
            </a>
          );
        }
        return (
          <a
            key={att.asset_id}
            href={getFileURL(att.asset_id)}
            download={att.file_name}
            className="flex items-center gap-1.5 rounded-md border border-subtle bg-surface-2 px-2 py-1 text-12 text-secondary hover:bg-surface-3"
          >
            📎 <span className="max-w-xs truncate">{att.file_name}</span>
            <span className="text-11 text-tertiary">({(att.file_size / 1024).toFixed(1)} KB)</span>
          </a>
        );
      })}
    </div>
  );
};

export const MessageItem = observer(function MessageItem({
  message,
  workspaceSlug,
  channelId,
  isCompact = false,
  onOpenThread,
}: TMessageItemProps) {
  const chat = useChat();
  const { data: currentUser } = useUser();
  const [isHovered, setIsHovered] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editValue, setEditValue] = useState(message.content);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  const isOwn = currentUser?.id === message.sender;
  const isEditing = chat.message.editingMessageId === message.id;
  const isMentioningMe = !!currentUser?.id && !!message.mentions?.includes(currentUser.id);
  const channel = chat.channel.getChannel(channelId);

  const handleReaction = async (emoji: string) => {
    const hasIt = chat.reaction.hasMyReaction(message.id, emoji);
    if (hasIt) {
      await chat.reaction.removeReaction(workspaceSlug, channelId, message.id, emoji);
    } else {
      await chat.reaction.addReaction(workspaceSlug, channelId, message.id, emoji);
    }
  };

  const handleDelete = async () => {
    await chat.message.deleteMessage(workspaceSlug, channelId, message.id);
    setShowDeleteConfirm(false);
  };

  const handleStartEdit = () => {
    setEditValue(message.content);
    chat.message.setEditingMessageId(message.id);
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const handleSaveEdit = async () => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === message.content) {
      chat.message.clearEditingMessageId();
      return;
    }
    setIsSubmittingEdit(true);
    try {
      await chat.message.editMessage(workspaceSlug, channelId, message.id, {
        content: trimmed,
        content_html: `<p>${escapeHtml(trimmed)}</p>`,
      });
    } finally {
      setIsSubmittingEdit(false);
      chat.message.clearEditingMessageId();
    }
  };

  const handleReply = () => {
    chat.message.setReplyingTo(message);
  };

  const handleCopyLink = async () => {
    const isDirectMessage = channel?.channel_type === EChannelType.DM || channel?.channel_type === EChannelType.GROUP_DM;
    const url = `${window.location.origin}/${workspaceSlug}/messaging/${isDirectMessage ? "dms" : "channels"}/${channelId}?message=${message.id}`;
    await navigator.clipboard.writeText(url);
  };

  return (
    <div
      className={`group relative mx-2 flex gap-3 rounded-2xl px-4 py-2.5 transition-all duration-200 ${
        isMentioningMe
          ? "border border-amber-500/20 bg-amber-500/8 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.06)]"
          : isHovered
            ? "bg-surface-2"
            : "hover:bg-surface-2"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        if (!showDeleteConfirm) setShowDeleteConfirm(false);
      }}
    >
      {/* Avatar column */}
      <div className="mt-0.5 w-10 flex-shrink-0">
        {!isCompact ? (
          <Avatar
            src={getFileURL(message.sender_detail?.avatar_url ?? "")}
            name={message.sender_detail?.display_name ?? message.sender}
            size="md"
          />
        ) : (
            <span className="invisible block pt-1 text-center text-11 leading-tight text-tertiary group-hover:visible">
              {format(new Date(message.created_at), "HH:mm")}
            </span>
          )}
      </div>

      {/* Message body */}
      <div className="min-w-0 flex-1">
        {/* Header */}
        {!isCompact && (
          <div className="mb-1 flex items-baseline gap-2">
            <span className="text-[14px] font-semibold text-primary">
              {message.sender_detail?.display_name ?? message.sender}
            </span>
            <span
              className="cursor-default text-12 text-tertiary"
              title={format(new Date(message.created_at), "MMM d, yyyy HH:mm")}
            >
              {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
            </span>
            {message.edited_at && <span className="text-12 text-tertiary">(edited)</span>}
            {isMentioningMe && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">Mentioned you</span>}
          </div>
        )}

        {/* Reply-to quote */}
        {message.reply_to_detail && !message.deleted_at && (
          <div className="mb-2 flex gap-1.5 rounded-r-lg border-l-2 border-accent-primary bg-surface-2/60 px-2.5 py-1.5 text-13 text-tertiary">
            <span className="font-medium text-secondary">
              {message.reply_to_detail.sender_detail?.display_name ?? ""}
            </span>
            <span className="truncate">{message.reply_to_detail.content}</span>
          </div>
        )}

        {/* Content or edit mode */}
        {isEditing ? (
          <div className="flex flex-col gap-1">
            <textarea
              ref={editInputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSaveEdit();
                }
                if (e.key === "Escape") chat.message.clearEditingMessageId();
              }}
              className="w-full rounded-xl border border-accent-primary bg-surface-1 px-3 py-2 text-[14px] text-primary outline-none resize-none"
              rows={2}
            />
            <div className="flex gap-2 text-13">
              <button
                type="button"
                disabled={isSubmittingEdit}
                onClick={() => void handleSaveEdit()}
                className="rounded-lg bg-accent-primary px-3 py-1 text-white disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => chat.message.clearEditingMessageId()}
                className="rounded-lg px-3 py-1 text-secondary hover:bg-surface-3"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <MessageContent message={message} />
        )}

        {/* Attachments */}
        {!message.deleted_at && <AttachmentList attachments={message.attachments} />}

        {/* Issue chip */}
        {message.issue_detail && !message.deleted_at && (
          <div className="mt-1">
            <IssueChip
              label={`${message.issue_detail.project_id}-${message.issue_detail.sequence_id}: ${message.issue_detail.name}`}
              workspaceSlug={workspaceSlug}
              projectId={message.issue_detail.project_id}
              issueId={message.issue_detail.id}
            />
          </div>
        )}

        {/* Reactions */}
        {!!message.reactions.length && !message.deleted_at && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.reactions.map((reaction) => {
              const myReaction = chat.reaction.hasMyReaction(message.id, reaction.reaction);
              return (
                <button
                  key={reaction.reaction}
                  type="button"
                  onClick={() => void handleReaction(reaction.reaction)}
                  className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-12 transition-colors ${
                    myReaction
                      ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                      : "border-subtle bg-surface-3 text-secondary hover:border-accent-primary"
                  }`}
                >
                  {reaction.reaction} <span>{reaction.count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Thread reply count */}
        {message.thread_count > 0 && !message.deleted_at && (
          <button
            type="button"
            onClick={() => onOpenThread?.(message.id)}
            className="mt-2 flex w-fit items-center gap-2 rounded-xl border border-accent-primary/15 bg-accent-primary/5 px-3 py-2 text-left transition-all duration-200 hover:border-accent-primary/30 hover:bg-accent-primary/10"
          >
            <span className="rounded-lg bg-accent-primary/15 p-1.5 text-accent-primary">
              <MessageSquareReply className="h-4 w-4" />
            </span>
            <span className="flex flex-col">
              <span className="text-12 font-medium text-accent-primary">
                {message.thread_count} {message.thread_count === 1 ? "reply" : "replies"}
              </span>
              <span className="text-11 text-tertiary">Open thread discussion</span>
            </span>
          </button>
        )}
      </div>

      {/* Hover action bar */}
      {!message.deleted_at && (
        <div
          className={`absolute right-4 top-0 -translate-y-1/2 flex items-center gap-0.5 rounded-xl border border-subtle bg-surface-1 px-1.5 py-1 shadow-sm transition-all duration-200 ${
            isHovered
              ? "translate-y-0 opacity-100"
              : "pointer-events-none -translate-y-1 opacity-0"
          }`}
        >
          {/* Quick reactions */}
          {QUICK_REACTIONS.map((emoji) => (
            <Tooltip key={emoji} tooltipHeading={`React with ${emoji}`}>
              <button
                type="button"
                onClick={() => void handleReaction(emoji)}
                className="rounded p-0.5 text-14 hover:bg-surface-3"
              >
                {emoji}
              </button>
            </Tooltip>
          ))}
          <div className="mx-0.5 h-4 w-px bg-subtle" />
          {/* Reply in thread */}
          {onOpenThread && (
            <Tooltip tooltipHeading="Open thread" tooltipContent="View or reply in this message thread">
              <button
                type="button"
                onClick={() => onOpenThread(message.id)}
                className="rounded p-1 text-tertiary hover:bg-surface-3 hover:text-primary"
              >
                <MessageSquareReply className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          )}
          {/* Quote reply */}
          <Tooltip tooltipHeading="Quote reply" tooltipContent="Reply and quote this message in the composer">
            <button
              type="button"
              onClick={handleReply}
              className="rounded p-1 text-tertiary hover:bg-surface-3 hover:text-primary"
            >
              <Reply className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
          {/* Edit (own messages only) */}
          {isOwn && !isEditing && (
            <Tooltip tooltipHeading="Edit message" tooltipContent="Update the contents of your message">
              <button
                type="button"
                onClick={handleStartEdit}
                className="rounded p-1 text-tertiary hover:bg-surface-3 hover:text-primary"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          )}
          {/* Delete (own messages only) */}
          {isOwn && (
            <div className="relative">
              <Tooltip tooltipHeading="Delete message" tooltipContent="Remove this message for everyone in the channel">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                  className="rounded p-1 text-tertiary hover:bg-red-100 hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </Tooltip>
              {showDeleteConfirm && (
                <div className="absolute right-0 top-full z-50 mt-1 flex flex-col gap-2 rounded-md border border-subtle bg-surface-1 p-3 shadow-lg">
                  <p className="text-12 text-primary">Delete this message?</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleDelete()}
                      className="rounded bg-red-500 px-2 py-0.5 text-11 text-white"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="rounded px-2 py-0.5 text-11 text-secondary hover:bg-surface-3"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Add reaction */}
          <div className="relative">
            <ReactionPickerButton onSelect={(emoji) => void handleReaction(emoji)} />
          </div>
          <Tooltip tooltipHeading="Copy message link" tooltipContent="Copy a direct link to this message">
            <button
              type="button"
              onClick={() => void handleCopyLink()}
              className="rounded p-1 text-tertiary hover:bg-surface-3 hover:text-primary"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
          <Tooltip tooltipHeading="More actions" tooltipContent="More message actions will appear here">
            <button type="button" className="rounded p-1 text-tertiary hover:bg-surface-3 hover:text-primary">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        </div>
      )}
    </div>
  );
});

function ReactionPickerButton({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Tooltip tooltipHeading="Add reaction" tooltipContent="Pick any emoji reaction">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="rounded p-1 text-tertiary hover:bg-surface-3 hover:text-primary"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </Tooltip>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 rounded-md border border-subtle bg-surface-1 p-2 shadow-lg">
          <div className="grid grid-cols-6 gap-1">
            {["😀","😂","😍","🥹","😎","🤔","😭","😤","🤩","🥳","😴","🫡","👍","👎","❤️","💔","🎉","🔥","✅","⭐","🚀","💡","🐛","⚠️"].map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => { onSelect(e); setOpen(false); }}
                className="rounded p-1 text-14 hover:bg-surface-3"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
