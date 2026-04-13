/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { ChatLayout } from "@/components/chat/ChatLayout";
import type { Route } from "./+types/page";

function ProjectChatPage({ params }: Route.ComponentProps) {
  const { workspaceSlug, projectId } = params;
  return (
    <ChatLayout workspaceSlug={workspaceSlug} projectId={projectId}>
      <div className="text-sm flex h-full items-center justify-center text-secondary">Select a project channel.</div>
    </ChatLayout>
  );
}

export default observer(ProjectChatPage);
