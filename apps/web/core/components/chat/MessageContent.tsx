/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Fragment } from "react";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import type { TMessage } from "@plane/types";

const URL_REGEX = /(https?:\/\/[^\s<>"]+)/g;
const MENTION_CLASS_NAME =
  "inline-flex items-center rounded-md bg-amber-500/15 px-1.5 py-0.5 font-medium text-amber-700 dark:text-amber-300";

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function getMentionLabels(message: TMessage): string[] {
  const labels = [...message.content_html.matchAll(/<mention-component[^>]*id="([^"]+)"[^>]*>/g)].map(
    (match) => `@${match[1]}`
  );

  if (/@everyone\b/i.test(message.content ?? "")) {
    labels.push("@everyone");
  }

  return [...new Set(labels)];
}

function highlightMentions(children: ReactNode, labels: string[]): ReactNode {
  if (!labels.length) return children;

  if (typeof children === "string") {
    const pattern = new RegExp(`(${labels.map(escapeRegExp).join("|")})`, "g");
    let offset = 0;
    return children.split(pattern).map((part) => {
      const key = `${part}-${offset}`;
      offset += part.length;
      return labels.includes(part) ? (
        <span key={key} className={MENTION_CLASS_NAME}>
          {part}
        </span>
      ) : (
        <Fragment key={key}>{part}</Fragment>
      );
    });
  }

  if (Array.isArray(children)) {
    return children.map((child) => highlightMentions(child, labels));
  }

  return children;
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
      className="hover:bg-surface-3 mt-2 flex max-w-md items-center gap-2 rounded-xl border border-subtle bg-surface-2/80 px-3.5 py-2 text-13 text-secondary transition-colors"
    >
      <span className="truncate font-medium text-primary">{hostname}</span>
      <span className="truncate text-tertiary">{url}</span>
    </a>
  );
}

export function MessageContent({ message }: { message: TMessage }) {
  if (message.deleted_at) return <div className="text-tertiary italic">Message deleted</div>;

  const urls = message.content ? Array.from(new Set(message.content.match(URL_REGEX) ?? []), (url) => String(url)) : [];
  const mentionLabels = getMentionLabels(message);

  return (
    <div className="flex flex-col gap-1">
      <div className="[&_code]:bg-surface-3 max-w-none text-[15px] leading-6 text-primary [&_a]:text-accent-primary [&_blockquote]:border-l-2 [&_blockquote]:border-subtle [&_blockquote]:pl-3 [&_code]:rounded [&_code]:px-1 [&_li>p]:inline">
        <ReactMarkdown
          components={{
            p: ({ children }) => <p className="whitespace-pre-wrap">{highlightMentions(children, mentionLabels)}</p>,
            li: ({ children }) => <li>{highlightMentions(children, mentionLabels)}</li>,
            strong: ({ children }) => <strong>{highlightMentions(children, mentionLabels)}</strong>,
            em: ({ children }) => <em>{highlightMentions(children, mentionLabels)}</em>,
            blockquote: ({ children }) => <blockquote>{highlightMentions(children, mentionLabels)}</blockquote>,
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
      {urls.map((url) => (
        <LinkPreviewCard key={url} url={url} />
      ))}
    </div>
  );
}
