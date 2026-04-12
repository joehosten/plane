# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Django imports
from django.db.models import Count
from django.utils import timezone

# Third Party imports
from rest_framework import serializers

# Module imports
from .base import BaseSerializer
from .user import UserLiteSerializer
from plane.db.models import (
    Channel,
    ChannelMembership,
    ChannelPinned,
    ChannelReadState,
    Issue,
    Message,
    MessageAttachment,
    MessageReaction,
    User,
    UserPresence,
)


class MessageAttachmentSerializer(BaseSerializer):
    class Meta:
        model = MessageAttachment
        fields = ["id", "message", "asset_id", "file_name", "file_size", "mime_type"]
        read_only_fields = ["id", "message"]


class MessageReactionSerializer(BaseSerializer):
    actor_detail = UserLiteSerializer(source="actor", read_only=True)

    class Meta:
        model = MessageReaction
        fields = ["id", "message", "actor", "actor_detail", "reaction", "created_at"]
        read_only_fields = ["id", "message", "actor", "actor_detail", "created_at"]


class ChannelMembershipSerializer(BaseSerializer):
    member_detail = UserLiteSerializer(source="member", read_only=True)

    class Meta:
        model = ChannelMembership
        fields = ["id", "channel", "member", "member_detail", "role", "joined_at"]
        read_only_fields = ["id", "channel", "joined_at", "member_detail"]


class ChannelSerializer(BaseSerializer):
    created_by_detail = UserLiteSerializer(source="created_by", read_only=True)
    member_count = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    last_message_at = serializers.SerializerMethodField()
    member_ids = serializers.ListField(
        child=serializers.PrimaryKeyRelatedField(queryset=User.objects.all()),
        write_only=True,
        required=False,
    )

    class Meta:
        model = Channel
        fields = [
            "id",
            "workspace",
            "project",
            "name",
            "description",
            "channel_type",
            "is_archived",
            "created_by",
            "created_by_detail",
            "created_at",
            "updated_at",
            "member_count",
            "unread_count",
            "last_message_at",
            "member_ids",
        ]
        read_only_fields = [
            "id",
            "workspace",
            "created_by",
            "created_by_detail",
            "created_at",
            "updated_at",
            "member_count",
            "unread_count",
            "last_message_at",
        ]

    def validate(self, attrs):
        project_id = self.context.get("project_id")
        channel_type = attrs.get("channel_type", getattr(self.instance, "channel_type", None))
        if project_id and channel_type != "PROJECT":
            raise serializers.ValidationError({"channel_type": "Project scoped channels must use PROJECT type."})
        if channel_type == "PROJECT" and not project_id and not attrs.get("project"):
            raise serializers.ValidationError({"project": "Project channels require a project."})
        return attrs

    def create(self, validated_data):
        member_ids = validated_data.pop("member_ids", [])
        channel = Channel.objects.create(**validated_data)
        ChannelMembership.objects.get_or_create(
            channel=channel,
            member_id=channel.created_by_id,
            defaults={"role": 20, "created_by_id": channel.created_by_id},
        )
        for member in member_ids:
            if member.id == channel.created_by_id:
                continue
            ChannelMembership.objects.get_or_create(
                channel=channel,
                member=member,
                defaults={"role": 15, "created_by_id": channel.created_by_id},
            )
        return channel

    def get_member_count(self, obj):
        return getattr(obj, "member_count", None) or obj.memberships.count()

    def get_unread_count(self, obj):
        return getattr(obj, "unread_count", 0) or 0

    def get_last_message_at(self, obj):
        last_message_at = getattr(obj, "last_message_at", None)
        if last_message_at:
            return last_message_at
        last_message = obj.messages.order_by("-created_at").only("created_at").first()
        return last_message.created_at if last_message else None


class ChannelReadStateSerializer(BaseSerializer):
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = ChannelReadState
        fields = ["id", "channel", "member", "last_read_message", "last_read_at", "unread_count"]
        read_only_fields = ["id", "channel", "member", "unread_count"]

    def get_unread_count(self, obj):
        if not obj.channel_id:
            return 0
        queryset = obj.channel.messages.filter(deleted_at__isnull=True)
        if obj.last_read_at:
            queryset = queryset.filter(created_at__gt=obj.last_read_at)
        return queryset.count()


class MessageSerializer(BaseSerializer):
    sender_detail = UserLiteSerializer(source="sender", read_only=True)
    reactions = serializers.SerializerMethodField()
    attachments = MessageAttachmentSerializer(many=True, read_only=True)
    issue_detail = serializers.SerializerMethodField()
    thread_count = serializers.SerializerMethodField()
    issue_id = serializers.PrimaryKeyRelatedField(source="issue", queryset=Issue.objects.all(), allow_null=True, required=False)
    parent_id = serializers.PrimaryKeyRelatedField(source="parent", queryset=Message.objects.all(), allow_null=True, required=False)
    attachment_payloads = MessageAttachmentSerializer(many=True, write_only=True, required=False, source="attachments")

    class Meta:
        model = Message
        fields = [
            "id",
            "channel",
            "sender",
            "sender_detail",
            "content",
            "content_json",
            "content_html",
            "parent",
            "parent_id",
            "thread_count",
            "issue",
            "issue_id",
            "issue_detail",
            "reactions",
            "attachments",
            "attachment_payloads",
            "edited_at",
            "deleted_at",
            "external_id",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "channel",
            "sender",
            "sender_detail",
            "thread_count",
            "issue_detail",
            "reactions",
            "attachments",
            "edited_at",
            "deleted_at",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        parent = attrs.get("parent")
        channel_id = self.context.get("channel_id")
        if parent and channel_id and str(parent.channel_id) != str(channel_id):
            raise serializers.ValidationError({"parent_id": "Parent message must belong to the same channel."})
        return attrs

    def create(self, validated_data):
        attachments = validated_data.pop("attachments", [])
        message = Message.objects.create(**validated_data)
        for attachment in attachments:
            MessageAttachment.objects.create(message=message, **attachment)
        return message

    def update(self, instance, validated_data):
        attachments = validated_data.pop("attachments", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if any(field in validated_data for field in ["content", "content_json", "content_html"]):
            instance.edited_at = timezone.now()
        instance.save()
        if attachments is not None:
            instance.attachments.all().delete()
            for attachment in attachments:
                MessageAttachment.objects.create(message=instance, **attachment)
        return instance

    def get_reactions(self, obj):
        aggregated = (
            obj.message_reactions.filter(deleted_at__isnull=True)
            .values("reaction")
            .annotate(count=Count("id"))
            .order_by("reaction")
        )
        return list(aggregated)

    def get_issue_detail(self, obj):
        if not obj.issue_id:
            return None
        issue = obj.issue
        return {
            "id": str(issue.id),
            "name": issue.name,
            "project_id": str(issue.project_id),
            "sequence_id": issue.sequence_id,
        }

    def get_thread_count(self, obj):
        return getattr(obj, "thread_count", None) or obj.thread_replies.filter(deleted_at__isnull=True).count()


class ChannelPinnedSerializer(BaseSerializer):
    message_detail = MessageSerializer(source="message", read_only=True)

    class Meta:
        model = ChannelPinned
        fields = ["id", "channel", "message", "message_detail", "created_at"]
        read_only_fields = ["id", "channel", "message_detail", "created_at"]


class UserPresenceSerializer(BaseSerializer):
    user_detail = UserLiteSerializer(source="user", read_only=True)

    class Meta:
        model = UserPresence
        fields = ["id", "workspace", "user", "user_detail", "status", "last_seen"]
        read_only_fields = ["id", "workspace", "user", "user_detail", "last_seen"]
