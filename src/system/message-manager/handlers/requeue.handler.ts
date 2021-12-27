import { ICallback, TQueueParams } from '../../../../types';
import { redisKeys } from '../../common/redis-keys/redis-keys';
import { getListMessageAtSequenceId } from '../common';
import { Message } from '../../message';
import { Handler } from './handler';
import { EnqueueHandler } from './enqueue.handler';
import { RedisClient } from '../../redis-client/redis-client';
import { EmptyCallbackReplyError } from '../../common/errors/empty-callback-reply.error';

export class RequeueHandler extends Handler {
  protected enqueueHandler: EnqueueHandler;

  constructor(redisClient: RedisClient, enqueueHandler: EnqueueHandler) {
    super(redisClient);
    this.enqueueHandler = enqueueHandler;
  }

  protected requeueListMessage(
    queue: TQueueParams,
    from: string,
    index: number,
    messageId: string,
    withPriority: boolean,
    priority: number | undefined,
    cb: ICallback<void>,
  ): void {
    getListMessageAtSequenceId(
      this.redisClient,
      from,
      index,
      messageId,
      queue,
      (err, msg) => {
        if (err) cb(err);
        else if (!msg) cb(new EmptyCallbackReplyError());
        else {
          const multi = this.redisClient.multi();
          multi.lrem(from, 1, JSON.stringify(msg));
          const message = Message.createFromMessage(msg, true); // resetting all system parameters
          message.setQueue(queue); // do not lose message queue
          if (withPriority && typeof priority !== 'undefined') {
            message.setPriority(priority);
          }
          this.enqueueHandler.enqueue(multi, message, withPriority);
          this.redisClient.execMulti(multi, (err) => cb(err));
        }
      },
    );
  }

  requeueMessageFromDLQueue(
    queue: TQueueParams,
    index: number,
    messageId: string,
    withPriority: boolean,
    priority: number | undefined,
    cb: ICallback<void>,
  ): void {
    const { keyQueueDL } = redisKeys.getKeys(queue.name, queue.ns);
    this.requeueListMessage(
      queue,
      keyQueueDL,
      index,
      messageId,
      withPriority,
      priority,
      cb,
    );
  }

  requeueMessageFromAcknowledgedQueue(
    queue: TQueueParams,
    index: number,
    messageId: string,
    withPriority: boolean,
    priority: number | undefined,
    cb: ICallback<void>,
  ): void {
    const { keyQueueAcknowledgedMessages } = redisKeys.getKeys(
      queue.name,
      queue.ns,
    );
    this.requeueListMessage(
      queue,
      keyQueueAcknowledgedMessages,
      index,
      messageId,
      withPriority,
      priority,
      cb,
    );
  }
}
