import { AllMiddlewareArgs, AnyMiddlewareArgs } from '@slack/bolt';

export async function ignoreRetry({
  context,
  logger,
  next,
}: AllMiddlewareArgs & AnyMiddlewareArgs) {
  const { retryNum, retryReason } = context;
  if (retryNum) {
    logger.info('retryNum', retryNum);
    logger.info('retryReason', retryReason);
    return;
  }
  await next();
}
