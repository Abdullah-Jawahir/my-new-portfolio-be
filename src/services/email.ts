import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface ContactEmailData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface ReplyEmailData {
  to: string;
  subject: string;
  message: string;
  originalMessage?: {
    name: string;
    email: string;
    subject: string;
    message: string;
    createdAt: Date | string;
  };
}

export const sendContactNotification = async (data: ContactEmailData): Promise<boolean> => {
  const adminEmail = process.env.ADMIN_EMAIL || 'mjabdullah33@gmail.com';
  
  try {
    const { error } = await resend.emails.send({
      from: 'Portfolio Contact <onboarding@resend.dev>',
      to: [adminEmail],
      subject: `New Contact Form: ${data.subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              border-radius: 10px 10px 0 0;
              text-align: center;
            }
            .content {
              background: #f9fafb;
              padding: 30px;
              border: 1px solid #e5e7eb;
              border-top: none;
              border-radius: 0 0 10px 10px;
            }
            .field {
              margin-bottom: 20px;
            }
            .label {
              font-weight: 600;
              color: #6b7280;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 5px;
            }
            .value {
              background: white;
              padding: 12px 16px;
              border-radius: 8px;
              border: 1px solid #e5e7eb;
            }
            .message-box {
              background: white;
              padding: 20px;
              border-radius: 8px;
              border: 1px solid #e5e7eb;
              white-space: pre-wrap;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              color: #9ca3af;
              font-size: 12px;
            }
            .reply-btn {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 12px 24px;
              border-radius: 8px;
              text-decoration: none;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">New Contact Message</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">Someone reached out through your portfolio</p>
          </div>
          <div class="content">
            <div class="field">
              <div class="label">From</div>
              <div class="value">${data.name}</div>
            </div>
            <div class="field">
              <div class="label">Email</div>
              <div class="value">${data.email}</div>
            </div>
            <div class="field">
              <div class="label">Subject</div>
              <div class="value">${data.subject}</div>
            </div>
            <div class="field">
              <div class="label">Message</div>
              <div class="message-box">${data.message}</div>
            </div>
            <div style="text-align: center;">
              <a href="mailto:${data.email}?subject=Re: ${data.subject}" class="reply-btn">
                Reply to ${data.name}
              </a>
            </div>
          </div>
          <div class="footer">
            <p>This email was sent from your portfolio contact form.</p>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Error sending email:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to send contact notification:', error);
    return false;
  }
};

export const sendReplyEmail = async (data: ReplyEmailData): Promise<boolean> => {
  const adminName = process.env.ADMIN_NAME || 'Abdullah Jawahir';
  const adminEmail = process.env.ADMIN_EMAIL || 'mjabdullah33@gmail.com';
  
  try {
    const originalDate = data.originalMessage?.createdAt 
      ? new Date(data.originalMessage.createdAt).toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

    const { error } = await resend.emails.send({
      from: `${adminName} <onboarding@resend.dev>`,
      to: [data.to],
      replyTo: adminEmail,
      subject: data.subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.8;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f5f5f5;
            }
            .email-container {
              background: white;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 600;
            }
            .header p {
              margin: 8px 0 0;
              opacity: 0.9;
              font-size: 14px;
            }
            .content {
              padding: 30px;
            }
            .greeting {
              font-size: 16px;
              color: #374151;
              margin-bottom: 20px;
            }
            .message-body {
              font-size: 15px;
              color: #4b5563;
              white-space: pre-wrap;
              line-height: 1.8;
              margin-bottom: 30px;
            }
            .signature {
              border-top: 1px solid #e5e7eb;
              padding-top: 20px;
              margin-top: 30px;
            }
            .signature-name {
              font-weight: 600;
              color: #1f2937;
              font-size: 16px;
            }
            .signature-title {
              color: #6b7280;
              font-size: 14px;
              margin-top: 4px;
            }
            .original-message {
              background: #f9fafb;
              border-left: 4px solid #3b82f6;
              padding: 20px;
              margin-top: 30px;
              border-radius: 0 8px 8px 0;
            }
            .original-header {
              font-size: 12px;
              color: #6b7280;
              margin-bottom: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .original-meta {
              font-size: 13px;
              color: #9ca3af;
              margin-bottom: 8px;
            }
            .original-content {
              font-size: 14px;
              color: #6b7280;
              white-space: pre-wrap;
            }
            .footer {
              background: #f9fafb;
              padding: 20px 30px;
              text-align: center;
              border-top: 1px solid #e5e7eb;
            }
            .footer p {
              margin: 0;
              font-size: 12px;
              color: #9ca3af;
            }
            .social-links {
              margin-top: 15px;
            }
            .social-links a {
              display: inline-block;
              margin: 0 8px;
              color: #6b7280;
              text-decoration: none;
              font-size: 13px;
            }
            .social-links a:hover {
              color: #3b82f6;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <h1>${adminName}</h1>
              <p>Full Stack Engineer</p>
            </div>
            <div class="content">
              <div class="greeting">
                Hi ${data.originalMessage?.name || 'there'},
              </div>
              <div class="message-body">${data.message}</div>
              <div class="signature">
                <div class="signature-name">${adminName}</div>
                <div class="signature-title">Full Stack Engineer</div>
              </div>
              ${data.originalMessage ? `
              <div class="original-message">
                <div class="original-header">In reply to your message</div>
                <div class="original-meta">
                  <strong>From:</strong> ${data.originalMessage.name} &lt;${data.originalMessage.email}&gt;<br>
                  <strong>Date:</strong> ${originalDate}<br>
                  <strong>Subject:</strong> ${data.originalMessage.subject}
                </div>
                <div class="original-content">${data.originalMessage.message}</div>
              </div>
              ` : ''}
            </div>
            <div class="footer">
              <p>This email was sent by ${adminName}</p>
              <div class="social-links">
                <a href="https://github.com/Abdullah-Jawahir">GitHub</a>
                <a href="https://www.linkedin.com/in/mohamed-jawahir-abdullah/">LinkedIn</a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Error sending reply email:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Failed to send reply email:', error);
    throw error;
  }
};
