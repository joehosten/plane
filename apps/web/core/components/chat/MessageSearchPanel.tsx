/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { observer } from "mobx-react";
import { Search, X } from "lucide-react";
import { format } from "date-fns";
import type { TMessage } from "@plane/types";
import { useChat } from "@/hooks/store/use-chat";

export const MessageSearchPanel = observer(function MessageSearchPanel({
  workspaceSlug,
  onClose,
}: {
  workspaceSlug: string;
  onClose?: () => void;
}) {
  const chat = useChat();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TMessage[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const msgs = await chat.message.searchMessages(workspaceSlug, query.trim());
      setResults(msgs);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="border-b border-subtle bg-surface-2 px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-tertiary" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void handleSearch(); }}
            placeholder="Search messages…"
            className="w-full rounded-md border border-subtle bg-surface-1 py-2 pl-9 pr-3 text-13 text-primary outline-none focus:border-accent-primary"
          />
        </div>
        <button
          type="button"
          disabled={isSearching}
          onClick={() => void handleSearch()}
          className="rounded bg-accent-primary px-3 py-2 text-12 font-medium text-white disabled:opacity-50"
        >
          {isSearching ? "…" : "Search"}
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-tertiary hover:bg-surface-3 hover:text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {results.length > 0 && (
        <div className="mt-2 flex max-h-56 flex-col gap-1 overflow-y-auto">
          {results.map((msg) => (
            <div key={msg.id} className="rounded-md border border-subtle bg-surface-1 px-3 py-2">
              <div className="flex items-baseline gap-2 text-11 text-tertiary">
                <span className="font-medium text-secondary">{msg.sender_detail?.display_name ?? msg.sender}</span>
                <span>{format(new Date(msg.created_at), "MMM d, HH:mm")}</span>
              </div>
              <p className="mt-0.5 text-12 text-primary line-clamp-2">{msg.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
