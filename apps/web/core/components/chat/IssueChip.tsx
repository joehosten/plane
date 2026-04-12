/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

export function IssueChip({ label }: { label: string }) {
  return <span className="bg-surface-3 rounded px-2 py-0.5 text-11 text-secondary">{label}</span>;
}
