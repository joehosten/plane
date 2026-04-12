# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Django imports
from django.db import IntegrityError

# Third Party imports
from rest_framework import status
from rest_framework.response import Response

# Module imports
from plane.app.permissions import ROLE, allow_permission
from plane.app.serializers import MessageReactionSerializer
from plane.db.models import Channel, Message, MessageReaction

from .. import BaseViewSet
from .channel import ChatChannelAccessMixin


class MessageReactionViewSet(ChatChannelAccessMixin, BaseViewSet):
    serializer_class = MessageReactionSerializer
    model = MessageReaction

    def get_queryset(self):
        return MessageReaction.objects.filter(message_id=self.kwargs.get("message_id"), deleted_at__isnull=True)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def list(self, request, slug, channel_id, message_id):
        channel = Channel.objects.get(pk=channel_id, workspace__slug=slug)
        if not self._can_access_channel(channel, request.user):
            return Response({"error": "You do not have permission"}, status=status.HTTP_403_FORBIDDEN)
        return Response(MessageReactionSerializer(self.get_queryset(), many=True).data, status=status.HTTP_200_OK)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def create(self, request, slug, channel_id, message_id):
        channel = Channel.objects.get(pk=channel_id, workspace__slug=slug)
        if not self._can_access_channel(channel, request.user):
            return Response({"error": "You do not have permission"}, status=status.HTTP_403_FORBIDDEN)
        message = Message.objects.get(pk=message_id, channel=channel, deleted_at__isnull=True)
        serializer = MessageReactionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            serializer.save(message=message, actor=request.user, created_by=request.user)
        except IntegrityError:
            return Response({"error": "Reaction already exists for the user"}, status=status.HTTP_400_BAD_REQUEST)
        return Response(MessageReactionSerializer(serializer.instance).data, status=status.HTTP_201_CREATED)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def destroy(self, request, slug, channel_id, message_id, reaction_code):
        channel = Channel.objects.get(pk=channel_id, workspace__slug=slug)
        if not self._can_access_channel(channel, request.user):
            return Response({"error": "You do not have permission"}, status=status.HTTP_403_FORBIDDEN)
        reaction = MessageReaction.objects.get(
            message_id=message_id,
            message__channel=channel,
            reaction=reaction_code,
            actor=request.user,
            deleted_at__isnull=True,
        )
        reaction.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
