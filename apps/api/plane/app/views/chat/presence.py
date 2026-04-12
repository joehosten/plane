# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Third Party imports
from rest_framework import status
from rest_framework.response import Response

# Module imports
from plane.app.permissions import ROLE, allow_permission
from plane.app.serializers import UserPresenceSerializer
from plane.app.views.base import BaseAPIView
from plane.db.models import UserPresence, Workspace


class UserPresenceEndpoint(BaseAPIView):
    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def get(self, request, slug):
        queryset = UserPresence.objects.filter(workspace__slug=slug, deleted_at__isnull=True).select_related("user")
        return Response(UserPresenceSerializer(queryset, many=True).data, status=status.HTTP_200_OK)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def post(self, request, slug):
        workspace = Workspace.objects.get(slug=slug)
        presence, _ = UserPresence.objects.get_or_create(workspace=workspace, user=request.user)
        serializer = UserPresenceSerializer(presence, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(workspace=workspace, user=request.user, updated_by=request.user)
        return Response(UserPresenceSerializer(serializer.instance).data, status=status.HTTP_200_OK)
