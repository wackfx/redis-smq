/*
 * Copyright (c)
 * Weyoss <weyoss@protonmail.com>
 * https://github.com/weyoss
 *
 * This source code is licensed under the MIT license found in the LICENSE file
 * in the root directory of this source tree.
 */

import { _getCommonRedisClient } from '../../../common/_get-common-redis-client';
import { async, CallbackEmptyReplyError, ICallback } from 'redis-smq-common';
import { QueueMessagesPaginatorAbstract } from './queue-messages-paginator-abstract';
import { redisKeys } from '../../../common/redis-keys/redis-keys';
import { ELuaScriptName } from '../../../common/redis-client/redis-client';
import {
  EMessageProperty,
  EMessagePropertyStatus,
  EQueueProperty,
  EQueueType,
  IQueueMessagesPage,
  IQueueParams,
} from '../../../../types';
import { QueueMessageRequeueError } from '../errors';
import { _getMessage } from '../../message/_get-message';

export abstract class QueueMessagesPaginatorList extends QueueMessagesPaginatorAbstract {
  countMessages(queue: string | IQueueParams, cb: ICallback<number>): void {
    _getCommonRedisClient((err, client) => {
      if (err) cb(err);
      else if (!client) cb(new CallbackEmptyReplyError());
      else {
        const key = this.getRedisKey(queue);
        client.llen(key, cb);
      }
    });
  }

  protected getMessagesIds(
    queue: string | IQueueParams,
    cursor: number,
    pageSize: number,
    cb: ICallback<IQueueMessagesPage<string>>,
  ): void {
    async.waterfall(
      [
        (cb: ICallback<number>) => this.countMessages(queue, cb),
        (totalItems: number, cb: ICallback<IQueueMessagesPage<string>>) => {
          _getCommonRedisClient((err, client) => {
            if (err) cb(err);
            else if (!client) cb(new CallbackEmptyReplyError());
            else {
              const { currentPage, offsetStart, offsetEnd, totalPages } =
                this.getPaginationParams(cursor, totalItems, pageSize);
              const next = currentPage < totalPages ? currentPage + 1 : 0;
              if (!totalItems)
                cb(null, {
                  cursor: next,
                  totalItems,
                  items: [],
                });
              else {
                const key = this.getRedisKey(queue);
                client.lrange(key, offsetStart, offsetEnd, (err, items) => {
                  if (err) cb(err);
                  else {
                    cb(null, {
                      cursor: next,
                      totalItems,
                      items: items ?? [],
                    });
                  }
                });
              }
            }
          });
        },
      ],
      cb,
    );
  }

  requeueMessage(
    source: string | IQueueParams,
    id: string,
    cb: ICallback<void>,
  ): void {
    _getCommonRedisClient((err, client) => {
      if (err) cb(err);
      else if (!client) cb(new CallbackEmptyReplyError());
      else {
        _getMessage(client, id, (err, message) => {
          if (err) cb(err);
          else if (!message) cb(new CallbackEmptyReplyError());
          else {
            const queue = message.getDestinationQueue();
            message.getRequiredMessageState().reset(); // resetting all system parameters
            const {
              keyQueueProperties,
              keyQueuePending,
              keyPriorityQueuePending,
            } = redisKeys.getQueueKeys(queue);
            const messageId = message.getRequiredId();
            const { keyMessage } = redisKeys.getMessageKeys(messageId);
            const sourceKey = this.getRedisKey(source);
            client.runScript(
              ELuaScriptName.REQUEUE_MESSAGE,
              [
                sourceKey,
                keyQueueProperties,
                keyPriorityQueuePending,
                keyQueuePending,
                keyMessage,
              ],
              [
                EQueueProperty.QUEUE_TYPE,
                EQueueType.PRIORITY_QUEUE,
                EQueueType.LIFO_QUEUE,
                EQueueType.FIFO_QUEUE,
                EMessageProperty.STATUS,
                EMessagePropertyStatus.PENDING,
                EMessageProperty.STATE,
                messageId,
                message.getPriority() ?? '',
                JSON.stringify(message.getRequiredMessageState()),
              ],
              (err, reply) => {
                if (err) cb(err);
                else if (!reply) cb(new QueueMessageRequeueError());
                else cb();
              },
            );
          }
        });
      }
    });
  }
}
