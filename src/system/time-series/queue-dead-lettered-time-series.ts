import { RedisClient } from '../redis-client/redis-client';
import { redisKeys } from '../common/redis-keys/redis-keys';
import { HashTimeSeries } from '../common/time-series/hash-time-series';
import { TQueueParams } from '../../../types';

export const QueueDeadLetteredTimeSeries = (
  redisClient: RedisClient,
  queue: TQueueParams,
  isMaster?: boolean,
) => {
  const {
    keyRateQueueDeadLettered,
    keyRateQueueDeadLetteredIndex,
    keyRateQueueDeadLetteredLock,
  } = redisKeys.getKeys(queue.name, queue.ns);
  return new HashTimeSeries(
    redisClient,
    keyRateQueueDeadLettered,
    keyRateQueueDeadLetteredIndex,
    keyRateQueueDeadLetteredLock,
    undefined,
    undefined,
    undefined,
    isMaster,
  );
};