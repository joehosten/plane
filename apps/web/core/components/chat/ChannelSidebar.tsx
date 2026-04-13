/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Fragment, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { observer } from "mobx-react";
import { ChevronDown, ChevronRight, MessageSquarePlus, Plus } from "lucide-react";
import { Transition } from "@headlessui/react";
import { Link, useNavigate, useParams } from "react-router";
import { EChannelType } from "@plane/types";
import type { TChannel } from "@plane/types";
import { useChat } from "@/hooks/store/use-chat";
import { WorkspacePresenceList } from "./WorkspacePresenceList";
import { CreateChannelModal } from "./CreateChannelModal";
import { NewDMModal } from "./NewDMModal";
import { GroupDMModal } from "./GroupDMModal";

function UnreadBadge({ count }: { count: number }) {
  if (!count) return null;
  if (count > 99)
    return (
      <span className="min-w-6 rounded-full bg-accent-primary px-1.5 py-0.5 text-center text-11 font-semibold text-white">
        99+
      </span>
    );
  return (
    <span className="min-w-6 rounded-full bg-accent-primary px-1.5 py-0.5 text-center text-11 font-semibold text-white">
      {count}
    </span>
  );
}

function ChannelLink({
  channel,
  href,
  activeChannelId,
}: {
  channel: TChannel;
  href: string;
  activeChannelId?: string;
}) {
  const isActive = channel.id === activeChannelId;
  const isPrivate = channel.channel_type === EChannelType.WORKSPACE_PRIVATE;
  return (
    <Link
      to={href}
      className={`flex items-center justify-between rounded-xl px-3.5 py-2 text-[15px] transition-all duration-200 ${
        isActive
          ? "bg-surface-3 shadow-sm font-medium text-primary"
          : "hover:bg-surface-3 text-secondary hover:text-primary"
      }`}
    >
      <span className="truncate">
        {isPrivate ? "🔒 " : "# "}
        {channel.name}
      </span>
      {channel.unread_count > 0 && <UnreadBadge count={channel.unread_count} />}
    </Link>
  );
}

const Section = ({
  title,
  children,
  onAdd,
  addTitle,
  extraAction,
}: {
  title: string;
  children: ReactNode;
  onAdd?: () => void;
  addTitle?: string;
  extraAction?: ReactNode;
}) => {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between px-3 py-1.5">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex flex-1 items-center gap-1 text-11 font-semibold text-tertiary uppercase hover:text-secondary"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {title}
        </button>
        <div className="flex items-center gap-0.5">
          {extraAction}
          {onAdd && (
            <button
              type="button"
              onClick={onAdd}
              className="rounded p-0.5 text-tertiary hover:text-secondary"
              title={addTitle}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <Transition
        as={Fragment}
        show={!collapsed}
        enter="transition duration-200 ease-out"
        enterFrom="transform -translate-y-1 opacity-0"
        enterTo="transform translate-y-0 opacity-100"
        leave="transition duration-150 ease-in"
        leaveFrom="transform translate-y-0 opacity-100"
        leaveTo="transform -translate-y-1 opacity-0"
      >
        <div className="flex flex-col gap-0.5 pr-1 pl-4">{children}</div>
      </Transition>
    </div>
  );
};

export const ChannelSidebar = observer(function ChannelSidebar({
  workspaceSlug,
  projectId,
}: {
  workspaceSlug: string;
  projectId?: string;
}) {
  const chat = useChat();
  const navigate = useNavigate();
  const { channelId: activeChannelId } = useParams();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isNewDMOpen, setIsNewDMOpen] = useState(false);
  const [isGroupDMOpen, setIsGroupDMOpen] = useState(false);

  useEffect(() => {
    if (projectId) void chat.channel.fetchProjectChannels(workspaceSlug, projectId);
    else void chat.channel.fetchWorkspaceChannels(workspaceSlug);
  }, [chat, projectId, workspaceSlug]);

  useEffect(() => {
    if (!activeChannelId) return;
    if (chat.channel.getChannel(activeChannelId)) return;
    void chat.channel.fetchChannel(workspaceSlug, activeChannelId);
  }, [activeChannelId, chat, workspaceSlug]);

  const buildHref = (channelId: string, isDM?: boolean) => {
    if (projectId) return `/${workspaceSlug}/projects/${projectId}/chat/${channelId}`;
    return isDM ? `/${workspaceSlug}/messaging/dms/${channelId}` : `/${workspaceSlug}/messaging/channels/${channelId}`;
  };

  const handleChannelCreated = (channelId: string) => {
    navigate(buildHref(channelId));
  };

  return (
    <aside className="flex h-full w-88 flex-shrink-0 flex-col border-r border-subtle bg-surface-2/90 backdrop-blur-sm">
      <div className="px-4 py-3.5 text-[16px] font-semibold text-primary">Messaging</div>
      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-1.5 py-1.5">
        {!projectId && (
          <>
            <Section title="Channels" onAdd={() => setIsCreateOpen(true)} addTitle="New channel">
              {chat.channel.workspacePublicChannels.map((channel) => (
                <ChannelLink
                  key={channel.id}
                  channel={channel}
                  href={buildHref(channel.id)}
                  activeChannelId={activeChannelId}
                />
              ))}
              {chat.channel.workspacePrivateChannels.map((channel) => (
                <ChannelLink
                  key={channel.id}
                  channel={channel}
                  href={buildHref(channel.id)}
                  activeChannelId={activeChannelId}
                />
              ))}
            </Section>

            <Section
              title="Direct Messages"
              onAdd={() => setIsNewDMOpen(true)}
              addTitle="New DM"
              extraAction={
                <button
                  type="button"
                  onClick={() => setIsGroupDMOpen(true)}
                  className="rounded p-0.5 text-tertiary hover:text-secondary"
                  title="New Group DM"
                >
                  <MessageSquarePlus className="h-3.5 w-3.5" />
                </button>
              }
            >
              {chat.channel.dmChannels.concat(chat.channel.groupDmChannels).map((channel) => (
                <Link
                  key={channel.id}
                  to={buildHref(channel.id, true)}
                  className={`flex items-center justify-between rounded-xl px-3.5 py-2 text-[15px] transition-all duration-200 ${
                    channel.id === activeChannelId
                      ? "bg-surface-3 shadow-sm font-medium text-primary"
                      : "hover:bg-surface-3 text-secondary hover:text-primary"
                  }`}
                >
                  <span className="truncate">{channel.name}</span>
                  {channel.unread_count > 0 && <UnreadBadge count={channel.unread_count} />}
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
              <ChannelLink
                key={channel.id}
                channel={channel}
                href={buildHref(channel.id)}
                activeChannelId={activeChannelId}
              />
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

      <NewDMModal
        workspaceSlug={workspaceSlug}
        isOpen={isNewDMOpen}
        onClose={() => setIsNewDMOpen(false)}
        onCreated={handleChannelCreated}
      />

      <GroupDMModal
        workspaceSlug={workspaceSlug}
        isOpen={isGroupDMOpen}
        onClose={() => setIsGroupDMOpen(false)}
        onCreated={handleChannelCreated}
      />
    </aside>
  );
});
