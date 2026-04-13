# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Django imports
from django.db.models import Count, Max, Q
from django.utils import timezone

# Third Party imports
from rest_framework import status
from rest_framework.response import Response

# Module imports
from plane.app.permissions import ROLE, allow_permission
from plane.app.serializers import (
    ChannelMembershipSerializer,
    ChannelPinnedSerializer,
    ChannelReadStateSerializer,
    ChannelSerializer,
)
from plane.app.views.base import BaseAPIView
from plane.db.models import (
    Channel,
    ChannelMembership,
    ChannelPinned,
    ChannelReadState,
    Message,
    ProjectMember,
    User,
    Workspace,
    WorkspaceMember,
)

from .. import BaseViewSet


class ChatChannelAccessMixin:
    def _workspace_member_exists(self, slug, user):
        return WorkspaceMember.objects.filter(workspace__slug=slug, member=user, is_active=True).exists()

    def _is_channel_admin(self, channel, user):
        return ChannelMembership.objects.filter(
            channel=channel,
            member=user,
            role=ROLE.ADMIN.value,
            deleted_at__isnull=True,
        ).exists() or WorkspaceMember.objects.filter(
            workspace_id=channel.workspace_id,
            member=user,
            role=ROLE.ADMIN.value,
            is_active=True,
        ).exists()

    def _can_access_channel(self, channel, user):
        if channel.channel_type == "WORKSPACE_PUBLIC":
            return WorkspaceMember.objects.filter(
                workspace_id=channel.workspace_id, member=user, is_active=True
            ).exists()
        if channel.channel_type == "PROJECT" and channel.project_id:
            return ProjectMember.objects.filter(project_id=channel.project_id, member=user, is_active=True).exists()
        return ChannelMembership.objects.filter(channel=channel, member=user, deleted_at__isnull=True).exists()

    def _permission_payload(self, channel, user):
        is_admin = self._is_channel_admin(channel, user)
        payload = {
            "can_post": channel.can_post,
            "can_create_channels": channel.can_create_channels,
            "can_manage_members": channel.can_manage_members,
            "current_user_can_post": is_admin or channel.can_post,
            "current_user_can_create_channels": is_admin or channel.can_create_channels,
            "current_user_can_manage_members": is_admin or channel.can_manage_members,
            "can_manage_permissions": is_admin,
        }
        if channel.channel_type in ["DM", "GROUP_DM"]:
            payload["current_user_can_post"] = True
            payload["current_user_can_create_channels"] = is_admin
            payload["current_user_can_manage_members"] = is_admin
        return payload

    def _accessible_channels(self, slug, user):
        return (
            Channel.objects.filter(workspace__slug=slug)
            .filter(
                Q(
                    channel_type="WORKSPACE_PUBLIC",
                    workspace__workspace_member__member=user,
                    workspace__workspace_member__is_active=True,
                )
                | Q(
                    channel_type="PROJECT",
                    project__project_projectmember__member=user,
                    project__project_projectmember__is_active=True,
                )
                | Q(memberships__member=user, memberships__deleted_at__isnull=True)
            )
            .annotate(member_count=Count("memberships", distinct=True), last_message_at=Max("messages__created_at"))
            .distinct()
        )


