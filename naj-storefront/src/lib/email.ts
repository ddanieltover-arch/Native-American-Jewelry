import {
  sendTransactionalEmail,
  getAdminEmail,
  type SendEmailResult,
} from '@naj/emails';

/** Log and surface email failures without blocking the main request. */
export async function sendEmailSafe(
  label: string,
  send: () => Promise<SendEmailResult>
): Promise<SendEmailResult> {
  const result = await send();
  if (!result.ok) {
    if ('skipped' in result && result.skipped) {
      console.warn(`[email] ${label}: skipped (RESEND_API_KEY not set)`);
    } else if ('error' in result) {
      console.error(`[email] ${label}: failed —`, result.error);
    }
  }
  return result;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export { sendTransactionalEmail, getAdminEmail };
