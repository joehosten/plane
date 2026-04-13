/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Link } from "react-router";

type TIssueChipProps = {
  label: string;
  workspaceSlug?: string;
  projectId?: string;
  issueId?: string;
};

export function IssueChip({ label, workspaceSlug, projectId, issueId }: TIssueChipProps) {
  if (workspaceSlug && projectId && issueId) {
    return (
      <Link
        to={`/${workspaceSlug}/projects/${projectId}/issues/${issueId}`}
        className="inline-flex items-center gap-1 rounded bg-surface-3 px-2 py-0.5 text-11 text-accent-primary hover:underline"
      >
        {label}
      </Link>
    );
  }
  return <span className="rounded bg-surface-3 px-2 py-0.5 text-11 text-secondary">{label}</span>;
}
