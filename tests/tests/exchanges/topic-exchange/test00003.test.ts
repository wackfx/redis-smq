import { ExchangeTopic } from '../../../../src/lib/exchange/exchange-topic';
import { promisifyAll } from 'bluebird';
import { createQueue } from '../../../common/message-producing-consuming';
import { isEqual } from '../../../common/util';

test('ExchangeTopic: fetching and matching queues', async () => {
  await createQueue({ ns: 'testing', name: 'w123.2.4.5' }, false);
  await createQueue({ ns: 'testing', name: 'w123.2.4.5.6' }, false);
  await createQueue({ ns: 'beta', name: 'w123.2' }, false);
  await createQueue({ ns: 'testing', name: 'w123.2' }, false);
  await createQueue({ ns: 'testing', name: 'w123.2.4' }, false);

  const e1 = promisifyAll(new ExchangeTopic('w123.2.4'));
  const queues = await e1.getQueuesAsync();
  expect(
    isEqual(queues, [
      { ns: 'testing', name: 'w123.2.4.5.6' },
      { ns: 'testing', name: 'w123.2.4.5' },
      { ns: 'testing', name: 'w123.2.4' },
    ]),
  ).toBe(true);
});
