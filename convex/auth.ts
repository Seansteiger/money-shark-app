import { Password } from "@convex-dev/auth/providers/Password";
import { Email } from "@convex-dev/auth/providers/Email";
import GitHub from "@auth/core/providers/github";
import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";

export const ResendEmail = Email({
  id: "resend",
  name: "Resend",
  maxAge: 60 * 15, // 15 minutes
  authorize: undefined, // Enable seamless magic link verification by token code
  generateVerificationToken: () => {
    // Generate strictly numeric 6-digit verification code
    const min = 100000;
    const max = 999999;
    return Math.floor(min + Math.random() * (max - min + 1)).toString();
  },
  async sendVerificationRequest({ identifier: email, token, url }) {
    const apiKey = process.env.AUTH_RESEND_KEY;
    if (!apiKey) {
      console.error("AUTH_RESEND_KEY is missing from environment");
      throw new Error("AUTH_RESEND_KEY is not configured");
    }

    const textBody = `Your Money-Shark verification code is: ${token}\n\nThis code is valid for 15 minutes.\n\nOr click here to sign in directly:\n${url}\n\nIf you did not request this verification, you can safely ignore this email.\n\nMoney-Shark Capital Management • steigeronline.co.za`;

    const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${token} is your Money-Shark verification code</title>
</head>
<body style="margin:0;padding:24px 12px;background-color:#0B0F19;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <!-- Preheader text to optimize inbox preview -->
  <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">
    Your Money-Shark verification code is ${token}. Valid for 15 minutes.
  </div>

  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:480px;margin:0 auto;background:#131B2E;border-radius:18px;overflow:hidden;border:1px solid #1E293B;box-shadow:0 12px 36px rgba(0,0,0,0.4);">
    <tr>
      <td style="padding:32px 28px 24px 28px;text-align:center;">
        <h1 style="margin:0;font-size:26px;font-weight:800;letter-spacing:-0.5px;color:#FFFFFF;">
          <span style="color:#10B981;">Money</span>-Shark
        </h1>
        <p style="margin:6px 0 0 0;font-size:12px;font-weight:600;color:#94A3B8;letter-spacing:1px;text-transform:uppercase;">
          Capital Management Security
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding:0 28px 24px 28px;">
        <div style="background:#1E293B;border:1px solid #334155;border-radius:14px;padding:24px;text-align:center;">
          <p style="margin:0 0 8px 0;font-size:13px;color:#94A3B8;font-weight:500;">
            Your sign-in verification code
          </p>
          <div style="font-size:38px;font-weight:800;letter-spacing:8px;color:#34D399;font-family:'Courier New',Courier,monospace;margin:12px 0;">
            ${token}
          </div>
          <p style="margin:8px 0 0 0;font-size:12px;color:#64748B;">
            Expires in 15 minutes
          </p>
        </div>
      </td>
    </tr>

    <tr>
      <td style="padding:0 28px 28px 28px;text-align:center;">
        <p style="margin:0 0 14px 0;font-size:13px;color:#94A3B8;">
          Or verify instantly with 1 click:
        </p>
        <a href="${url}" style="display:inline-block;background:#10B981;color:#FFFFFF;padding:13px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;box-shadow:0 4px 12px rgba(16,185,129,0.35);">
          Verify &amp; Sign In &rarr;
        </a>
      </td>
    </tr>

    <tr>
      <td style="padding:20px 28px;border-top:1px solid #1E293B;background:#0F172A;text-align:center;">
        <p style="margin:0 0 6px 0;font-size:11px;color:#64748B;">
          If you didn't request this code, you can safely ignore this email.
        </p>
        <p style="margin:0;font-size:10px;color:#475569;">
          Money-Shark Capital Management &bull; <a href="https://steigeronline.co.za" style="color:#64748B;text-decoration:underline;">steigeronline.co.za</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Money Shark <auth@steigeronline.co.za>",
        to: email,
        reply_to: "support@steigeronline.co.za",
        subject: `${token} is your Money-Shark verification code`,
        text: textBody,
        html: htmlBody,
        headers: {
          "X-Entity-Ref-ID": token,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Resend API error:", errText);
      throw new Error(`Failed to send verification email: ${res.status}`);
    }
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      verify: ResendEmail,
      reset: ResendEmail,
    }),
    ResendEmail,
    GitHub,
    Google,
  ],
});
