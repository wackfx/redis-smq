import { EExchangeType, TExchangeSerialized } from '../../../../types';
import { InvalidExchangeDataError } from '../../../../src/lib/exchange/errors/invalid-exchange-data.error';
import { _fromJSON } from '../../../../src/lib/exchange/_from-json';

test('ExchangeFanOut: fromJSON()', async () => {
  const json: TExchangeSerialized = {
    bindingParams: 'w123.1',
    type: EExchangeType.FANOUT,
    exchangeTag: '123',
  };
  expect(() => _fromJSON({})).toThrow(InvalidExchangeDataError);
  const e = _fromJSON(json);
  expect(e.toJSON()).toEqual(json);
});
