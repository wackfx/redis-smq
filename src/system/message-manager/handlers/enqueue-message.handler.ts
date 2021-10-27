import { Message } from '../../../message';
import { ICallback, TGetAcknowledgedMessagesReply } from '../../../../types';
import { redisKeys } from '../../redis-keys';
import { RedisClient } from '../../redis-client/redis-client';
import {
  deleteListMessageAtIndex,
  deleteSortedSetMessageAtIndex,
  getPaginatedListMessages,
  getPaginatedSortedSetMessages,
} from '../common';

export class EnqueueMessageHandler {
  getAcknowledgedMessages(
    redisClient: RedisClient,
    queueName: string,
    skip: number,
    take: number,
    cb: ICallback<TGetAcknowledgedMessagesReply>,
  ): void {
    const { keyQueueAcknowledgedMessages } = redisKeys.getKeys(queueName);
    getPaginatedListMessages(
      redisClient,
      keyQueueAcknowledgedMessages,
      skip,
      take,
      cb,
    );
  }

  getDeadLetterMessages(
    redisClient: RedisClient,
    queueName: string,
    skip: number,
    take: number,
    cb: ICallback<TGetAcknowledgedMessagesReply>,
  ): void {
    const { keyQueueDL } = redisKeys.getKeys(queueName);
    getPaginatedListMessages(redisClient, keyQueueDL, skip, take, cb);
  }

  getPendingMessages(
    redisClient: RedisClient,
    queueName: string,
    skip: number,
    take: number,
    cb: ICallback<TGetAcknowledgedMessagesReply>,
  ): void {
    const { keyQueue } = redisKeys.getKeys(queueName);
    getPaginatedListMessages(redisClient, keyQueue, skip, take, cb);
  }

  getPendingMessagesWithPriority(
    redisClient: RedisClient,
    queueName: string,
    skip: number,
    take: number,
    cb: ICallback<TGetAcknowledgedMessagesReply>,
  ): void {
    const { keyQueuePriority } = redisKeys.getKeys(queueName);
    getPaginatedSortedSetMessages(
      redisClient,
      keyQueuePriority,
      skip,
      take,
      cb,
    );
  }

  deletePendingMessage(
    redisClient: RedisClient,
    queueName: string,
    index: number,
    messageId: string,
    cb: ICallback<void>,
  ): void {
    const { keyQueue } = redisKeys.getKeys(queueName);
    deleteListMessageAtIndex(redisClient, keyQueue, index, messageId, cb);
  }

  deletePendingMessageWithPriority(
    redisClient: RedisClient,
    queueName: string,
    index: number,
    messageId: string,
    cb: ICallback<void>,
  ): void {
    const { keyQueuePriority } = redisKeys.getKeys(queueName);
    deleteSortedSetMessageAtIndex(
      redisClient,
      keyQueuePriority,
      index,
      messageId,
      cb,
    );
  }

  enqueue(
    redisClient: RedisClient,
    queueName: string,
    message: Message,
    withPriority: boolean,
    cb: ICallback<void>,
  ): void {
    const { keyQueue, keyQueuePriority } = redisKeys.getKeys(queueName);
    const priority = withPriority ? message.getSetPriority(undefined) : null;
    if (typeof priority === 'number') {
      redisClient.zadd(
        keyQueuePriority,
        priority,
        JSON.stringify(message),
        (err) => cb(err),
      );
    } else {
      redisClient.lpush(keyQueue, JSON.stringify(message), (err) => cb(err));
    }
  }
}
