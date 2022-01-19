import { TApplication } from '../../../../../../types/common';
import { TQueueTimeSeriesRequestContext } from '../context';

export function GetQueueAcknowledgedHandler(app: TApplication) {
  return async (ctx: TQueueTimeSeriesRequestContext) => {
    const { queueTimeSeriesService } = app.context.services;
    return queueTimeSeriesService.acknowledged(ctx.state.dto);
  };
}
