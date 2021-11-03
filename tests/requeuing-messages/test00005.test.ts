import {
  getConsumer,
  getMessageManager,
  getProducer,
  getQueueManager,
  untilConsumerIdle,
} from '../common';
import { Message } from '../../src/message';
import { promisifyAll } from 'bluebird';

test(`Combined test: Dead-letter a message and requeue it with priority. Check pending, acknowledged and pending messages.`, async () => {
  const msg = new Message();
  msg.setBody({ hello: 'world' });

  const producer = getProducer();
  await producer.produceMessageAsync(msg);

  const consumer = getConsumer({
    consumeMock: (m, cb) => {
      throw new Error();
    },
  });
  await consumer.runAsync();
  await untilConsumerIdle(consumer);
  await consumer.shutdownAsync();

  const messageManager = promisifyAll(await getMessageManager());
  const res1 = await messageManager.getPendingMessagesAsync(
    producer.getQueueName(),
    0,
    100,
  );
  expect(res1.total).toBe(0);
  expect(res1.items.length).toBe(0);

  const res2 = await messageManager.getAcknowledgedMessagesAsync(
    producer.getQueueName(),
    0,
    100,
  );
  expect(res2.total).toBe(0);
  expect(res2.items.length).toBe(0);

  const res3 = await messageManager.getDeadLetterMessagesAsync(
    producer.getQueueName(),
    0,
    100,
  );
  expect(res3.total).toBe(1);
  expect(res3.items.length).toBe(1);
  const msg1 = Message.createFromMessage(msg)
    .setTTL(0)
    .setRetryThreshold(3)
    .setRetryDelay(0)
    .setConsumeTimeout(0)
    .setAttempts(2);
  expect(res3.items[0].message).toEqual(msg1);

  const queueManager = promisifyAll(await getQueueManager());
  const queueMetrics = await queueManager.getQueueMetricsAsync(
    producer.getQueueName(),
  );
  expect(queueMetrics.pendingWithPriority).toBe(0);
  expect(queueMetrics.pending).toBe(0);
  expect(queueMetrics.acknowledged).toBe(0);
  expect(queueMetrics.deadLettered).toBe(1);

  await messageManager.requeueMessageFromDLQueueAsync(
    producer.getQueueName(),
    0,
    msg.getId(),
    true,
    undefined,
  );

  const res5 = await messageManager.getPendingMessagesAsync(
    producer.getQueueName(),
    0,
    100,
  );
  expect(res5.total).toBe(0);
  expect(res5.items.length).toBe(0);

  const res6 = await messageManager.getPendingMessagesWithPriorityAsync(
    producer.getQueueName(),
    0,
    100,
  );
  expect(res6.total).toBe(1);
  expect(res6.items.length).toBe(1);
  // assign default consumer options
  const msg2 = Message.createFromMessage(msg)
    .setTTL(0)
    .setRetryThreshold(3)
    .setRetryDelay(0)
    .setConsumeTimeout(0)
    .setPriority(Message.MessagePriority.NORMAL);
  expect(res6.items[0].message).toEqual(msg2);

  const res7 = await messageManager.getDeadLetterMessagesAsync(
    producer.getQueueName(),
    0,
    100,
  );
  expect(res7.total).toBe(0);
  expect(res7.items.length).toBe(0);

  const queueMetrics1 = await queueManager.getQueueMetricsAsync(
    producer.getQueueName(),
  );
  expect(queueMetrics1.deadLettered).toBe(0);
  expect(queueMetrics1.pending).toBe(0);
  expect(queueMetrics1.pendingWithPriority).toBe(1);

  await expect(async () => {
    await messageManager.requeueMessageFromDLQueueAsync(
      producer.getQueueName(),
      0,
      msg.getId(),
      true,
      undefined,
    );
  }).rejects.toThrow('Message not found');
});