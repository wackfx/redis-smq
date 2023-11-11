import { EQueueType, IQueueParams } from '../../types';
import { Message } from '../../src/lib/message/message';
import { events } from '../../src/common/events/events';
import { untilConsumerEvent, untilMessageAcknowledged } from './events';
import { getConsumer } from './consumer';
import { getProducer } from './producer';
import { fork } from 'child_process';
import * as path from 'path';
import { getQueue } from './queue';
import { Configuration } from '../../src/config/configuration';

export const defaultQueue: IQueueParams = {
  name: 'test_queue',
  ns: Configuration.getSetConfig().namespace,
};

export async function produceAndAcknowledgeMessage(
  queue: IQueueParams = defaultQueue,
) {
  const producer = getProducer();
  await producer.runAsync();

  const consumer = getConsumer({
    queue,
    messageHandler: jest.fn((msg, cb) => {
      cb();
    }),
  });

  const message = new Message();
  message.setBody({ hello: 'world' }).setQueue(queue);
  await producer.produceAsync(message);

  consumer.run();
  await untilMessageAcknowledged(consumer);
  return { producer, consumer, queue, message };
}

export async function produceAndDeadLetterMessage(
  queue: IQueueParams = defaultQueue,
) {
  const producer = getProducer();
  await producer.runAsync();

  const consumer = getConsumer({
    queue,
    messageHandler: jest.fn(() => {
      throw new Error('Explicit error');
    }),
  });

  const message = new Message();
  message.setBody({ hello: 'world' }).setQueue(queue);
  await producer.produceAsync(message);

  consumer.run();
  await untilConsumerEvent(consumer, events.MESSAGE_DEAD_LETTERED);
  return { producer, consumer, message, queue };
}

export async function produceMessage(queue: IQueueParams = defaultQueue) {
  const producer = getProducer();
  await producer.runAsync();

  const message = new Message();
  message.setBody({ hello: 'world' }).setQueue(queue);
  await producer.produceAsync(message);
  return { producer, message, queue };
}

export async function produceMessageWithPriority(
  queue: IQueueParams = defaultQueue,
) {
  const producer = getProducer();
  await producer.runAsync();

  const message = new Message();
  message.setPriority(Message.MessagePriority.LOW).setQueue(queue);
  await producer.produceAsync(message);
  return { message, producer, queue };
}

export async function scheduleMessage(queue: IQueueParams = defaultQueue) {
  const producer = getProducer();
  await producer.runAsync();

  const message = new Message();
  message.setScheduledDelay(10000).setQueue(queue);
  await producer.produceAsync(message);
  return { message, producer, queue };
}

export async function createQueue(
  queue: string | IQueueParams,
  mixed: boolean | EQueueType,
): Promise<void> {
  const queueInstance = await getQueue();
  const type =
    typeof mixed === 'boolean'
      ? mixed
        ? EQueueType.PRIORITY_QUEUE
        : EQueueType.LIFO_QUEUE
      : mixed;
  await queueInstance.saveAsync(queue, type);
}

export async function crashAConsumerConsumingAMessage() {
  await new Promise((resolve) => {
    const thread = fork(path.join(__dirname, 'consumer-thread.js'));
    thread.on('error', () => void 0);
    thread.on('exit', resolve);
  });
}
