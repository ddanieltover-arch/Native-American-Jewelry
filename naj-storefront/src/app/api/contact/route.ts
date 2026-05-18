import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Resend } from 'resend';

const ContactSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  subject: z.string().min(1).max(200).optional(),
  message: z.string().min(10).max(5000),
});

export async function POST(req: NextRequest) {
  try {
    const body = ContactSchema.parse(await req.json());

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 503 }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const to = process.env.ADMIN_EMAIL ?? process.env.FROM_EMAIL ?? 'orders@nativeamericanjewelry.com';
    const from = process.env.FROM_EMAIL ?? 'orders@nativeamericanjewelry.com';

    await resend.emails.send({
      from,
      to,
      reply_to: body.email,
      subject: body.subject
        ? `[Contact] ${body.subject}`
        : `[Contact] Message from ${body.name}`,
      html: `
        <h2>Contact form submission</h2>
        <p><strong>Name:</strong> ${body.name}</p>
        <p><strong>Email:</strong> ${body.email}</p>
        <p><strong>Message:</strong></p>
        <p style="white-space:pre-wrap">${body.message}</p>
      `,
    });

    await resend.emails.send({
      from,
      to: body.email,
      subject: 'We received your message — Native American Jewelry',
      html: `
        <p>Hi ${body.name},</p>
        <p>Thank you for reaching out. We received your message and will respond within 1–2 business days.</p>
        <p style="color:#666;font-size:12px">This is an automated confirmation.</p>
      `,
    });

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
