# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from django.urls import path

from plane.app.views import (
    ChannelMembershipViewSet,
    ChannelPinnedViewSet,
    ChannelPermissionsEndpoint,
    ChannelReadStateEndpoint,
    ChannelViewSet,
    DMChannelEndpoint,
    MessageReactionViewSet,
    MessageSearchEndpoint,
    MessageViewSet,
    ThreadMessageViewSet,
    UserPresenceEndpoint,
)

urlpatterns = [
    path(
        "workspaces/<str:slug>/channels/",
        ChannelViewSet.as_view({"get": "list", "post": "create"}),
        name="chat-channels",
    ),
    path(
        "workspaces/<str:slug>/channels/search/messages/",
        MessageSearchEndpoint.as_view(),
        name="chat-message-search",
    ),
    path(
        "workspaces/<str:slug>/channels/dms/",
        DMChannelEndpoint.as_view(),
        name="chat-dms",
    ),
    path(
        "workspaces/<str:slug>/channels/<uuid:pk>/",
        ChannelViewSet.as_view({"get": "retrieve", "patch": "partial_update", "delete": "destroy"}),
        name="chat-channel-detail",
    ),
    path(
        "workspaces/<str:slug>/channels/<uuid:channel_id>/members/",
        ChannelMembershipViewSet.as_view({"get": "list", "post": "create"}),
        name="chat-channel-members",
    ),
    path(
        "workspaces/<str:slug>/channels/<uuid:channel_id>/members/<uuid:member_id>/",
        ChannelMembershipViewSet.as_view({"patch": "partial_update", "delete": "destroy"}),
        name="chat-channel-members-detail",
    ),
    path(
        "workspaces/<str:slug>/channels/<uuid:channel_id>/permissions/",
        ChannelPermissionsEndpoint.as_view(),
        name="chat-channel-permissions",
    ),
    path(
        "workspaces/<str:slug>/channels/<uuid:channel_id>/messages/",
        MessageViewSet.as_view({"get": "list", "post": "create"}),
        name="chat-messages",
    ),
    path(
        "workspaces/<str:slug>/channels/<uuid:channel_id>/messages/<uuid:pk>/",
        MessageViewSet.as_view({"get": "retrieve", "patch": "partial_update", "delete": "destroy"}),
        name="chat-message-detail",
    ),
    path(
        "workspaces/<str:slug>/channels/<uuid:channel_id>/messages/<uuid:message_id>/threads/",
        ThreadMessageViewSet.as_view(),
        name="chat-message-thread",
    ),
    path(
        "workspaces/<str:slug>/channels/<uuid:channel_id>/messages/<uuid:message_id>/reactions/",
        MessageReactionViewSet.as_view({"get": "list", "post": "create"}),
        name="chat-message-reactions",
    ),
    path(
        "workspaces/<str:slug>/channels/<uuid:channel_id>/messages/<uuid:message_id>/reactions/<str:reaction_code>/",
        MessageReactionViewSet.as_view({"delete": "destroy"}),
        name="chat-message-reaction-detail",
    ),
    path(
        "workspaces/<str:slug>/channels/<uuid:channel_id>/read-state/",
        ChannelReadStateEndpoint.as_view(),
        name="chat-channel-read-state",
    ),
    path(
        "workspaces/<str:slug>/channels/<uuid:channel_id>/pins/",
        ChannelPinnedViewSet.as_view({"get": "list", "post": "create"}),
        name="chat-channel-pins",
    ),
    path(
        "workspaces/<str:slug>/channels/<uuid:channel_id>/pins/<uuid:pk>/",
        ChannelPinnedViewSet.as_view({"delete": "destroy"}),
        name="chat-channel-pin-detail",
    ),
    path(
        "workspaces/<str:slug>/presence/",
        UserPresenceEndpoint.as_view(),
        name="chat-presence",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/channels/",
        ChannelViewSet.as_view({"get": "list", "post": "create"}),
        name="project-chat-channels",
    ),
]
