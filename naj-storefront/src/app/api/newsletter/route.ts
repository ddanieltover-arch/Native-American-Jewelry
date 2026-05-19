import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  renderNewsletterAdminEmail,
  renderNewsletterWelcomeEmail,
} from '@naj/emails';
import { getAdminEmail, isEmailConfigured, sendEmailSafe, sendTransactionalEmail } from '@/lib/email';
import { isSupabaseAdminConfigured, subscribeNewsletter } from '@/lib/db';

const NewsletterSchema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  try {
    const { email } = NewsletterSchema.parse(await req.json());
    const normalized = email.trim().toLowerCase();

    let saved = false;
    if (isSupabaseAdminConfigured()) {
      try {
        await subscribeNewsletter(normalized);
        saved = true;
      } catch (err) {
        console.error('Newsletter DB save failed:', err);
      }
    }

    if (!saved && !isEmailConfigured()) {
      return NextResponse.json(
        { error: 'Subscription is temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    const welcome = renderNewsletterWelcomeEmail(normalized);
    const adminNotice = renderNewsletterAdminEmail(normalized);

    const [welcomeResult, adminResult] = await Promise.all([
      isEmailConfigured()
        ? sendEmailSafe('newsletter-welcome', () =>
            sendTransactionalEmail({
              to: normalized,
              subject: welcome.subject,
              html: welcome.html,
              text: welcome.text,
            })
          )
        : Promise.resolve({ ok: false as const, skipped: true as const }),
      isEmailConfigured()
        ? sendEmailSafe('newsletter-admin', () =>
            sendTransactionalEmail({
              to: getAdminEmail(),
              subject: adminNotice.subject,
              html: adminNotice.html,
              text: adminNotice.text,
            })
          )
        : Promise.resolve({ ok: false as const, skipped: true as const }),
    ]);

    const welcomeSent = welcomeResult.ok;
    const adminSent = adminResult.ok;

    if (saved || welcomeSent || adminSent) {
      return NextResponse.json({
        data: {
          subscribed: true,
          welcomeSent,
        },
      });
    }

    const emailError =
      'error' in welcomeResult
        ? welcomeResult.error
        : 'error' in adminResult
          ? adminResult.error
          : 'unknown';

    console.error('Newsletter failed — no DB save and no email sent:', emailError);
    return NextResponse.json(
      { error: 'Could not complete subscription. Please try again.' },
      { status: 500 }
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }
    console.error('Newsletter error:', err);
    return NextResponse.json({ error: 'Subscription failed' }, { status: 500 });
  }
}
