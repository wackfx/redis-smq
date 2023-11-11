import { v4 as uuid } from 'uuid';
import { EventEmitter } from 'events';
import { IEventListener } from '../../types';
import { events } from '../common/events/events';
import {
  async,
  createClientInstance,
  errors,
  logger,
  PowerManager,
  RedisClient,
  ICallback,
  TFunction,
  TUnaryFunction,
  ILogger,
} from 'redis-smq-common';
import { Configuration } from '../config/configuration';

export abstract class Base extends EventEmitter {
  protected readonly id: string;
  protected readonly powerManager: PowerManager;
  protected sharedRedisClient: RedisClient | null = null;
  protected logger: ILogger;
  protected eventListeners: IEventListener[] = [];

  constructor() {
    super();
    this.id = uuid();
    this.powerManager = new PowerManager(false);
    this.logger = logger.getNamespacedLogger(
      Configuration.getSetConfig().logger,
      `${this.constructor.name.toLowerCase()}:${this.id}`,
    );
    this.registerSystemEventListeners();
  }

  protected setUpSharedRedisClient = (cb: ICallback<void>): void => {
    createClientInstance(Configuration.getSetConfig().redis, (err, client) => {
      if (err) cb(err);
      else if (!client) cb(new errors.EmptyCallbackReplyError());
      else {
        this.sharedRedisClient = client;
        cb();
      }
    });
  };

  protected tearDownSharedRedisClient = (cb: ICallback<void>): void => {
    if (this.sharedRedisClient) {
      this.sharedRedisClient.halt(() => {
        this.sharedRedisClient = null;
        cb();
      });
    } else cb();
  };

  protected registerSystemEventListeners(): void {
    this.on(events.GOING_UP, () => this.logger.info(`Going up...`));
    this.on(events.UP, () => this.logger.info(`Up and running...`));
    this.on(events.GOING_DOWN, () => this.logger.info(`Going down...`));
    this.on(events.DOWN, () => this.logger.info(`Down.`));
    this.on(events.ERROR, (err: Error) => this.handleError(err));
  }

  protected goingUp(): TFunction[] {
    return [this.setUpSharedRedisClient];
  }

  protected up(cb?: ICallback<boolean>): void {
    this.powerManager.commit();
    this.emit(events.UP);
    cb && cb(null, true);
  }

  protected goingDown(): TUnaryFunction<ICallback<void>>[] {
    return [this.tearDownEventListeners, this.tearDownSharedRedisClient];
  }

  protected down(cb?: ICallback<boolean>): void {
    this.powerManager.commit();
    this.emit(events.DOWN);
    cb && cb(null, true);
  }

  protected getSharedRedisClient(): RedisClient {
    if (!this.sharedRedisClient)
      throw new errors.PanicError('Expected an instance of RedisClient');
    return this.sharedRedisClient;
  }

  protected registerEventListeners(
    Ctors: (new () => IEventListener)[],
    cb: ICallback<void>,
  ): void {
    async.eachOf(
      Ctors,
      (ctor, key, done) => {
        const instance = new ctor();
        instance.init(
          {
            instanceId: this.id,
            eventProvider: this,
          },
          (err) => {
            if (err) done(err);
            else {
              this.eventListeners.push(instance);
              done();
            }
          },
        );
      },
      cb,
    );
  }

  protected tearDownEventListeners = (cb: ICallback<void>): void => {
    async.each(
      this.eventListeners,
      (listener, index, done) => listener.quit(done),
      (err) => {
        if (err) cb(err);
        else {
          this.eventListeners = [];
          cb();
        }
      },
    );
  };

  handleError(err: Error): void {
    if (this.powerManager.isGoingUp() || this.powerManager.isRunning()) {
      throw err;
    }
  }

  run(cb?: ICallback<boolean>): void {
    const r = this.powerManager.goingUp();
    if (r) {
      this.emit(events.GOING_UP);
      const tasks = this.goingUp();
      async.waterfall(tasks, (err) => {
        if (err) {
          if (cb) cb(err);
          else this.emit(events.ERROR, err);
        } else this.up(cb);
      });
    } else {
      cb && cb(null, r);
    }
  }

  shutdown(cb?: ICallback<boolean>): void {
    const r = this.powerManager.goingDown();
    if (r) {
      this.emit(events.GOING_DOWN);
      const tasks = this.goingDown();
      async.waterfall(tasks, () => {
        // ignoring shutdown errors
        this.down(cb);
      });
    } else cb && cb(null, r);
  }

  isRunning(): boolean {
    return this.powerManager.isRunning();
  }

  isGoingUp(): boolean {
    return this.powerManager.isGoingUp();
  }

  isGoingDown(): boolean {
    return this.powerManager.isGoingDown();
  }

  isUp(): boolean {
    return this.powerManager.isUp();
  }

  isDown(): boolean {
    return this.powerManager.isDown();
  }

  getId(): string {
    return this.id;
  }
}
