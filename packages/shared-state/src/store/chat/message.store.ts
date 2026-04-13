/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { action, makeObservable, observable } from "mobx";
import { computedFn } from "mobx-utils";
import type { TMessage, TMessageAttachment, TMessagePaginatedResponse } from "@plane/types";
import { MessageService } from "@plane/services";

const mergeMessages = (existing: TMessage[], incoming: TMessage[]) => {
  const map = new Map(existing.map((message) => [message.id, message]));
  incoming.forEach((message) => map.set(message.id, message));
  return [...map.values()].toSorted((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
};

export interface IMessageStore {
  channelMessages: Map<string, TMessage[]>;
  threadMessages: Map<string, TMessage[]>;
  messagePagination: Map<string, Omit<TMessagePaginatedResponse, "results">>;
  replyingTo: TMessage | null;
  editingMessageId: string | null;
  fetchMessages: (workspaceSlug: string, channelId: string, cursor?: string) => Promise<TMessagePaginatedResponse>;
  sendMessage: (
    workspaceSlug: string,
    channelId: string,
    data: Partial<TMessage> & { attachment_payloads?: TMessageAttachment[] }
  ) => Promise<TMessage>;
  editMessage: (
    workspaceSlug: string,
    channelId: string,
    messageId: string,
    data: Partial<TMessage>
  ) => Promise<TMessage>;
  deleteMessage: (workspaceSlug: string, channelId: string, messageId: string) => Promise<void>;
  fetchThread: (workspaceSlug: string, channelId: string, messageId: string) => Promise<TMessage[]>;
  sendThreadReply: (
    workspaceSlug: string,
    channelId: string,
    messageId: string,
    data: Partial<TMessage> & { attachment_payloads?: TMessageAttachment[] }
  ) => Promise<TMessage>;
  getMessages: (channelId: string) => TMessage[];
  upsertMessage: (message: TMessage) => void;
  removeMessage: (channelId: string, messageId: string) => void;
  setReplyingTo: (message: TMessage | null) => void;
  clearReplyingTo: () => void;
  setEditingMessageId: (id: string | null) => void;
  clearEditingMessageId: () => void;
}

export class MessageStore implements IMessageStore {
  channelMessages = new Map<string, TMessage[]>();
  threadMessages = new Map<string, TMessage[]>();
  messagePagination = new Map<string, Omit<TMessagePaginatedResponse, "results">>();
  replyingTo: TMessage | null = null;
  editingMessageId: string | null = null;
  private readonly service = new MessageService();

  constructor() {
    makeObservable(this, {
      channelMessages: observable,
      threadMessages: observable,
      messagePagination: observable,
      replyingTo: observable.ref,
      editingMessageId: observable.ref,
      fetchMessages: action,
      sendMessage: action,
      editMessage: action,
      deleteMessage: action,
      fetchThread: action,
      sendThreadReply: action,
      upsertMessage: action,
      removeMessage: action,
      setReplyingTo: action,
      clearReplyingTo: action,
      setEditingMessageId: action,
      clearEditingMessageId: action,
    });
  }

  getMessages = computedFn((channelId: string) => this.channelMessages.get(channelId) ?? []);

  setReplyingTo = (message: TMessage | null) => {
    this.replyingTo = message;
  };

  clearReplyingTo = () => {
    this.replyingTo = null;
  };

  setEditingMessageId = (id: string | null) => {
    this.editingMessageId = id;
  };

  clearEditingMessageId = () => {
    this.editingMessageId = null;
  };

  fetchMessages = async (workspaceSlug: string, channelId: string, cursor?: string) => {
    const response = await this.service.list(workspaceSlug, channelId, cursor);
    const existing = cursor ? (this.channelMessages.get(channelId) ?? []) : [];
    this.channelMessages.set(channelId, mergeMessages(existing, response.results));
    const { results: _, ...pagination } = response;
    this.messagePagination.set(channelId, pagination);
    return response;
  };

  sendMessage = async (
    workspaceSlug: string,
    channelId: string,
    data: Partial<TMessage> & { attachment_payloads?: TMessageAttachment[] }
  ) => {
    const message = await this.service.create(workspaceSlug, channelId, data);
    this.upsertMessage(message);
    return message;
  };

  editMessage = async (workspaceSlug: string, channelId: string, messageId: string, data: Partial<TMessage>) => {
    const message = await this.service.update(workspaceSlug, channelId, messageId, data);
    this.upsertMessage(message);
    return message;
  };

  deleteMessage = async (workspaceSlug: string, channelId: string, messageId: string) => {
    await this.service.destroy(workspaceSlug, channelId, messageId);
    this.removeMessage(channelId, messageId);
  };

  fetchThread = async (workspaceSlug: string, channelId: string, messageId: string) => {
    const messages = await this.service.fetchThread(workspaceSlug, channelId, messageId);
    this.threadMessages.set(messageId, messages);
    return messages;
  };

  sendThreadReply = async (
    workspaceSlug: string,
    channelId: string,
    messageId: string,
    data: Partial<TMessage> & { attachment_payloads?: TMessageAttachment[] }
  ) => {
    const message = await this.service.sendThreadReply(workspaceSlug, channelId, messageId, data);
    const existingThread = this.threadMessages.get(messageId) ?? [];
    this.threadMessages.set(messageId, mergeMessages(existingThread, [message]));
    return message;
  };

  upsertMessage = (message: TMessage) => {
    const existing = this.channelMessages.get(message.channel) ?? [];
    this.channelMessages.set(message.channel, mergeMessages(existing, [message]));
    if (message.parent) {
      const thread = this.threadMessages.get(message.parent) ?? [];
      this.threadMessages.set(message.parent, mergeMessages(thread, [message]));
    }
  };

  removeMessage = (channelId: string, messageId: string) => {
    const existing = this.channelMessages.get(channelId) ?? [];
    const messageIndex = existing.findIndex((message) => message.id === messageId);
    if (messageIndex === -1) return;
    const updatedMessage = Object.assign({}, existing[messageIndex], { deleted_at: new Date().toISOString() });
    this.channelMessages.set(channelId, existing.with(messageIndex, updatedMessage));
  };
}
