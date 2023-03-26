import { TConsumerInfo, TQueueParams } from '../../../types';
import { redisKeys } from '../../common/redis-keys/redis-keys';
import { async, RedisClient } from 'redis-smq-common';
import { ICallback, IRedisClientMulti } from 'redis-smq-common/dist/types';

export const consumerQueues = {
  removeConsumer(
    multi: IRedisClientMulti,
    queue: TQueueParams,
    consumerId: string,
  ): void {
    const { keyQueueConsumers, keyConsumerQueues } =
      redisKeys.getQueueConsumerKeys(queue, consumerId);
    multi.hdel(keyQueueConsumers, consumerId);
    multi.srem(keyConsumerQueues, JSON.stringify(queue));
  },

  getQueueConsumers(
    client: RedisClient,
    queue: TQueueParams,
    transform: boolean,
    cb: ICallback<Record<string, TConsumerInfo | string>>,
  ): void {
    const { keyQueueConsumers } = redisKeys.getQueueKeys(queue);
    client.hgetall(keyQueueConsumers, (err, reply) => {
      if (err) cb(err);
      else {
        const consumers = reply ?? {};
        if (transform) {
          const data: Record<string | number, TConsumerInfo> = {};
          async.eachIn(
            consumers,
            (item, key, done) => {
              data[key] = JSON.parse(item);
              done();
            },
            () => cb(null, data),
          );
        } else cb(null, consumers);
      }
    });
  },

  getQueueConsumerIds(
    client: RedisClient,
    queue: TQueueParams,
    cb: ICallback<string[]>,
  ): void {
    const { keyQueueConsumers } = redisKeys.getQueueKeys(queue);
    client.hkeys(keyQueueConsumers, cb);
  },

  countQueueConsumers(
    client: RedisClient,
    queue: TQueueParams,
    cb: ICallback<number>,
  ): void {
    const { keyQueueConsumers } = redisKeys.getQueueKeys(queue);
    client.hlen(keyQueueConsumers, cb);
  },

  getConsumerQueues(
    client: RedisClient,
    consumerId: string,
    cb: ICallback<TQueueParams[]>,
  ): void {
    const { keyConsumerQueues } = redisKeys.getConsumerKeys(consumerId);
    client.smembers(keyConsumerQueues, (err, reply) => {
      if (err) cb(err);
      else {
        const queues: TQueueParams[] = (reply ?? []).map((i) => JSON.parse(i));
        cb(null, queues);
      }
    });
  },
};
