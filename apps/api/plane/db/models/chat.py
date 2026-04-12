# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Django imports
from django.conf import settings
from django.db import models
from django.db.models import Q

# Module imports
from plane.utils.html_processor import strip_tags
from .base import BaseModel


class ChannelType(models.TextChoices):
    WORKSPACE_PUBLIC = "WORKSPACE_PUBLIC", "Workspace Public"
    WORKSPACE_PRIVATE = "WORKSPACE_PRIVATE", "Workspace Private"
    PROJECT = "PROJECT", "Project"
    DM = "DM", "Direct Message"
    GROUP_DM = "GROUP_DM", "Group Direct Message"


class ChannelMembershipRole(models.IntegerChoices):
    MEMBER = 15, "Member"
    ADMIN = 20, "Admin"


class UserPresenceStatus(models.TextChoices):
    ONLINE = "ONLINE", "Online"
    AWAY = "AWAY", "Away"
    DND = "DND", "Do Not Disturb"
    OFFLINE = "OFFLINE", "Offline"


class Channel(BaseModel):
    workspace = models.ForeignKey("db.Workspace", related_name="chat_channels", on_delete=models.CASCADE)
    project = models.ForeignKey(
        "db.Project",
        related_name="chat_channels",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    channel_type = models.CharField(max_length=32, choices=ChannelType.choices)
    is_archived = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Channel"
        verbose_name_plural = "Channels"
        db_table = "chat_channels"
        ordering = ("name", "created_at")
        indexes = [
            models.Index(fields=["workspace", "channel_type"], name="chat_channel_workspace_type_idx"),
            models.Index(fields=["project", "channel_type"], name="chat_channel_project_type_idx"),
            models.Index(fields=["workspace", "is_archived"], name="chat_channel_workspace_archive_idx"),
        ]

    def save(self, *args, **kwargs):
        if self.project_id and not self.workspace_id:
            self.workspace_id = self.project.workspace_id
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} <{self.workspace.slug}>"


class ChannelMembership(BaseModel):
    channel = models.ForeignKey(Channel, related_name="memberships", on_delete=models.CASCADE)
    member = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="chat_memberships", on_delete=models.CASCADE)
    role = models.PositiveSmallIntegerField(choices=ChannelMembershipRole.choices, default=ChannelMembershipRole.MEMBER)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Channel Membership"
        verbose_name_plural = "Channel Memberships"
        db_table = "chat_channel_memberships"
        ordering = ("joined_at",)
        constraints = [
            models.UniqueConstraint(
                fields=["channel", "member"],
                condition=Q(deleted_at__isnull=True),
                name="chat_channel_membership_unique_active",
            )
        ]

    def __str__(self):
        return f"{self.member_id} <{self.channel_id}>"


class Message(BaseModel):
    channel = models.ForeignKey(Channel, related_name="messages", on_delete=models.CASCADE)
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="chat_messages", on_delete=models.CASCADE)
    content = models.TextField(blank=True, default="")
    content_json = models.JSONField(blank=True, default=dict)
    content_html = models.TextField(blank=True, default="<p></p>")
    parent = models.ForeignKey(
        "self",
        related_name="thread_replies",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    issue = models.ForeignKey(
        "db.Issue",
        related_name="chat_messages",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    edited_at = models.DateTimeField(null=True, blank=True)
    external_id = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        verbose_name = "Message"
        verbose_name_plural = "Messages"
        db_table = "chat_messages"
        ordering = ("created_at",)
        indexes = [
            models.Index(fields=["channel", "created_at"], name="chat_message_channel_created_idx"),
            models.Index(fields=["parent"], name="chat_message_parent_idx"),
            models.Index(fields=["issue"], name="chat_message_issue_idx"),
        ]

    def save(self, *args, **kwargs):
        if self.content_html and self.content_html != "<p></p>":
            self.content = strip_tags(self.content_html)
        elif self.content:
            self.content_html = self.content_html or f"<p>{self.content}</p>"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.sender_id} <{self.channel_id}>"


class MessageReaction(BaseModel):
    message = models.ForeignKey(Message, related_name="message_reactions", on_delete=models.CASCADE)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="chat_message_reactions", on_delete=models.CASCADE)
    reaction = models.TextField()

    class Meta:
        verbose_name = "Message Reaction"
        verbose_name_plural = "Message Reactions"
        db_table = "chat_message_reactions"
        ordering = ("created_at",)
        constraints = [
            models.UniqueConstraint(
                fields=["message", "actor", "reaction"],
                condition=Q(deleted_at__isnull=True),
                name="chat_message_reaction_unique_active",
            )
        ]

    def __str__(self):
        return f"{self.reaction} <{self.message_id}>"


class MessageAttachment(BaseModel):
    message = models.ForeignKey(Message, related_name="attachments", on_delete=models.CASCADE)
    asset_id = models.UUIDField()
    file_name = models.CharField(max_length=255)
    file_size = models.IntegerField(default=0)
    mime_type = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        verbose_name = "Message Attachment"
        verbose_name_plural = "Message Attachments"
        db_table = "chat_message_attachments"
        ordering = ("created_at",)

    def __str__(self):
        return self.file_name


class ChannelReadState(BaseModel):
    channel = models.ForeignKey(Channel, related_name="read_states", on_delete=models.CASCADE)
    member = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="chat_channel_read_states", on_delete=models.CASCADE)
    last_read_message = models.ForeignKey(
        Message,
        related_name="read_state_last_message",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    last_read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Channel Read State"
        verbose_name_plural = "Channel Read States"
        db_table = "chat_channel_read_states"
        constraints = [
            models.UniqueConstraint(
                fields=["channel", "member"],
                condition=Q(deleted_at__isnull=True),
                name="chat_channel_read_state_unique_active",
            )
        ]

    def __str__(self):
        return f"{self.member_id} <{self.channel_id}>"


class ChannelPinned(BaseModel):
    channel = models.ForeignKey(Channel, related_name="pins", on_delete=models.CASCADE)
    message = models.ForeignKey(Message, related_name="pinned_in_channels", on_delete=models.CASCADE)

    class Meta:
        verbose_name = "Channel Pin"
        verbose_name_plural = "Channel Pins"
        db_table = "chat_channel_pins"
        constraints = [
            models.UniqueConstraint(
                fields=["channel", "message"],
                condition=Q(deleted_at__isnull=True),
                name="chat_channel_pin_unique_active",
            )
        ]

    def __str__(self):
        return f"{self.channel_id} <{self.message_id}>"


class UserPresence(BaseModel):
    workspace = models.ForeignKey("db.Workspace", related_name="chat_user_presences", on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="chat_presences", on_delete=models.CASCADE)
    status = models.CharField(max_length=16, choices=UserPresenceStatus.choices, default=UserPresenceStatus.OFFLINE)
    last_seen = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "User Presence"
        verbose_name_plural = "User Presences"
        db_table = "chat_user_presences"
        constraints = [
            models.UniqueConstraint(
                fields=["workspace", "user"],
                condition=Q(deleted_at__isnull=True),
                name="chat_user_presence_unique_active",
            )
        ]
        indexes = [models.Index(fields=["workspace", "status"], name="chat_presence_workspace_status_idx")]

    def __str__(self):
        return f"{self.user_id} <{self.workspace_id}>"
