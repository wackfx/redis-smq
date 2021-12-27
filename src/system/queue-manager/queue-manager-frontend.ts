import {
  ICallback,
  IConfig,
  IQueueMetrics,
  TQueueParams,
} from '../../../types';
import { RedisClient } from '../redis-client/redis-client';
import { QueueManager } from './queue-manager';
import BLogger from 'bunyan';
import { Logger } from '../common/logger';
import { EmptyCallbackReplyError } from '../common/errors/empty-callback-reply.error';

export class QueueManagerFrontend {
  private static instance: QueueManagerFrontend | null = null;
  private redisClient: RedisClient;
  private queueManager: QueueManager;

  private constructor(redisClient: RedisClient, logger: BLogger) {
    this.redisClient = redisClient;
    this.queueManager = new QueueManager(redisClient, logger);
  }

  ///

  purgeDeadLetterQueue(queue: TQueueParams, cb: ICallback<void>): void {
    this.queueManager.purgeDeadLetterQueue(queue, cb);
  }

  purgeAcknowledgedMessagesQueue(
    queue: TQueueParams,
    cb: ICallback<void>,
  ): void {
    this.queueManager.purgeAcknowledgedMessagesQueue(queue, cb);
  }

  purgeQueue(queue: TQueueParams, cb: ICallback<void>): void {
    this.queueManager.purgeQueue(queue, cb);
  }

  purgePriorityQueue(queue: TQueueParams, cb: ICallback<void>): void {
    this.queueManager.purgePriorityQueue(queue, cb);
  }

  purgeScheduledMessagesQueue(cb: ICallback<void>): void {
    this.queueManager.purgeScheduledMessagesQueue(cb);
  }

  ///

  getQueueMetrics(queue: TQueueParams, cb: ICallback<IQueueMetrics>): void {
    this.queueManager.getQueueMetrics(queue, cb);
  }

  getMessageQueues(cb: ICallback<TQueueParams[]>): void {
    this.queueManager.getMessageQueues(cb);
  }

  ///

  quit(cb: ICallback<void>): void {
    this.queueManager.quit(() => {
      this.redisClient.halt(() => {
        QueueManagerFrontend.instance = null;
        cb();
      });
    });
  }

  ///

  static getSingletonInstance(
    config: IConfig,
    cb: ICallback<QueueManagerFrontend>,
  ): void {
    if (!QueueManagerFrontend.instance) {
      RedisClient.getNewInstance(config, (err, client) => {
        if (err) cb(err);
        else if (!client) cb(new EmptyCallbackReplyError());
        else {
          const logger = Logger(QueueManagerFrontend.name, config.log);
          const instance = new QueueManagerFrontend(client, logger);
          QueueManagerFrontend.instance = instance;
          cb(null, instance);
        }
      });
    } else cb(null, QueueManagerFrontend.instance);
  }
}
