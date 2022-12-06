import { AllMiddlewareArgs } from '@slack/bolt';

export default async function retryIgnore({
  context,
  logger,
  next,
}: AllMiddlewareArgs) {
  const { retryNum, retryReason } = context;
  if (retryNum) {
    logger.info('retryNum', retryNum);
    logger.info('retryReason', retryReason);
    return;
  }
  await next();
}
