/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useRef, useState } from "react";
import { observer } from "mobx-react";
import { formatDistanceToNow, format } from "date-fns";
import { MessageSquare, Pencil, Plus, Reply, Trash2 } from "lucide-react";
import { Avatar } from "@plane/ui";
import { getFileURL } from "@plane/utils";
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
        content_html: `<p>${trimmed.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</p>`,
      });
    } finally {
      setIsSubmittingEdit(false);
      chat.message.clearEditingMessageId();
    }
  };

  const handleReply = () => {
    chat.message.setReplyingTo(message);
  };

  return (
    <div
      className={`group relative flex gap-2.5 px-4 py-1 hover:bg-surface-2 ${isHovered ? "bg-surface-2" : ""}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        if (!showDeleteConfirm) setShowDeleteConfirm(false);
      }}
    >
      {/* Avatar column */}
      <div className="mt-0.5 w-8 flex-shrink-0">
        {!isCompact ? (
          <Avatar
            src={getFileURL(message.sender_detail?.avatar_url ?? "")}
            name={message.sender_detail?.display_name ?? message.sender}
            size="md"
          />
        ) : (
          <span className="invisible group-hover:visible block text-center text-10 text-tertiary leading-tight pt-1">
            {format(new Date(message.created_at), "HH:mm")}
          </span>
        )}
      </div>

      {/* Message body */}
      <div className="min-w-0 flex-1">
        {/* Header */}
        {!isCompact && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="text-13 font-semibold text-primary">
              {message.sender_detail?.display_name ?? message.sender}
            </span>
            <span
              className="text-11 text-tertiary cursor-default"
              title={format(new Date(message.created_at), "MMM d, yyyy HH:mm")}
            >
              {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
            </span>
            {message.edited_at && <span className="text-11 text-tertiary">(edited)</span>}
          </div>
        )}

        {/* Reply-to quote */}
        {message.reply_to_detail && !message.deleted_at && (
          <div className="mb-1 flex gap-1.5 rounded-sm border-l-2 border-accent-primary pl-2 text-12 text-tertiary">
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
              className="w-full rounded-md border border-accent-primary bg-surface-1 px-2 py-1.5 text-13 text-primary outline-none resize-none"
              rows={2}
            />
            <div className="flex gap-2 text-12">
              <button
                type="button"
                disabled={isSubmittingEdit}
                onClick={() => void handleSaveEdit()}
                className="rounded bg-accent-primary px-2 py-0.5 text-white disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => chat.message.clearEditingMessageId()}
                className="rounded px-2 py-0.5 text-secondary hover:bg-surface-3"
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
          <div className="mt-1 flex flex-wrap gap-1">
            {message.reactions.map((reaction) => {
              const myReaction = chat.reaction.hasMyReaction(message.id, reaction.reaction);
              return (
                <button
                  key={reaction.reaction}
                  type="button"
                  onClick={() => void handleReaction(reaction.reaction)}
                  className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-11 transition-colors ${
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
            className="mt-1 flex items-center gap-1 text-11 text-accent-primary hover:underline"
          >
            <MessageSquare className="h-3 w-3" />
            {message.thread_count} {message.thread_count === 1 ? "reply" : "replies"}
          </button>
        )}
      </div>

      {/* Hover action bar */}
      {!message.deleted_at && (
        <div
          className={`absolute right-4 top-0 -translate-y-1/2 flex items-center gap-0.5 rounded-md border border-subtle bg-surface-1 px-1 py-0.5 shadow-sm transition-opacity ${
            isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          {/* Quick reactions */}
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => void handleReaction(emoji)}
              className="rounded p-0.5 text-14 hover:bg-surface-3"
              title={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
          <div className="mx-0.5 h-4 w-px bg-subtle" />
          {/* Reply in thread */}
          {onOpenThread && (
            <button
              type="button"
              onClick={() => onOpenThread(message.id)}
              className="rounded p-1 text-tertiary hover:bg-surface-3 hover:text-primary"
              title="Open thread"
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </button>
          )}
          {/* Quote reply */}
          <button
            type="button"
            onClick={handleReply}
            className="rounded p-1 text-tertiary hover:bg-surface-3 hover:text-primary"
            title="Reply"
          >
            <Reply className="h-3.5 w-3.5" />
          </button>
          {/* Edit (own messages only) */}
          {isOwn && !isEditing && (
            <button
              type="button"
              onClick={handleStartEdit}
              className="rounded p-1 text-tertiary hover:bg-surface-3 hover:text-primary"
              title="Edit message"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {/* Delete (own messages only) */}
          {isOwn && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                className="rounded p-1 text-tertiary hover:bg-red-100 hover:text-red-500"
                title="Delete message"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
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
            <ReactionPickerButton
              onSelect={(emoji) => void handleReaction(emoji)}
            />
          </div>
        </div>
      )}
    </div>
  );
});

function ReactionPickerButton({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="rounded p-1 text-tertiary hover:bg-surface-3 hover:text-primary"
        title="Add reaction"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
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
