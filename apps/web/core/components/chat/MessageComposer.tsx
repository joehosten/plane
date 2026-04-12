/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { observer } from "mobx-react";
import { useChat } from "@/hooks/store/use-chat";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

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
  const [value, setValue] = useState("");

  const handleSubmit = async () => {
    const content = value.trim();
    if (!content) return;
    if (parentId) {
      await chat.message.sendThreadReply(workspaceSlug, channelId, parentId, {
        content,
        content_html: `<p>${escapeHtml(content)}</p>`,
      });
    } else {
      await chat.message.sendMessage(workspaceSlug, channelId, {
        content,
        content_html: `<p>${escapeHtml(content)}</p>`,
      });
    }
    setValue("");
  };

  return (
    <div className="border-t border-subtle p-3">
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void handleSubmit();
          }
        }}
        placeholder="Write a message..."
        className="min-h-24 w-full rounded-md border border-subtle bg-transparent px-3 py-2 text-13 outline-none"
      />
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          className="bg-primary rounded px-3 py-1.5 text-12 font-medium text-white"
          onClick={() => void handleSubmit()}
        >
          Send
        </button>
      </div>
    </div>
  );
});
