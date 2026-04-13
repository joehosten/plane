/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect } from "react";
import { observer } from "mobx-react";
import { Link } from "react-router";
import { MessageSquare } from "lucide-react";
import { EChannelType } from "@plane/types";
import type { THomeWidgetProps } from "@plane/types";
import { useChat } from "@/hooks/store/use-chat";

export const ChatUnreadWidget = observer(function ChatUnreadWidget({ workspaceSlug }: THomeWidgetProps) {
  const chat = useChat();

  useEffect(() => {
    void chat.channel.fetchWorkspaceChannels(workspaceSlug);
  }, [chat, workspaceSlug]);

  const allChannels = [
    ...chat.channel.workspacePublicChannels,
    ...chat.channel.workspacePrivateChannels,
    ...chat.channel.dmChannels,
    ...chat.channel.groupDmChannels,
  ];

  const unreadChannels = allChannels.filter((c) => c.unread_count > 0);
  const totalUnread = unreadChannels.reduce((sum, c) => sum + c.unread_count, 0);
  const topChannels = unreadChannels.sort((a, b) => b.unread_count - a.unread_count).slice(0, 5);

  if (!totalUnread) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
        <MessageSquare className="h-8 w-8 text-tertiary" />
        <p className="text-13 text-tertiary">All caught up! No unread messages.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-12 text-secondary">
          <strong className="text-primary">{totalUnread}</strong> unread{" "}
          {totalUnread === 1 ? "message" : "messages"} across{" "}
          <strong className="text-primary">{unreadChannels.length}</strong>{" "}
          {unreadChannels.length === 1 ? "channel" : "channels"}
        </span>
        <Link to={`/${workspaceSlug}/messaging/`} className="text-11 text-accent-primary hover:underline">
          View all
        </Link>
      </div>
      {topChannels.map((channel) => {
        const isDm = channel.channel_type === EChannelType.DM || channel.channel_type === EChannelType.GROUP_DM;
        const href = isDm
          ? `/${workspaceSlug}/messaging/dms/${channel.id}`
          : `/${workspaceSlug}/messaging/channels/${channel.id}`;
        return (
          <Link
            key={channel.id}
            to={href}
            className="flex items-center justify-between rounded-md px-3 py-2 text-13 text-primary hover:bg-surface-2"
          >
            <span className="truncate">{isDm ? channel.name : `# ${channel.name}`}</span>
            <span className="ml-2 flex-shrink-0 rounded-full bg-accent-primary px-1.5 py-0.5 text-10 font-semibold text-white">
              {channel.unread_count > 99 ? "99+" : channel.unread_count}
            </span>
          </Link>
        );
      })}
    </div>
  );
});
