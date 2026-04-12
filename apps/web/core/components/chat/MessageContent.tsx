/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { TMessage } from "@plane/types";

export function MessageContent({ message }: { message: TMessage }) {
  if (message.deleted_at) return <div className="text-tertiary italic">Message deleted</div>;
  if (message.content_html)
    return <div className="prose-sm max-w-none prose" dangerouslySetInnerHTML={{ __html: message.content_html }} />;
  return <div className="text-13 whitespace-pre-wrap text-primary">{message.content}</div>;
}
