import { Password } from "@convex-dev/auth/providers/Password";
import { Email } from "@convex-dev/auth/providers/Email";
import GitHub from "@auth/core/providers/github";
import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";

export const ResendEmail = Email({
  id: "resend",
  name: "Resend",
  maxAge: 60 * 15, // 15 minutes
  async sendVerificationRequest({ identifier: email, token }) {
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
        subject: `Money Shark Verification Code: ${token}`,
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0F172A;color:#E2E8F0;padding:32px;border-radius:16px;max-width:480px;margin:0 auto;">
            <div style="text-align:center;margin-bottom:24px;">
              <h1 style="color:#FFFFFF;margin:0;font-size:22px;"><span style="color:#10B981;">Money</span>-Shark</h1>
              <p style="color:#94A3B8;font-size:12px;margin-top:4px;">Capital Portfolio Security</p>
            </div>
            <div style="background:#1E293B;padding:24px;border-radius:12px;text-align:center;border:1px solid #334155;">
              <p style="color:#94A3B8;font-size:13px;margin:0 0 12px 0;">Use the verification code below to verify and activate your account:</p>
              <div style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#34D399;margin:12px 0;font-family:monospace;">${token}</div>
              <p style="color:#64748B;font-size:11px;margin:12px 0 0 0;">Valid for 15 minutes. Never share this code with anyone.</p>
            </div>
            <p style="color:#64748B;font-size:11px;text-align:center;margin-top:24px;">If you did not request this email, please ignore it.</p>
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
      verify: ResendEmail,
      reset: ResendEmail,
    }),
    GitHub,
    Google,
  ],
});
