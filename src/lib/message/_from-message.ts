/*
 * Copyright (c)
 * Weyoss <weyoss@protonmail.com>
 * https://github.com/weyoss
 *
 * This source code is licensed under the MIT license found in the LICENSE file
 * in the root directory of this source tree.
 */

import { MessageState } from './message-state';
import {
  EMessagePropertyStatus,
  IMessageSerialized,
  IMessageStateSerialized,
} from '../../../types';
import { MessageEnvelope } from './message-envelope';
import { _fromJSON } from '../exchange/_from-json';
import { ProducibleMessage } from './producible-message';

export function _fromMessage(
  msg: string | MessageEnvelope,
  status: EMessagePropertyStatus | null,
  msgState: string | MessageState | null,
): MessageEnvelope {
  const { exchange, destinationQueue, ...params }: IMessageSerialized =
    typeof msg === 'string' ? JSON.parse(msg) : msg.toJSON();

  const messagePub = new ProducibleMessage();
  Object.assign(messagePub, params);
  messagePub.setExchange(_fromJSON(exchange));

  //
  const m = new MessageEnvelope(messagePub);
  m.setDestinationQueue(destinationQueue);

  // Status
  if (status !== null) {
    m.setStatus(status);
  }

  // MessageState
  if (msgState !== null) {
    const messageStateInstance = new MessageState();
    const messageStateJSON: IMessageStateSerialized =
      typeof msgState === 'string' ? JSON.parse(msgState) : msgState;
    Object.assign(messageStateInstance, messageStateJSON);
    m.setMessageState(messageStateInstance);
  }

  return m;
}
