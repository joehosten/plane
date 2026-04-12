/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { observer } from "mobx-react";
import { Plus } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useChat } from "@/hooks/store/use-chat";
import { WorkspacePresenceList } from "./WorkspacePresenceList";
import { CreateChannelModal } from "./CreateChannelModal";

const Section = ({ title, children, onAdd }: { title: string; children: ReactNode; onAdd?: () => void }) => (
  <div className="flex flex-col gap-1">
    <div className="flex items-center justify-between px-3">
      <span className="text-11 font-semibold text-tertiary uppercase">{title}</span>
      {onAdd && (
        <button onClick={onAdd} className="text-tertiary hover:text-secondary" title={`Add ${title.toLowerCase()}`}>
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
    {children}
  </div>
);

export const ChannelSidebar = observer(function ChannelSidebar({
  workspaceSlug,
  projectId,
}: {
  workspaceSlug: string;
  projectId?: string;
}) {
  const chat = useChat();
  const navigate = useNavigate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    if (projectId) void chat.channel.fetchProjectChannels(workspaceSlug, projectId);
    else void chat.channel.fetchWorkspaceChannels(workspaceSlug);
  }, [chat, projectId, workspaceSlug]);

  const buildHref = (channelId: string, isDM?: boolean) => {
    if (projectId) return `/${workspaceSlug}/projects/${projectId}/chat/${channelId}`;
    return isDM ? `/${workspaceSlug}/messaging/dms/${channelId}` : `/${workspaceSlug}/messaging/channels/${channelId}`;
  };

  const handleChannelCreated = (channelId: string) => {
    navigate(buildHref(channelId));
  };

  return (
    <aside className="flex h-full w-72 flex-col border-r border-subtle bg-surface-2">
      <div className="text-sm px-3 py-3 font-semibold text-primary">Messaging</div>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto py-2">
        {!projectId && (
          <>
            <Section title="Channels" onAdd={() => setIsCreateOpen(true)}>
              {chat.channel.workspacePublicChannels.map((channel) => (
                <Link
                  key={channel.id}
                  to={buildHref(channel.id)}
                  className="hover:bg-surface-3 flex items-center justify-between px-3 py-1.5 text-13 text-secondary"
                >
                  <span className="truncate"># {channel.name}</span>
                  {!!channel.unread_count && <span className="text-11 text-primary">{channel.unread_count}</span>}
                </Link>
              ))}
              {chat.channel.workspacePrivateChannels.map((channel) => (
                <Link
                  key={channel.id}
                  to={buildHref(channel.id)}
                  className="hover:bg-surface-3 flex items-center justify-between px-3 py-1.5 text-13 text-secondary"
                >
                  <span className="truncate">🔒 {channel.name}</span>
                  {!!channel.unread_count && <span className="text-11 text-primary">{channel.unread_count}</span>}
                </Link>
              ))}
            </Section>
            <Section title="Direct messages">
              {chat.channel.dmChannels.concat(chat.channel.groupDmChannels).map((channel) => (
                <Link
                  key={channel.id}
                  to={buildHref(channel.id, true)}
                  className="hover:bg-surface-3 flex items-center justify-between px-3 py-1.5 text-13 text-secondary"
                >
                  <span className="truncate">{channel.name}</span>
                  {!!channel.unread_count && <span className="text-11 text-primary">{channel.unread_count}</span>}
                </Link>
              ))}
            </Section>
          </>
        )}
        {(projectId || chat.channel.projectChannels.length > 0) && (
          <Section
            title={projectId ? "Project chat" : "Project channels"}
            onAdd={projectId ? () => setIsCreateOpen(true) : undefined}
          >
            {chat.channel.projectChannels.map((channel) => (
              <Link
                key={channel.id}
                to={buildHref(channel.id)}
                className="hover:bg-surface-3 flex items-center justify-between px-3 py-1.5 text-13 text-secondary"
              >
                <span className="truncate"># {channel.name}</span>
                {!!channel.unread_count && <span className="text-11 text-primary">{channel.unread_count}</span>}
              </Link>
            ))}
          </Section>
        )}
      </div>
      {!projectId && <WorkspacePresenceList workspaceSlug={workspaceSlug} />}

      <CreateChannelModal
        workspaceSlug={workspaceSlug}
        projectId={projectId}
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleChannelCreated}
      />
    </aside>
  );
});
