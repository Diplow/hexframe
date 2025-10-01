/**
 * Email sending configuration
 * 
 * This module handles email sending for authentication and verification.
 * Configure your email provider (Resend, SendGrid, SMTP, etc.) here.
 */

import { env } from "~/env";
import { loggers } from "~/lib/debug/debug-logger";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

/**
 * Send an email using your configured email provider
 * 
 * To use this in production, you need to:
 * 1. Choose an email provider (Resend, SendGrid, Postmark, etc.)
 * 2. Add the provider's API key to your environment variables
 * 3. Implement the actual sending logic below
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  const { to, subject, html, from = env.EMAIL_FROM ?? "noreply@hexframe.ai" } = options;

  loggers.api(`Email send request`, {
    to,
    subject,
    from,
    environment: env.NODE_ENV,
  });

  // In development, optionally send via Brevo if ENABLE_EMAIL_SENDING is set
  if (env.NODE_ENV === "development" || env.NODE_ENV === "test") {
    // Allow testing real email sending in development with env flag
    if (process.env.ENABLE_EMAIL_SENDING !== "true") {
      return;
    }
  }

  // Production email sending with Brevo
  if (env.BREVO_API_KEY) {
    try {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: { email: from, name: "Ulysse" },
          to: [{ email: to }],
          subject,
          htmlContent: html,
        }),
      });

      if (!response.ok) {
        const error = await response.json() as unknown;
        console.error("❌ Brevo API Error:", error);
        loggers.api(`Brevo email send failed`, { error, to, subject, status: response.status });
        throw new Error(`Failed to send email via Brevo: ${JSON.stringify(error)}`);
      }

      loggers.api(`Email sent successfully via Brevo`, { to, subject });
      return;
    } catch (error) {
      loggers.api(`Brevo email error`, { error, to, subject });
      throw new Error(`Brevo email error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Fallback to other providers if Brevo is not configured
  // Example with Resend (uncomment and configure):
  /*
  if (!env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is required for sending emails in production");
  }
  
  const resend = new Resend(env.RESEND_API_KEY);
  
  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
  });
  
  if (error) {
    loggers.api(`Email send failed`, { error, to, subject });
    throw new Error(`Failed to send email: ${error.message}`);
  }
  */

  // Example with SendGrid (uncomment and configure):
  /*
  if (!env.SENDGRID_API_KEY) {
    throw new Error("SENDGRID_API_KEY is required for sending emails in production");
  }
  
  sgMail.setApiKey(env.SENDGRID_API_KEY);
  
  try {
    await sgMail.send({
      to,
      from,
      subject,
      html,
    });
  } catch (error) {
    loggers.api(`Email send failed`, { error, to, subject });
    throw error;
  }
  */

  // For now, throw an error if we're in production without email configuration
  throw new Error(
    "Email sending is not configured. Please set up an email provider (Resend, SendGrid, etc.) in src/server/email.ts"
  );
}

/**
 * Generate verification email HTML
 */
export function generateVerificationEmail(
  verificationUrl: string,
  userEmail: string,
  userName?: string | null
): string {
  // Use provided username, or fall back to email prefix if no username
  const displayName = userName ?? userEmail.split('@')[0];
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to Hexframe - Let's build something alive together!</title>
        <style>
          body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.7; 
            color: #212529;
            background: #f8f9fa;
            margin: 0;
            padding: 20px;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
          }
          .header { 
            background: linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%); 
            color: white; 
            padding: 40px 30px; 
            text-align: center; 
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
            letter-spacing: -0.5px;
          }
          .header p {
            margin: 10px 0 0 0;
            opacity: 0.95;
            font-size: 16px;
          }
          .content { 
            padding: 40px 35px; 
          }
          .content h2 {
            color: #7c3aed;
            font-size: 22px;
            margin-bottom: 20px;
            font-weight: 600;
          }
          .button { 
            display: inline-block; 
            padding: 14px 32px; 
            background: #7c3aed; 
            color: white !important; 
            text-decoration: none; 
            border-radius: 8px; 
            margin: 25px 0;
            font-weight: 600;
            font-size: 16px;
            transition: all 0.3s ease;
            box-shadow: 0 2px 4px rgba(124, 58, 237, 0.3);
          }
          .button:hover {
            background: #6b32cc;
            box-shadow: 0 4px 8px rgba(124, 58, 237, 0.4);
          }
          .personal-note {
            background: #f8f9fa;
            border-left: 4px solid #a78bfa;
            padding: 20px;
            margin: 30px 0;
            border-radius: 4px;
          }
          .personal-note h3 {
            color: #7c3aed;
            margin-top: 0;
            font-size: 18px;
            font-weight: 600;
          }
          .calendar-link {
            color: #7c3aed;
            font-weight: 600;
            text-decoration: none;
            border-bottom: 2px solid #a78bfa;
            transition: all 0.2s ease;
          }
          .calendar-link:hover {
            border-bottom-color: #7c3aed;
          }
          .footer { 
            text-align: center; 
            color: #6c757d; 
            font-size: 13px; 
            margin-top: 40px;
            padding-top: 30px;
            border-top: 1px solid #e9ecef;
          }
          .highlight {
            color: #7c3aed;
            font-weight: 600;
          }
          .url-box {
            background: #f8f9fa;
            padding: 12px;
            border-radius: 6px;
            word-break: break-all;
            color: #7c3aed;
            font-family: monospace;
            font-size: 14px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎯 Welcome to Hexframe!</h1>
            <p>Where systems come alive</p>
          </div>
          <div class="content">
            <h2>Hey ${displayName}! 👋</h2>
            
            <p>
              I'm Ulysse, the creator of Hexframe. I'm genuinely excited that you're here! 
              You're among the very first to explore what we're building together.
            </p>

            <p>
              <strong>Your journey starts with one click:</strong>
            </p>
            
            <p style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify My Email & Start Building</a>
            </p>
            
            <div class="personal-note">
              <h3>🌟 Why I built Hexframe</h3>
              <p>
                I believe <span class="highlight">systems thinking</span> is the key to solving complex problems. 
                But here's the thing: <strong>systems are only valuable when they're alive</strong> – actively used, 
                evolving, and creating real value.
              </p>
              <p>
                Hexframe exists to help you build living systems that grow with your vision. 
                Whether you're mapping out a business strategy, organizing research, or creating something entirely new – 
                I want to help you bring it to life.
              </p>
            </div>

            <p>
              <strong>🤝 Let's build together!</strong><br>
              I'm personally here to help you create the system you need. Got questions? Ideas? Stuck somewhere?
            </p>
            
            <p style="text-align: center; margin: 25px 0;">
              <a href="https://calendly.com/u-boillot/30min" class="calendar-link">
                📅 Book a 30-min call with me
              </a>
            </p>
            
            <p>
              No sales pitch – just two people talking about building something meaningful.
            </p>

            <p style="margin-top: 30px;">
              <strong>Quick note on verification:</strong> We require email verification because AI features 
              need to be tied to real users. It also unlocks higher rate limits, so you can build without interruption.
            </p>
            
            <details style="margin-top: 20px;">
              <summary style="cursor: pointer; color: #6c757d; font-size: 14px;">
                Verification link not working? Copy this URL:
              </summary>
              <div class="url-box">
                ${verificationUrl}
              </div>
            </details>
            
            <div class="footer">
              <p>
                Built with intention in France 🇫🇷<br>
                <strong>Hexframe</strong> – Transform your vision into a living system
              </p>
              <p style="margin-top: 15px; font-size: 12px;">
                If you didn't create an account with Hexframe, you can safely ignore this email.<br>
                This link expires in 24 hours for security reasons.
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}