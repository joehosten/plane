/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { useChannel } from "@/hooks/store/use-chat";

export const ChannelHeader = observer(function ChannelHeader({ channelId }: { channelId: string }) {
  const channel = useChannel(channelId);

  if (!channel) return null;

  return (
    <div className="flex items-center justify-between border-b border-subtle px-4 py-3">
      <div>
        <div className="text-sm font-semibold text-primary">
          {channel.channel_type.includes("DM") ? channel.name : `# ${channel.name}`}
        </div>
        {channel.description && <div className="text-12 text-secondary">{channel.description}</div>}
      </div>
      <div className="text-12 text-tertiary">{channel.member_count} members</div>
    </div>
  );
});
