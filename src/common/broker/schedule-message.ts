import { ICallback, TRedisClientMulti } from '../../../types';
import { Message } from '../../app/message/message';
import { redisKeys } from '../redis-keys/redis-keys';
import { RedisClient } from '../redis-client/redis-client';
import { ELuaScriptName } from '../redis-client/lua-scripts';
import { PanicError } from '../errors/panic.error';
import { MessageNotScheduledError } from '../../app/producer/errors/message-not-scheduled.error';

function scheduleMessageTransaction(
  multi: TRedisClientMulti,
  message: Message,
): boolean {
  const timestamp = message.getNextScheduledTimestamp();
  if (timestamp > 0) {
    const { keyScheduledMessageIds, keyScheduledMessages } =
      redisKeys.getMainKeys();
    message.getRequiredMetadata().setScheduledAt(Date.now());
    const messageId = message.getRequiredId();
    multi.zadd(keyScheduledMessageIds, timestamp, messageId);
    multi.hset(keyScheduledMessages, messageId, JSON.stringify(message));
    return true;
  }
  return false;
}

export function scheduleMessage(
  mixed: TRedisClientMulti,
  message: Message,
): boolean;
export function scheduleMessage(
  mixed: RedisClient,
  message: Message,
  cb: ICallback<void>,
): void;
export function scheduleMessage(
  mixed: RedisClient | TRedisClientMulti,
  message: Message,
  cb?: ICallback<void>,
): void | boolean {
  if (mixed instanceof RedisClient) {
    if (!cb) throw new PanicError(`Expected a callback function`);
    const timestamp = message.getNextScheduledTimestamp();
    if (timestamp > 0) {
      const queue = message.getRequiredQueue();
      const {
        keyQueueSettings,
        keyQueueSettingsPriorityQueuing,
        keyScheduledMessageIds,
        keyScheduledMessages,
      } = redisKeys.getQueueKeys(queue);
      message.getRequiredMetadata().setScheduledAt(Date.now());
      const messageId = message.getRequiredId();
      mixed.runScript(
        ELuaScriptName.SCHEDULE_MESSAGE,
        [
          keyQueueSettings,
          keyQueueSettingsPriorityQueuing,
          keyScheduledMessageIds,
          keyScheduledMessages,
        ],
        [
          messageId,
          JSON.stringify(message),
          `${timestamp}`,
          `${message.getPriority() ?? ''}`,
        ],
        (err, reply) => {
          if (err) cb(err);
          else if (reply !== 'OK')
            cb(new MessageNotScheduledError(String(reply)));
          else cb();
        },
      );
    } else cb(new MessageNotScheduledError('INVALID_SCHEDULING_PARAMETERS'));
  } else {
    return scheduleMessageTransaction(mixed, message);
  }
}