/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { Outlet } from "react-router";
import { ProjectsAppPowerKProvider } from "@/components/power-k/projects-app-provider";

function MessagingLayout() {
  return (
    <>
      <ProjectsAppPowerKProvider />
      <Outlet />
    </>
  );
}

export default observer(MessagingLayout);
