/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { escapeHtml, sanitizeRichHTML } from "@plane/utils";
import type { TMessage } from "@plane/types";

const URL_REGEX = /(https?:\/\/[^\s<>"]+)/g;

function renderMentions(html: string): string {
  return html
    .replace(/<mention[^>]*data-id="([^"]*)"[^>]*>([^<]*)<\/mention>/g, (_match, _id, text) => {
      return `<span class="inline-flex items-center rounded-md bg-amber-500/15 px-1.5 py-0.5 text-amber-700 font-medium dark:text-amber-300">${escapeHtml(
        text
      )}</span>`;
    })
    .replace(/<span[^>]*data-mention-type="user_mention"[^>]*>([^<]*)<\/span>/g, (_match, text) => {
      return `<span class="inline-flex items-center rounded-md bg-amber-500/15 px-1.5 py-0.5 text-amber-700 font-medium dark:text-amber-300">${escapeHtml(
        text
      )}</span>`;
    });
}

function LinkPreviewCard({ url }: { url: string }) {
  let hostname = "";
  try {
    hostname = new URL(url).hostname;
  } catch {
    hostname = url;
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 flex max-w-md items-center gap-2 rounded-xl border border-subtle bg-surface-2/80 px-3.5 py-2.5 text-13 text-secondary transition-colors hover:bg-surface-3"
    >
      <span className="truncate font-medium text-primary">{hostname}</span>
      <span className="truncate text-tertiary">{url}</span>
    </a>
  );
}

export function MessageContent({ message }: { message: TMessage }) {
  if (message.deleted_at) return <div className="text-tertiary italic">Message deleted</div>;

  const urls = message.content ? [...new Set(message.content.match(URL_REGEX) ?? [])] : [];

  if (message.content_html) {
    const processedHtml = sanitizeRichHTML(renderMentions(message.content_html));
    return (
      <div className="flex flex-col gap-1">
        <div
          className="prose-sm max-w-none prose text-[14px] text-primary [&_a]:text-accent-primary [&_code]:rounded [&_code]:bg-surface-3 [&_code]:px-1"
          dangerouslySetInnerHTML={{ __html: processedHtml }}
        />
        {urls.map((url) => (
          <LinkPreviewCard key={url} url={url} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="text-[14px] whitespace-pre-wrap leading-6 text-primary">{message.content}</div>
      {urls.map((url) => (
        <LinkPreviewCard key={url} url={url} />
      ))}
    </div>
  );
}
