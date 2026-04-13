/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { useEffect } from "react";
import { usePresence, useChat } from "@/hooks/store/use-chat";
import { UserPresenceIndicator } from "./UserPresenceIndicator";

export const WorkspacePresenceList = observer(function WorkspacePresenceList({
  workspaceSlug,
}: {
  workspaceSlug: string;
}) {
  const chat = useChat();
  const presence = usePresence(workspaceSlug);

  useEffect(() => {
    void chat.presence.fetchPresence(workspaceSlug);
  }, [chat, workspaceSlug]);

  if (!presence.length) return null;

  return (
    <div className="border-t border-subtle px-3 py-2">
      <div className="mb-2 text-11 font-semibold text-tertiary">Online now</div>
      <div className="flex flex-col gap-1">
        {presence.slice(0, 6).map((item) => (
          <div key={item.user} className="flex items-center gap-2 text-12 text-secondary">
            <UserPresenceIndicator status={item.status} />
            <span className="truncate">{item.user_detail?.display_name || item.user}</span>
          </div>
        ))}
      </div>
    </div>
  );
});
