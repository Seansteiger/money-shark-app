import { Password } from "@convex-dev/auth/providers/Password";
import { Email } from "@convex-dev/auth/providers/Email";
import GitHub from "@auth/core/providers/github";
import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";

export const ResendEmail = Email({
  id: "resend",
  name: "Resend",
  maxAge: 60 * 15, // 15 minutes
  async sendVerificationRequest({ identifier: email, token, url }) {
    const apiKey = process.env.AUTH_RESEND_KEY;
    if (!apiKey) {
      console.error("AUTH_RESEND_KEY is missing from environment");
      throw new Error("AUTH_RESEND_KEY is not configured");
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Money Shark <auth@steigeronline.co.za>",
        to: email,
        subject: `Your Money Shark Verification Code: ${token}`,
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0F172A;color:#E2E8F0;padding:36px 24px;border-radius:16px;max-width:500px;margin:0 auto;box-shadow:0 10px 30px rgba(0,0,0,0.5);">
            <div style="text-align:center;margin-bottom:28px;">
              <h1 style="color:#FFFFFF;margin:0;font-size:24px;letter-spacing:-0.5px;">
                <span style="color:#10B981;">Money</span>-Shark
              </h1>
              <p style="color:#94A3B8;font-size:12px;margin-top:6px;letter-spacing:1px;text-transform:uppercase;">Account Verification</p>
            </div>

            <div style="background:#1E293B;padding:24px;border-radius:12px;text-align:center;border:1px solid #334155;margin-bottom:24px;">
              <p style="color:#94A3B8;font-size:13px;margin:0 0 12px 0;">Option 1: Enter your 6-digit verification code</p>
              <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#34D399;margin:12px 0;font-family:monospace;">${token}</div>
              <p style="color:#64748B;font-size:11px;margin:8px 0 0 0;">Valid for 15 minutes.</p>
            </div>

            <div style="text-align:center;margin-bottom:24px;">
              <p style="color:#94A3B8;font-size:13px;margin:0 0 12px 0;">Option 2: 1-Click Instant Sign-In</p>
              <a href="${url}" style="display:inline-block;background:#10B981;color:#FFFFFF;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:15px;box-shadow:0 4px 14px rgba(16,185,129,0.4);">
                Verify & Sign In Directly →
              </a>
            </div>

            <div style="border-top:1px solid #334155;padding-top:16px;text-align:center;">
              <p style="color:#64748B;font-size:11px;margin:0;">
                If you did not request this email, you can safely ignore it.
              </p>
            </div>
          </div>
        `,
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
      reset: ResendEmail,
    }),
    ResendEmail,
    GitHub,
    Google,
  ],
});
