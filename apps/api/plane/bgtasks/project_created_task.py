# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from celery import shared_task

from plane.db.models import Channel, ChannelMembership, ChannelType, Project, ProjectMember
from plane.app.permissions import ROLE


@shared_task
def create_project_default_channel(project_id, actor_id=None):
    project = Project.objects.get(pk=project_id)
    channel, _ = Channel.objects.get_or_create(
        workspace_id=project.workspace_id,
        project_id=project.id,
        name="general",
        channel_type=ChannelType.PROJECT,
        defaults={
            "description": "Default project chat channel",
            "created_by_id": actor_id,
        },
    )

    member_ids = ProjectMember.objects.filter(project_id=project.id, is_active=True).values_list("member_id", flat=True)
    for member_id in member_ids:
        ChannelMembership.objects.get_or_create(
            channel=channel,
            member_id=member_id,
            defaults={
                "role": ROLE.ADMIN.value if str(member_id) == str(actor_id) else ROLE.MEMBER.value,
                "created_by_id": actor_id,
            },
        )
