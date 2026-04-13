/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { useTranslation } from "@plane/i18n";
import { PageHead } from "@/components/core/page-title";
import { ChatLayout } from "@/components/chat/ChatLayout";
import type { Route } from "./+types/page";

function MessagingHomePage({ params }: Route.ComponentProps) {
  const { workspaceSlug } = params;
  const { t } = useTranslation();
  return (
    <>
      <PageHead title={t("chat.page_label")} />
      <ChatLayout workspaceSlug={workspaceSlug}>
        <div className="text-sm flex h-full items-center justify-center text-secondary">{t("chat.select_channel")}</div>
      </ChatLayout>
    </>
  );
}

export default observer(MessagingHomePage);