class ChannelViewSet(ChatChannelAccessMixin, BaseViewSet):
    serializer_class = ChannelSerializer
    model = Channel

    def get_queryset(self):
        return self._accessible_channels(self.kwargs.get("slug"), self.request.user)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def list(self, request, slug, project_id=None):
        queryset = self.get_queryset()
        requested_project_id = project_id or request.GET.get("project_id")
        if requested_project_id:
            queryset = queryset.filter(project_id=requested_project_id)
        return Response(ChannelSerializer(queryset.order_by("name"), many=True).data, status=status.HTTP_200_OK)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def retrieve(self, request, slug, pk, project_id=None):
        channel = self.get_queryset().filter(pk=pk).first()
        if channel is None:
            return Response({"error": "Channel does not exist"}, status=status.HTTP_404_NOT_FOUND)
        return Response(ChannelSerializer(channel).data, status=status.HTTP_200_OK)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def create(self, request, slug, project_id=None):
        workspace = Workspace.objects.get(slug=slug)
        serializer = ChannelSerializer(data=request.data, context={"project_id": project_id})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer.save(
            workspace=workspace,
            project_id=project_id,
            created_by=request.user,
        )
        channel = serializer.instance

        if project_id and channel.channel_type == "PROJECT":
            project_members = ProjectMember.objects.filter(project_id=project_id, is_active=True).values_list(
                "member_id", flat=True
            )
            for member_id in project_members:
                ChannelMembership.objects.get_or_create(
                    channel=channel,
                    member_id=member_id,
                    defaults={
                        "role": ROLE.ADMIN.value if member_id == request.user.id else ROLE.MEMBER.value,
                        "created_by": request.user,
                    },
                )

        return Response(ChannelSerializer(channel).data, status=status.HTTP_201_CREATED)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def partial_update(self, request, slug, pk, project_id=None):
        channel = Channel.objects.get(pk=pk, workspace__slug=slug)
        permissions = self._permission_payload(channel, request.user)
        if not permissions["current_user_can_create_channels"]:
            return Response({"error": "You do not have permission"}, status=status.HTTP_403_FORBIDDEN)
        serializer = ChannelSerializer(channel, data=request.data, partial=True, context={"project_id": project_id})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(updated_by=request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def destroy(self, request, slug, pk, project_id=None):
        channel = Channel.objects.get(pk=pk, workspace__slug=slug)
        if not self._is_channel_admin(channel, request.user):
            return Response({"error": "You do not have permission"}, status=status.HTTP_403_FORBIDDEN)
        channel.is_archived = True
        channel.save(update_fields=["is_archived", "updated_at", "updated_by"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChannelMembershipViewSet(ChatChannelAccessMixin, BaseViewSet):
    serializer_class = ChannelMembershipSerializer
    model = ChannelMembership

    def get_queryset(self):
        channel_id = self.kwargs.get("channel_id")
        return ChannelMembership.objects.filter(channel_id=channel_id, deleted_at__isnull=True).select_related("member")

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def list(self, request, slug, channel_id):
        channel = Channel.objects.get(pk=channel_id, workspace__slug=slug)
        if not self._can_access_channel(channel, request.user):
            return Response({"error": "You do not have permission"}, status=status.HTTP_403_FORBIDDEN)
        serializer = ChannelMembershipSerializer(self.get_queryset(), many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def create(self, request, slug, channel_id):
        channel = Channel.objects.get(pk=channel_id, workspace__slug=slug)
        if not self._permission_payload(channel, request.user)["current_user_can_manage_members"]:
            return Response({"error": "You do not have permission"}, status=status.HTTP_403_FORBIDDEN)
        serializer = ChannelMembershipSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(channel=channel, created_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def partial_update(self, request, slug, channel_id, member_id):
        channel = Channel.objects.get(pk=channel_id, workspace__slug=slug)
        if not self._permission_payload(channel, request.user)["current_user_can_manage_members"]:
            return Response({"error": "You do not have permission"}, status=status.HTTP_403_FORBIDDEN)
        membership = ChannelMembership.objects.get(channel=channel, member_id=member_id, deleted_at__isnull=True)
        serializer = ChannelMembershipSerializer(membership, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(updated_by=request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def destroy(self, request, slug, channel_id, member_id):
        channel = Channel.objects.get(pk=channel_id, workspace__slug=slug)
        can_manage_members = self._permission_payload(channel, request.user)["current_user_can_manage_members"]
        if not can_manage_members and str(request.user.id) != str(member_id):
            return Response({"error": "You do not have permission"}, status=status.HTTP_403_FORBIDDEN)
        membership = ChannelMembership.objects.get(channel=channel, member_id=member_id, deleted_at__isnull=True)
        membership.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChannelReadStateEndpoint(ChatChannelAccessMixin, BaseAPIView):
    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def get(self, request, slug, channel_id):
        channel = Channel.objects.get(pk=channel_id, workspace__slug=slug)
        if not self._can_access_channel(channel, request.user):
            return Response({"error": "You do not have permission"}, status=status.HTTP_403_FORBIDDEN)
        read_state, _ = ChannelReadState.objects.get_or_create(channel=channel, member=request.user)
        return Response(ChannelReadStateSerializer(read_state).data, status=status.HTTP_200_OK)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def post(self, request, slug, channel_id):
        channel = Channel.objects.get(pk=channel_id, workspace__slug=slug)
        if not self._can_access_channel(channel, request.user):
            return Response({"error": "You do not have permission"}, status=status.HTTP_403_FORBIDDEN)
        last_read_message_id = request.data.get("last_read_message")
        last_read_message = None
        if last_read_message_id:
            last_read_message = Message.objects.filter(channel=channel, pk=last_read_message_id).first()
        read_state, _ = ChannelReadState.objects.get_or_create(channel=channel, member=request.user)
        read_state.last_read_message = last_read_message
        read_state.last_read_at = request.data.get("last_read_at") or timezone.now()
        read_state.save(update_fields=["last_read_message", "last_read_at", "updated_at", "updated_by"])
        return Response(ChannelReadStateSerializer(read_state).data, status=status.HTTP_200_OK)


class ChannelPermissionsEndpoint(ChatChannelAccessMixin, BaseAPIView):
    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def get(self, request, slug, channel_id):
        channel = Channel.objects.get(pk=channel_id, workspace__slug=slug)
        if not self._can_access_channel(channel, request.user):
            return Response({"error": "You do not have permission"}, status=status.HTTP_403_FORBIDDEN)
        return Response(self._permission_payload(channel, request.user), status=status.HTTP_200_OK)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def patch(self, request, slug, channel_id):
        channel = Channel.objects.get(pk=channel_id, workspace__slug=slug)
        if not self._is_channel_admin(channel, request.user):
            return Response({"error": "You do not have permission"}, status=status.HTTP_403_FORBIDDEN)
        for field in ["can_post", "can_create_channels", "can_manage_members"]:
            if field in request.data:
                setattr(channel, field, bool(request.data[field]))
        channel.updated_by = request.user
        channel.save(update_fields=["can_post", "can_create_channels", "can_manage_members", "updated_at", "updated_by"])
        return Response(self._permission_payload(channel, request.user), status=status.HTTP_200_OK)


class ChannelPinnedViewSet(ChatChannelAccessMixin, BaseViewSet):
    serializer_class = ChannelPinnedSerializer
    model = ChannelPinned

    def get_queryset(self):
        return ChannelPinned.objects.filter(channel_id=self.kwargs.get("channel_id"), deleted_at__isnull=True)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def list(self, request, slug, channel_id):
        channel = Channel.objects.get(pk=channel_id, workspace__slug=slug)
        if not self._can_access_channel(channel, request.user):
            return Response({"error": "You do not have permission"}, status=status.HTTP_403_FORBIDDEN)
        return Response(ChannelPinnedSerializer(self.get_queryset(), many=True).data, status=status.HTTP_200_OK)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def create(self, request, slug, channel_id):
        channel = Channel.objects.get(pk=channel_id, workspace__slug=slug)
        if not self._can_access_channel(channel, request.user):
            return Response({"error": "You do not have permission"}, status=status.HTTP_403_FORBIDDEN)
        message = Message.objects.get(pk=request.data.get("message"), channel=channel)
        pin, _ = ChannelPinned.objects.get_or_create(channel=channel, message=message, defaults={"created_by": request.user})
        return Response(ChannelPinnedSerializer(pin).data, status=status.HTTP_201_CREATED)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def destroy(self, request, slug, channel_id, pk):
        channel = Channel.objects.get(pk=channel_id, workspace__slug=slug)
        pin = ChannelPinned.objects.get(pk=pk, channel=channel, deleted_at__isnull=True)
        pin.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class DMChannelEndpoint(ChatChannelAccessMixin, BaseAPIView):
    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def post(self, request, slug):
        workspace = Workspace.objects.get(slug=slug)
        member_ids = [str(member_id) for member_id in request.data.get("member_ids", [])]
        member_ids = sorted(set(member_ids + [str(request.user.id)]))
        if len(member_ids) < 2:
            return Response({"error": "At least two members are required."}, status=status.HTTP_400_BAD_REQUEST)

        channel_type = "DM" if len(member_ids) == 2 else "GROUP_DM"
        candidate_channels = self._accessible_channels(slug, request.user).filter(channel_type=channel_type)
        for candidate in candidate_channels:
            candidate_member_ids = sorted(
                [str(member_id) for member_id in candidate.memberships.filter(deleted_at__isnull=True).values_list("member_id", flat=True)]
            )
            if candidate_member_ids == member_ids:
                return Response(ChannelSerializer(candidate).data, status=status.HTTP_200_OK)

        users = list(User.objects.filter(id__in=member_ids).order_by("display_name"))
        display_names = [user.display_name for user in users]
        name = ", ".join(display_names[:5])
        if len(display_names) > 5:
            name = f"{name} + {len(display_names) - 5} more"
        channel = Channel.objects.create(
            workspace=workspace,
            channel_type=channel_type,
            name=name,
            created_by=request.user,
        )
        for user in users:
            ChannelMembership.objects.create(
                channel=channel,
                member=user,
                role=ROLE.ADMIN.value if user.id == request.user.id else ROLE.MEMBER.value,
                created_by=request.user,
            )
        return Response(ChannelSerializer(channel).data, status=status.HTTP_201_CREATED)
