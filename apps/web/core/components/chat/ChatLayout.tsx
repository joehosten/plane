/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { ReactNode } from "react";
import { ChannelSidebar } from "./ChannelSidebar";

export function ChatLayout({
  workspaceSlug,
  projectId,
  children,
}: {
  workspaceSlug: string;
  projectId?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full overflow-hidden">
      <ChannelSidebar workspaceSlug={workspaceSlug} projectId={projectId} />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
