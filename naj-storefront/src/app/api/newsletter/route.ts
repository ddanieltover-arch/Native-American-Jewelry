import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  renderNewsletterAdminEmail,
  renderNewsletterWelcomeEmail,
} from '@naj/emails';
import { getAdminEmail, isEmailConfigured, sendEmailSafe, sendTransactionalEmail } from '@/lib/email';

const NewsletterSchema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  try {
    const { email } = NewsletterSchema.parse(await req.json());

    if (!isEmailConfigured()) {
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 503 }
      );
    }

    const welcome = renderNewsletterWelcomeEmail(email);
    const adminNotice = renderNewsletterAdminEmail(email);

    const [welcomeResult, adminResult] = await Promise.all([
      sendEmailSafe('newsletter-welcome', () =>
        sendTransactionalEmail({
          to: email,
          subject: welcome.subject,
          html: welcome.html,
          text: welcome.text,
        })
      ),
      sendEmailSafe('newsletter-admin', () =>
        sendTransactionalEmail({
          to: getAdminEmail(),
          subject: adminNotice.subject,
          html: adminNotice.html,
          text: adminNotice.text,
        })
      ),
    ]);

    if (!welcomeResult.ok && !('skipped' in welcomeResult && welcomeResult.skipped)) {
      return NextResponse.json(
        { error: 'Could not complete subscription. Please try again.' },
        { status: 500 }
      );
    }

    if (!adminResult.ok && !('skipped' in adminResult && adminResult.skipped)) {
      console.warn('Newsletter welcome sent but admin notification failed');
    }

    return NextResponse.json({ data: { subscribed: true } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }
    console.error('Newsletter error:', err);
    return NextResponse.json({ error: 'Subscription failed' }, { status: 500 });
  }
}
