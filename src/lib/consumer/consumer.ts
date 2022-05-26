import {
  TConsumerMessageHandler,
  TConsumerRedisKeys,
  TConsumerInfo,
  TQueueParams,
  IConfig,
} from '../../../types';
import { events } from '../../common/events/events';
import { redisKeys } from '../../common/redis-keys/redis-keys';
import { ConsumerHeartbeat } from './consumer-heartbeat';
import { Base } from '../base';
import { consumerQueues } from './consumer-queues';
import { MessageHandlerRunner } from './consumer-message-handler/message-handler-runner';
import { MultiplexedMessageHandlerRunner } from './consumer-message-handler/multiplexed-message-handler/multiplexed-message-handler-runner';
import { Queue } from '../queue-manager/queue';
import {
  errors,
  RedisClient,
  WorkerRunner,
  WorkerPool,
  logger,
} from 'redis-smq-common';
import { ICallback, TUnaryFunction } from 'redis-smq-common/dist/types';
import DelayWorker from '../../workers/delay.worker';
import HeartbeatMonitorWorker from '../../workers/heartbeat-monitor.worker';
import RequeueWorker from '../../workers/requeue.worker';
import ScheduleWorker from '../../workers/schedule.worker';

export class Consumer extends Base {
  private readonly redisKeys: TConsumerRedisKeys;
  private readonly messageHandlerRunner: MessageHandlerRunner;
  private heartbeat: ConsumerHeartbeat | null = null;
  private workerRunner: WorkerRunner | null = null;

  constructor(config: IConfig = {}, useMultiplexing = false) {
    super(config);
    const nsLogger = logger.getNamespacedLogger(
      this.config.logger,
      `consumer:${this.id}:message-handler`,
    );
    this.messageHandlerRunner = useMultiplexing
      ? new MultiplexedMessageHandlerRunner(this, nsLogger)
      : new MessageHandlerRunner(this, nsLogger);
    this.redisKeys = redisKeys.getConsumerKeys(this.getId());
  }

  private setUpHeartbeat = (cb: ICallback<void>): void => {
    RedisClient.getNewInstance(this.config.redis, (err, redisClient) => {
      if (err) cb(err);
      else if (!redisClient) cb(new errors.EmptyCallbackReplyError());
      else {
        this.heartbeat = new ConsumerHeartbeat(this, redisClient);
        this.heartbeat.on(events.ERROR, (err: Error) =>
          this.emit(events.ERROR, err),
        );
        this.heartbeat.once(events.TICK, () => cb());
      }
    });
  };

  private tearDownHeartbeat = (cb: ICallback<void>): void => {
    if (this.heartbeat) {
      this.heartbeat.quit(() => {
        this.heartbeat = null;
        cb();
      });
    } else cb();
  };

  private setUpConsumerWorkers = (cb: ICallback<void>): void => {
    const redisClient = this.getSharedRedisClient();
    const { keyLockConsumerWorkersRunner } = this.getRedisKeys();
    const nsLogger = logger.getNamespacedLogger(
      this.config.logger,
      `consumer:${this.id}:worker-runner`,
    );
    this.workerRunner = new WorkerRunner(
      redisClient,
      keyLockConsumerWorkersRunner,
      new WorkerPool(),
      nsLogger,
    );
    this.workerRunner.on(events.ERROR, (err: Error) =>
      this.emit(events.ERROR, err),
    );
    this.workerRunner.once(events.UP, cb);
    this.workerRunner.addWorker(new DelayWorker(redisClient, true));
    this.workerRunner.addWorker(
      new HeartbeatMonitorWorker(redisClient, this.config, true),
    );
    this.workerRunner.addWorker(new RequeueWorker(redisClient, true));
    this.workerRunner.addWorker(new ScheduleWorker(redisClient, true));
    this.workerRunner.run();
  };

  private tearDownConsumerWorkers = (cb: ICallback<void>): void => {
    if (this.workerRunner) {
      this.workerRunner.quit(() => {
        this.workerRunner = null;
        cb();
      });
    } else cb();
  };

  private runMessageHandlers = (cb: ICallback<void>): void => {
    const redisClient = this.getSharedRedisClient();
    this.messageHandlerRunner.run(redisClient, cb);
  };

  private shutdownMessageHandlers = (cb: ICallback<void>): void => {
    if (this.messageHandlerRunner) {
      this.messageHandlerRunner.shutdown(cb);
    } else cb();
  };

  protected override goingUp(): TUnaryFunction<ICallback<void>>[] {
    return super
      .goingUp()
      .concat([
        this.setUpHeartbeat,
        this.runMessageHandlers,
        this.setUpConsumerWorkers,
      ]);
  }

  protected override goingDown(): TUnaryFunction<ICallback<void>>[] {
    return [
      this.tearDownConsumerWorkers,
      this.shutdownMessageHandlers,
      this.tearDownHeartbeat,
    ].concat(super.goingDown());
  }

  consume(
    queue: string | TQueueParams,
    messageHandler: TConsumerMessageHandler,
    cb: ICallback<void>,
  ): void {
    const queueParams = Queue.getParams(this.config, queue);
    this.messageHandlerRunner.addMessageHandler(
      queueParams,
      messageHandler,
      cb,
    );
  }

  cancel(queue: string | TQueueParams, cb: ICallback<void>): void {
    const queueParams = Queue.getParams(this.config, queue);
    this.messageHandlerRunner.removeMessageHandler(queueParams, cb);
  }

  getQueues(): TQueueParams[] {
    return this.messageHandlerRunner.getQueues();
  }

  getRedisKeys(): TConsumerRedisKeys {
    return this.redisKeys;
  }

  static getOnlineConsumers(
    redisClient: RedisClient,
    queue: TQueueParams,
    transform = false,
    cb: ICallback<Record<string, TConsumerInfo | string>>,
  ): void {
    consumerQueues.getQueueConsumers(redisClient, queue, transform, cb);
  }

  static getOnlineConsumerIds(
    redisClient: RedisClient,
    queue: TQueueParams,
    cb: ICallback<string[]>,
  ): void {
    consumerQueues.getQueueConsumerIds(redisClient, queue, cb);
  }

  static countOnlineConsumers(
    redisClient: RedisClient,
    queue: TQueueParams,
    cb: ICallback<number>,
  ): void {
    consumerQueues.countQueueConsumers(redisClient, queue, cb);
  }

  static getConsumerHeartbeats(
    redisClient: RedisClient,
    cb: ICallback<
      {
        consumerId: string;
        payload: string;
      }[]
    >,
  ): void {
    ConsumerHeartbeat.getValidHeartbeats(redisClient, cb);
  }
}
