import { BRAND } from './brand';
import { escapeHtml } from './utils';

export type EmailLayoutOptions = {
  preheader?: string;
  title: string;
  bodyHtml: string;
};

export function emailLayout({ preheader, title, bodyHtml }: EmailLayoutOptions): string {
  const preheaderText = preheader ? escapeHtml(preheader) : escapeHtml(title);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; padding: 0; background: ${BRAND.colors.parchment}; }
    .preheader { display: none; max-height: 0; overflow: hidden; opacity: 0; }
    @media only screen and (max-width: 620px) {
      .container { width: 100% !important; }
      .pad { padding: 24px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${BRAND.colors.parchment};font-family:Georgia,'Times New Roman',serif;color:${BRAND.colors.charcoal};">
  <span class="preheader">${preheaderText}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.colors.parchment};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${BRAND.colors.white};border:1px solid ${BRAND.colors.bone};">
          <tr>
            <td style="background:${BRAND.colors.obsidian};padding:28px 32px;">
              <p style="margin:0;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:${BRAND.colors.turquoise};font-family:Arial,sans-serif;">
                ${BRAND.tagline}
              </p>
              <h1 style="margin:8px 0 0;font-size:26px;font-weight:300;color:${BRAND.colors.parchment};letter-spacing:0.04em;">
                ${BRAND.name}
              </h1>
            </td>
          </tr>
          <tr>
            <td class="pad" style="padding:36px 32px 28px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid ${BRAND.colors.bone};padding:20px 32px;background:${BRAND.colors.parchment};">
              <p style="margin:0 0 6px;font-size:12px;color:${BRAND.colors.sienna};font-family:Arial,sans-serif;">
                Questions? Reply to this email or visit our contact page.
              </p>
              <p style="margin:0;font-size:11px;color:${BRAND.colors.sienna};font-family:Arial,sans-serif;">
                © ${new Date().getFullYear()} ${BRAND.name}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function emailButton(href: string, label: string): string {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
      <td style="border-radius:4px;background:${BRAND.colors.turquoise};">
        <a href="${safeHref}" style="display:inline-block;padding:14px 28px;font-family:Arial,sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.04em;">
          ${safeLabel}
        </a>
      </td>
    </tr>
  </table>`;
}

export function infoBox(html: string): string {
  return `<div style="background:${BRAND.colors.parchment};border:1px solid ${BRAND.colors.bone};border-left:4px solid ${BRAND.colors.turquoise};padding:20px 22px;margin:20px 0;border-radius:0 4px 4px 0;">
    ${html}
  </div>`;
}

