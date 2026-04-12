/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { MessageSquare } from "lucide-react";
// components
import { ProjectNavigation } from "@/components/workspace/sidebar/project-navigation";

type TProjectItemsRootProps = {
  workspaceSlug: string;
  projectId: string;
};

export function ProjectNavigationRoot(props: TProjectItemsRootProps) {
  const { workspaceSlug, projectId } = props;
  return (
    <ProjectNavigation
      workspaceSlug={workspaceSlug}
      projectId={projectId}
      additionalNavigationItems={(workspaceSlugParam, projectIdParam) => [
        {
          i18n_key: "sidebar.chat",
          key: "chat",
          name: "Chat",
          href: `/${workspaceSlugParam}/projects/${projectIdParam}/chat`,
          icon: MessageSquare,
          access: [20, 15, 5],
          shouldRender: true,
          sortOrder: 7,
        },
      ]}
    />
  );
}
