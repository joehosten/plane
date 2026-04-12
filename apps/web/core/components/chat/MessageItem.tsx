/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { formatDistanceToNow } from "date-fns";
import type { TMessage } from "@plane/types";
import { MessageContent } from "./MessageContent";
import { IssueChip } from "./IssueChip";

export function MessageItem({ message }: { message: TMessage }) {
  return (
    <div className="flex flex-col gap-1 rounded-md px-4 py-3 hover:bg-surface-2">
      <div className="flex items-center gap-2 text-12 text-secondary">
        <span className="font-medium text-primary">{message.sender_detail?.display_name || message.sender}</span>
        <span>{formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}</span>
        {message.edited_at && <span>(edited)</span>}
      </div>
      <MessageContent message={message} />
      {message.issue_detail && (
        <IssueChip label={`${message.issue_detail.project_id}-${message.issue_detail.sequence_id}`} />
      )}
      {!!message.reactions.length && (
        <div className="flex flex-wrap gap-1">
          {message.reactions.map((reaction) => (
            <span key={reaction.reaction} className="bg-surface-3 rounded-full px-2 py-0.5 text-11 text-secondary">
              {reaction.reaction} {reaction.count}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
