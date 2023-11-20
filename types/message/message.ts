/*
 * Copyright (c)
 * Weyoss <weyoss@protonmail.com>
 * https://github.com/weyoss
 *
 * This source code is licensed under the MIT license found in the LICENSE file
 * in the root directory of this source tree.
 */

import { TExchangeSerialized } from '../index';
import { IQueueParams } from '../queue';

export enum EMessageProperty {
  ID,
  STATUS,
  STATE,
  MESSAGE,
}

export enum EMessagePropertyStatus {
  SCHEDULED,
  PENDING,
  PROCESSING,
  ACKNOWLEDGED,
  UNACK_DELAYING,
  UNACK_REQUEUING,
  DEAD_LETTERED,
}

export interface IMessageSerialized {
  createdAt: number;
  exchange: TExchangeSerialized | null;
  ttl: number;
  retryThreshold: number;
  retryDelay: number;
  consumeTimeout: number;
  body: unknown;
  priority: number | null;
  scheduledCron: string | null;
  scheduledDelay: number | null;
  scheduledRepeatPeriod: number | null;
  scheduledRepeat: number;
  destinationQueue: IQueueParams | null;
}

export type TMessageConsumeOptions = {
  ttl: number;
  retryThreshold: number;
  retryDelay: number;
  consumeTimeout: number;
};