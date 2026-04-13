/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { TMessage } from "@plane/types";

const URL_REGEX = /(https?:\/\/[^\s<>"]+)/g;

function renderMentions(html: string): string {
  return html.replace(
    /<mention[^>]*data-id="([^"]*)"[^>]*>([^<]*)<\/mention>/g,
    '<span class="inline-flex items-center rounded bg-accent-primary/10 px-1 py-0.5 text-accent-primary font-medium text-11">$2</span>'
  );
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
      className="mt-1 flex max-w-sm items-center gap-2 rounded-md border border-subtle bg-surface-2 px-3 py-2 text-12 text-secondary hover:bg-surface-3"
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
    const processedHtml = renderMentions(message.content_html);
    return (
      <div className="flex flex-col gap-1">
        <div
          className="prose-sm max-w-none prose text-primary [&_a]:text-accent-primary [&_code]:rounded [&_code]:bg-surface-3 [&_code]:px-1"
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
      <div className="text-13 whitespace-pre-wrap text-primary">{message.content}</div>
      {urls.map((url) => (
        <LinkPreviewCard key={url} url={url} />
      ))}
    </div>
  );
}
