import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  renderContactAdminEmail,
  renderContactConfirmationEmail,
} from '@naj/emails';
import { getAdminEmail, isEmailConfigured, sendEmailSafe, sendTransactionalEmail } from '@/lib/email';

const ContactSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  subject: z.string().min(1).max(200).optional(),
  message: z.string().min(10).max(5000),
});

export async function POST(req: NextRequest) {
  try {
    const body = ContactSchema.parse(await req.json());

    if (!isEmailConfigured()) {
      return NextResponse.json(
        { error: 'Email service not configured. Please email us directly.' },
        { status: 503 }
      );
    }

    const admin = getAdminEmail();
    const adminEmail = renderContactAdminEmail(body);
    const confirmEmail = renderContactConfirmationEmail({ name: body.name });

    const [adminResult, customerResult] = await Promise.all([
      sendEmailSafe('contact-admin', () =>
        sendTransactionalEmail({
          to: admin,
          replyTo: body.email,
          subject: adminEmail.subject,
          html: adminEmail.html,
          text: adminEmail.text,
        })
      ),
      sendEmailSafe('contact-confirmation', () =>
        sendTransactionalEmail({
          to: body.email,
          subject: confirmEmail.subject,
          html: confirmEmail.html,
          text: confirmEmail.text,
        })
      ),
    ]);

    if (!adminResult.ok && !('skipped' in adminResult && adminResult.skipped)) {
      return NextResponse.json(
        { error: 'Failed to send message. Please try again or email us directly.' },
        { status: 500 }
      );
    }

    if (!customerResult.ok && !('skipped' in customerResult && customerResult.skipped)) {
      console.warn('Contact admin sent but customer confirmation failed');
    }

    return NextResponse.json({ data: { sent: true } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: err.errors },
        { status: 400 }
      );
    }
    console.error('Contact form error:', err);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
