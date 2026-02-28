import nodemailer from 'nodemailer';

const createTransporter = () => {
  // Use custom SMTP server if configured
  if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Use Gmail service
  return nodemailer.createTransport({
    service: process.env.SMTP_SERVICE || 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const transporter = createTransporter();

interface InviteEmailParams {
  to: string;
  inviteLink: string;
  invitedByEmail: string;
  expiresAt: Date;
}

export async function sendInviteEmail({ to, inviteLink, invitedByEmail, expiresAt }: InviteEmailParams): Promise<boolean> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('SMTP credentials not configured. Skipping email send.');
    return false;
  }

  const expiryDate = new Date(expiresAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const mailOptions = {
    from: `"${process.env.ADMIN_NAME || 'Portfolio Admin'}" <${process.env.SMTP_USER}>`,
    to,
    subject: 'You\'ve Been Invited as a Sub-Admin',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Admin Invitation</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 40px 40px 30px;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                        You're Invited! 🎉
                      </h1>
                      <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
                        Join the Portfolio Admin Team
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Body -->
                  <tr>
                    <td style="padding: 40px;">
                      <p style="margin: 0 0 20px; color: #e2e8f0; font-size: 16px; line-height: 1.6;">
                        Hello,
                      </p>
                      <p style="margin: 0 0 20px; color: #e2e8f0; font-size: 16px; line-height: 1.6;">
                        You've been invited by <strong style="color: #60a5fa;">${invitedByEmail}</strong> to become a sub-admin on the portfolio management system.
                      </p>
                      <p style="margin: 0 0 30px; color: #e2e8f0; font-size: 16px; line-height: 1.6;">
                        As a sub-admin, you'll be able to help manage portfolio content based on the permissions assigned to you.
                      </p>
                      
                      <!-- CTA Button -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 20px 0;">
                            <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);">
                              Accept Invitation
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Link fallback -->
                      <p style="margin: 20px 0 0; color: #94a3b8; font-size: 14px; line-height: 1.6;">
                        Or copy and paste this link into your browser:
                      </p>
                      <p style="margin: 8px 0 30px; color: #60a5fa; font-size: 14px; word-break: break-all;">
                        <a href="${inviteLink}" style="color: #60a5fa; text-decoration: none;">${inviteLink}</a>
                      </p>
                      
                      <!-- Expiry warning -->
                      <div style="background-color: #1e3a5f; border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 8px; margin-top: 20px;">
                        <p style="margin: 0; color: #fbbf24; font-size: 14px; font-weight: 600;">
                          ⏰ This invitation expires on ${expiryDate}
                        </p>
                        <p style="margin: 8px 0 0; color: #94a3b8; font-size: 13px;">
                          Please accept the invitation before it expires.
                        </p>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #0f172a; padding: 30px 40px; border-top: 1px solid #334155;">
                      <p style="margin: 0; color: #64748b; font-size: 13px; text-align: center;">
                        If you didn't expect this invitation, you can safely ignore this email.
                      </p>
                      <p style="margin: 16px 0 0; color: #475569; font-size: 12px; text-align: center;">
                        © ${new Date().getFullYear()} Portfolio Admin System
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    text: `
You've Been Invited as a Sub-Admin!

Hello,

You've been invited by ${invitedByEmail} to become a sub-admin on the portfolio management system.

As a sub-admin, you'll be able to help manage portfolio content based on the permissions assigned to you.

Click here to accept the invitation: ${inviteLink}

⏰ This invitation expires on ${expiryDate}

If you didn't expect this invitation, you can safely ignore this email.
    `.trim(),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Invite email sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error('Failed to send invite email:', error);
    return false;
  }
}

export async function verifyEmailConfig(): Promise<boolean> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return false;
  }

  try {
    await transporter.verify();
    return true;
  } catch (error) {
    console.error('Email configuration error:', error);
    return false;
  }
}

// Contact notification email (when someone submits contact form)
interface ContactNotificationParams {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export async function sendContactNotification({ name, email, subject, message }: ContactNotificationParams): Promise<boolean> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('SMTP credentials not configured. Skipping contact notification.');
    return false;
  }

  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;

  const mailOptions = {
    from: `"Portfolio Contact Form" <${process.env.SMTP_USER}>`,
    to: adminEmail,
    replyTo: email,
    subject: `New Contact: ${subject}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1e293b; border-radius: 16px; overflow: hidden;">
                  <tr>
                    <td style="background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%); padding: 30px;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px;">New Contact Message</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 30px;">
                      <p style="color: #94a3b8; margin: 0 0 8px;">From:</p>
                      <p style="color: #e2e8f0; margin: 0 0 20px; font-size: 16px;"><strong>${name}</strong> &lt;${email}&gt;</p>
                      
                      <p style="color: #94a3b8; margin: 0 0 8px;">Subject:</p>
                      <p style="color: #e2e8f0; margin: 0 0 20px; font-size: 16px;">${subject}</p>
                      
                      <p style="color: #94a3b8; margin: 0 0 8px;">Message:</p>
                      <div style="background-color: #0f172a; padding: 20px; border-radius: 8px; color: #e2e8f0; white-space: pre-wrap;">${message}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    text: `New contact message from ${name} (${email})\n\nSubject: ${subject}\n\nMessage:\n${message}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Contact notification sent successfully');
    return true;
  } catch (error) {
    console.error('Failed to send contact notification:', error);
    return false;
  }
}

// Reply email functions
interface ReplyEmailParams {
  to: string;
  subject: string;
  message: string;
}

export async function sendReplyEmail({ to, subject, message }: ReplyEmailParams): Promise<boolean> {
  // This function is for Resend - we'll use nodemailer instead
  return sendReplyEmailWithNodemailer({ to, subject, message });
}

export async function sendReplyEmailWithNodemailer({ to, subject, message }: ReplyEmailParams): Promise<boolean> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('SMTP credentials not configured. Cannot send reply.');
    return false;
  }

  const mailOptions = {
    from: `"${process.env.ADMIN_NAME || 'Abdullah Jawahir'}" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1e293b; border-radius: 16px; overflow: hidden;">
                  <tr>
                    <td style="padding: 30px;">
                      <div style="color: #e2e8f0; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">${message}</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 20px 30px; border-top: 1px solid #334155;">
                      <p style="margin: 0; color: #64748b; font-size: 13px;">
                        Best regards,<br>
                        <strong style="color: #e2e8f0;">${process.env.ADMIN_NAME || 'Abdullah Jawahir'}</strong>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    text: `${message}\n\nBest regards,\n${process.env.ADMIN_NAME || 'Abdullah Jawahir'}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Reply email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('Failed to send reply email:', error);
    return false;
  }
}
