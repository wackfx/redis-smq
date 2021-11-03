import {
  getConsumer,
  getProducer,
  untilConsumerIdle,
  untilMessageAcknowledged,
  validateTime,
} from '../common';
import { Message } from '../../src/message';
import { events } from '../../src/system/common/events';

test('Produce and consume a delayed message', async () => {
  const consumer = getConsumer({
    consumeMock: jest.fn((msg, cb) => {
      cb();
    }),
  });
  consumer.run();

  const msg = new Message();
  msg.setScheduledDelay(10000).setBody({ hello: 'world' }); // seconds

  const producer = getProducer();

  let producedAt = 0;
  producer.once(events.MESSAGE_PRODUCED, () => {
    producedAt = Date.now();
  });

  await producer.produceMessageAsync(msg);

  await untilMessageAcknowledged(consumer);
  const consumedAt = Date.now();

  await untilConsumerIdle(consumer);

  const diff = consumedAt - producedAt;
  expect(validateTime(diff, 10000)).toBe(true);
});