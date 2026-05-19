import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  renderContactAdminEmail,
  renderContactConfirmationEmail,
} from '@naj/emails';
import { getAdminEmail, isEmailConfigured, sendEmailSafe, sendTransactionalEmail } from '@/lib/email';
import { isSupabaseAdminConfigured, saveContactSubmission } from '@/lib/db';

const ContactSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  subject: z.string().min(1).max(200).optional(),
  message: z.string().min(10).max(5000),
});

export async function POST(req: NextRequest) {
  try {
    const body = ContactSchema.parse(await req.json());

    let saved = false;
    if (isSupabaseAdminConfigured()) {
      try {
        await saveContactSubmission(body);
        saved = true;
      } catch (err) {
        console.error('Contact DB save failed:', err);
      }
    }

    if (!saved && !isEmailConfigured()) {
      return NextResponse.json(
        { error: 'Messaging is temporarily unavailable. Please email us directly.' },
        { status: 503 }
      );
    }

    const admin = getAdminEmail();
    const adminEmail = renderContactAdminEmail(body);
    const confirmEmail = renderContactConfirmationEmail({ name: body.name });

    const [adminResult, customerResult] = await Promise.all([
      isEmailConfigured()
        ? sendEmailSafe('contact-admin', () =>
            sendTransactionalEmail({
              to: admin,
              replyTo: body.email,
              subject: adminEmail.subject,
              html: adminEmail.html,
              text: adminEmail.text,
            })
          )
        : Promise.resolve({ ok: false as const, skipped: true as const }),
      isEmailConfigured()
        ? sendEmailSafe('contact-confirmation', () =>
            sendTransactionalEmail({
              to: body.email,
              subject: confirmEmail.subject,
              html: confirmEmail.html,
              text: confirmEmail.text,
            })
          )
        : Promise.resolve({ ok: false as const, skipped: true as const }),
    ]);

    const adminSent = adminResult.ok;
    const customerSent = customerResult.ok;

    if (saved || adminSent) {
      if (!customerSent && isEmailConfigured() && !('skipped' in customerResult && customerResult.skipped)) {
        console.warn('Contact saved/notified admin but customer confirmation failed');
      }
      return NextResponse.json({ data: { sent: true, confirmationSent: customerSent } });
    }

    const emailError =
      'error' in adminResult
        ? adminResult.error
        : 'error' in customerResult
          ? customerResult.error
          : 'unknown';

    console.error('Contact failed — no DB save and admin email failed:', emailError);
    return NextResponse.json(
      { error: 'Failed to send message. Please try again or email us directly.' },
      { status: 500 }
    );
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
