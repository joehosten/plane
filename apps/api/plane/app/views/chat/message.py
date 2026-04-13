# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Django imports
from django.db.models import Count, Q
from django.utils import timezone

# Third Party imports
from rest_framework import status
from rest_framework.response import Response

# Module imports
from plane.app.permissions import ROLE, allow_permission
from plane.app.serializers import MessageSerializer
from plane.app.views.base import BaseAPIView
from plane.db.models import Channel, Message, ProjectMember, WorkspaceMember
from plane.utils.global_paginator import paginate

from .. import BaseViewSet
from .channel import ChatChannelAccessMixin


class MessageViewSet(ChatChannelAccessMixin, BaseViewSet):
    serializer_class = MessageSerializer
    model = Message

    def get_queryset(self):
        return (
            Message.objects.filter(channel_id=self.kwargs.get("channel_id"), parent__isnull=True, deleted_at__isnull=True)
            .select_related("sender", "issue", "reply_to", "reply_to__sender")
            .prefetch_related("attachments", "message_reactions")
            .annotate(thread_count=Count("thread_replies", filter=Q(thread_replies__deleted_at__isnull=True)))
            .order_by("-created_at")
        )

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def list(self, request, slug, channel_id):
        channel = Channel.objects.get(pk=channel_id, workspace__slug=slug)
        if not self._can_access_channel(channel, request.user):
            return Response({"error": "You do not have permission"}, status=status.HTTP_403_FORBIDDEN)
        cursor = request.GET.get("cursor")
        paginated_data = paginate(
            base_queryset=self.get_queryset(),
            queryset=self.get_queryset(),
            cursor=cursor,
            on_result=lambda results: MessageSerializer(results, many=True).data,
        )
        return Response(paginated_data, status=status.HTTP_200_OK)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def create(self, request, slug, channel_id):
        channel = Channel.objects.get(pk=channel_id, workspace__slug=slug)
        if not self._can_access_channel(channel, request.user):
            return Response({"error": "You do not have permission"}, status=status.HTTP_403_FORBIDDEN)
        if not self._permission_payload(channel, request.user)["current_user_can_post"]:
            return Response({"error": "You do not have permission"}, status=status.HTTP_403_FORBIDDEN)
        serializer = MessageSerializer(data=request.data, context={"channel_id": channel_id})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(channel=channel, sender=request.user, created_by=request.user)
        return Response(MessageSerializer(serializer.instance).data, status=status.HTTP_201_CREATED)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def retrieve(self, request, slug, channel_id, pk):
        channel = Channel.objects.get(pk=channel_id, workspace__slug=slug)
        if not self._can_access_channel(channel, request.user):
            return Response({"error": "You do not have permission"}, status=status.HTTP_403_FORBIDDEN)
        message = Message.objects.filter(channel=channel, pk=pk, deleted_at__isnull=True).first()
        if message is None:
            return Response({"error": "Message does not exist"}, status=status.HTTP_404_NOT_FOUND)
        return Response(MessageSerializer(message).data, status=status.HTTP_200_OK)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def partial_update(self, request, slug, channel_id, pk):
        channel = Channel.objects.get(pk=channel_id, workspace__slug=slug)
        message = Message.objects.get(channel=channel, pk=pk, deleted_at__isnull=True)
        can_edit = str(message.sender_id) == str(request.user.id) or self._is_channel_admin(channel, request.user)
        if not can_edit:
            return Response({"error": "You do not have permission"}, status=status.HTTP_403_FORBIDDEN)
        serializer = MessageSerializer(message, data=request.data, partial=True, context={"channel_id": channel_id})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(updated_by=request.user)
        return Response(MessageSerializer(serializer.instance).data, status=status.HTTP_200_OK)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def destroy(self, request, slug, channel_id, pk):
        channel = Channel.objects.get(pk=channel_id, workspace__slug=slug)
        message = Message.objects.get(channel=channel, pk=pk, deleted_at__isnull=True)
        can_delete = str(message.sender_id) == str(request.user.id) or self._is_channel_admin(channel, request.user)
        if not can_delete:
            return Response({"error": "You do not have permission"}, status=status.HTTP_403_FORBIDDEN)
        message.deleted_at = timezone.now()
        message.save(update_fields=["deleted_at", "updated_at", "updated_by"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class ThreadMessageViewSet(ChatChannelAccessMixin, BaseAPIView):
    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def get(self, request, slug, channel_id, message_id):
        channel = Channel.objects.get(pk=channel_id, workspace__slug=slug)
        if not self._can_access_channel(channel, request.user):
            return Response({"error": "You do not have permission"}, status=status.HTTP_403_FORBIDDEN)
        queryset = (
            Message.objects.filter(channel=channel, parent_id=message_id, deleted_at__isnull=True)
            .select_related("sender", "issue", "reply_to", "reply_to__sender")
            .prefetch_related("attachments", "message_reactions")
            .order_by("created_at")
        )
        return Response(MessageSerializer(queryset, many=True).data, status=status.HTTP_200_OK)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def post(self, request, slug, channel_id, message_id):
        channel = Channel.objects.get(pk=channel_id, workspace__slug=slug)
        if not self._can_access_channel(channel, request.user):
            return Response({"error": "You do not have permission"}, status=status.HTTP_403_FORBIDDEN)
        if not self._permission_payload(channel, request.user)["current_user_can_post"]:
            return Response({"error": "You do not have permission"}, status=status.HTTP_403_FORBIDDEN)
        serializer = MessageSerializer(data=request.data, context={"channel_id": channel_id})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(channel=channel, sender=request.user, parent_id=message_id, created_by=request.user)
        return Response(MessageSerializer(serializer.instance).data, status=status.HTTP_201_CREATED)


class MessageSearchEndpoint(ChatChannelAccessMixin, BaseAPIView):
    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def get(self, request, slug):
        query = request.GET.get("query", "").strip()
        if not query:
            return Response({"results": []}, status=status.HTTP_200_OK)
        channel_ids = self._accessible_channels(slug, request.user).values_list("id", flat=True)
        queryset = (
            Message.objects.filter(channel_id__in=channel_ids, deleted_at__isnull=True, content__icontains=query)
            .select_related("sender", "issue", "channel")
            .order_by("-created_at")[:50]
        )
        return Response({"results": MessageSerializer(queryset, many=True).data}, status=status.HTTP_200_OK)
