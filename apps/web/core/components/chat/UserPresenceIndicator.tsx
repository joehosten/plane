/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { EUserPresenceStatus } from "@plane/types";

const STATUS_CLASS_MAP: Record<string, string> = {
  ONLINE: "bg-green-500",
  AWAY: "bg-yellow-500",
  DND: "bg-red-500",
  OFFLINE: "bg-gray-400",
};

export function UserPresenceIndicator({ status }: { status?: EUserPresenceStatus | string }) {
  return (
    <span
      className={`inline-block size-2 rounded-full ${STATUS_CLASS_MAP[status || "OFFLINE"] || STATUS_CLASS_MAP.OFFLINE}`}
    />
  );
}
