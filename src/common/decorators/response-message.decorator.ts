import { SetMetadata } from '@nestjs/common';

export const RESPONSE_MESSAGE_KEY = 'RESPONSE_MESSAGE';
export const BYPASS_RESPONSE_TRANSFORM_KEY = 'BYPASS_RESPONSE_TRANSFORM';

/**
 * Decorator to set custom success message for a route handler.
 * param message The custom message to return in the standardized response payload.
 */
export const ResponseMessage = (message: string) =>
  SetMetadata(RESPONSE_MESSAGE_KEY, message);

/**
 * Decorator to opt out of response payload transformation for specific routes (e.g. streaming, file downloads).
 */
export const BypassResponseTransform = () =>
  SetMetadata(BYPASS_RESPONSE_TRANSFORM_KEY, true);
