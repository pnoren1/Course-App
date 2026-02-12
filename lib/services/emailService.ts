import nodemailer from 'nodemailer';

interface EmailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
}

interface WelcomeEmailData {
  email: string;
  userName: string;
  siteUrl: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  private getEmailConfig(): EmailConfig {
    const host = process.env.EMAIL_HOST;
    const port = parseInt(process.env.EMAIL_PORT || '587');
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (!host || !user || !pass) {
      throw new Error('הגדרות המייל חסרות במשתני הסביבה');
    }

    return { host, port, user, pass };
  }

  private async getTransporter(): Promise<nodemailer.Transporter> {
    if (this.transporter) {
      return this.transporter;
    }

    const config = this.getEmailConfig();

    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465, // true for 465, false for other ports
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    return this.transporter;
  }

  private generateWelcomeEmailHTML(data: WelcomeEmailData): string {
    return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ברוכים הבאים לפורטל הקורסים</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 30px 20px;
            direction: rtl;
            text-align: right;
            line-height: 1.6;
        }
        
        .email-container {
            max-width: 500px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
            border: 2px solid #e5e7eb;
        }
        
        .header {
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            padding: 28px 32px;
            text-align: center;
            color: white;
            position: relative;
            overflow: hidden;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.08"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.08"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.08"/><circle cx="10" cy="60" r="0.5" fill="white" opacity="0.08"/><circle cx="90" cy="40" r="0.5" fill="white" opacity="0.08"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
            pointer-events: none;
        }
        
        .header-content {
            position: relative;
            z-index: 1;
            display: inline-flex;
            align-items: baseline;
            gap: 12px;
            direction: rtl;
        }
        
        .header h1 {
            font-size: 22px;
            font-weight: 700;
            margin: 0;
            letter-spacing: -0.3px;
            line-height: 1.2;
            text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .header-icon {
            font-size: 22px;
            line-height: 1;
            vertical-align: baseline;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15));
            margin-top: -2px;
            margin-right: 10px;
        }
        
        .content {
            padding: 32px;
            text-align: right;
        }
        
        .greeting {
            font-size: 18px;
            margin-bottom: 24px;
            color: #1f2937;
            font-weight: 500;
            text-align: right;
        }
        
        .user-name {
            color: #4f46e5;
            font-weight: 700;
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .success-card {
            background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
            border: 2px solid #bbf7d0;
            border-radius: 16px;
            padding: 24px;
            margin: 24px 0;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        
        .success-card::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(34, 197, 94, 0.1) 0%, transparent 70%);
            animation: shimmer 3s ease-in-out infinite;
        }
        
        @keyframes shimmer {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(180deg); }
        }
        
        .success-icon {
            font-size: 32px;
            margin-bottom: 8px;
            display: block;
            position: relative;
            z-index: 1;
        }
        
        .success-title {
            font-size: 18px;
            font-weight: 700;
            color: #065f46;
            margin-bottom: 6px;
            position: relative;
            z-index: 1;
        }
        
        .success-subtitle {
            font-size: 14px;
            color: #047857;
            font-weight: 500;
            position: relative;
            z-index: 1;
        }
        
        .cta-section {
            text-align: center;
            margin: 32px 0;
        }
        
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            color: #ffffff !important;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 12px;
            font-weight: 700;
            font-size: 16px;
            box-shadow: 0 8px 25px rgba(79, 70, 229, 0.3);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
            text-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }
        
        .cta-button::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
            transition: left 0.5s;
        }
        
        .cta-button:hover::before {
            left: 100%;
        }
        
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 35px rgba(79, 70, 229, 0.4);
        }
        
        .login-card {
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            padding: 24px;
            margin: 24px 0;
            text-align: right;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        
        .login-title {
            font-weight: 700;
            margin-bottom: 16px;
            color: #1f2937;
            font-size: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
            justify-content: flex-start;
            text-align: right;
        }
        
        .info-row {
            display: flex;
            justify-content: flex-start;
            align-items: center;
            padding: 12px 0;
            font-size: 15px;
            text-align: right;
            direction: rtl;
            border-bottom: 1px solid #e2e8f0;
            gap: 24px;
        }
        
        .info-row:last-child {
            border-bottom: none;
        }
        
        .info-label {
            color: #6b7280;
            font-weight: 500;
            font-size: 14px;
            padding: 6px 0;
            display: flex;
            align-items: center;
            min-height: 32px;
            margin: 0 12px;
        }
        
        .info-value {
            color: #1f2937;
            font-weight: 600;
            background: #ffffff;
            padding: 6px 12px;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
            font-size: 14px;
            display: flex;
            align-items: center;
            min-height: 32px;
        }
        
        .footer {
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            padding: 24px 32px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
        
        .footer-message {
            font-size: 16px;
            color: #4f46e5;
            font-weight: 600;
            margin-bottom: 8px;
        }
        
        .footer-note {
            font-size: 12px;
            color: #9ca3af;
            margin-top: 12px;
            line-height: 1.4;
        }
        
        @media (max-width: 600px) {
            body {
                padding: 20px 10px;
            }
            
            .content {
                padding: 24px;
            }
            
            .header {
                padding: 20px 24px;
            }
            
            .login-card {
                padding: 20px;
            }
            
            .footer {
                padding: 20px 24px;
            }
        }
    </style>
</head>
<body style="direction: rtl;">
    <div class="email-container">
        <div class="header">
            <div class="header-content">
                <h1>פורטל הקורסים</h1>
                <span class="header-icon">🎓</span>
            </div>
        </div>
        
        <div class="content">
            <div class="greeting">
                שלום <span class="user-name">${data.userName}</span>, ברוכים הבאים! 👋
            </div>
            
            <div class="success-card">
                <span class="success-icon">✨</span>
                <div class="success-title">החשבון שלך מוכן ומחכה לך!</div>
                <div class="success-subtitle">כל מה שנותר זה להתחבר ולהתחיל ללמוד</div>
            </div>
            
            <div class="cta-section">
                <a href="${data.siteUrl}/login" class="cta-button">
                    בואו נתחיל ללמוד ←
                </a>
            </div>
            
            <div class="login-card">
                <div class="login-title">
                    <span style="margin-left: 10px">🔑</span>פרטי ההתחברות שלך
                </div>
                <div class="info-row">
                    <span class="info-label">כתובת המייל</span>
                    <span class="info-value">${data.email}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">שם המשתמש</span>
                    <span class="info-value">${data.userName}</span>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <div class="footer-message">
                מצפים לראות אותך בפורטל! 🌟
            </div>
            <div class="footer-note">
                מייל זה נשלח אוטומטית ממערכת פורטל הקורסים<br>
                אין להשיב למייל זה
            </div>
        </div>
    </div>
</body>
</html>
    `;
  }

  async sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
    try {
      const transporter = await this.getTransporter();
      const config = this.getEmailConfig();

      const mailOptions = {
        from: `"פורטל הקורסים" <${config.user}>`,
        to: data.email,
        subject: '✨ החשבון שלך מוכן - פורטל הקורסים',
        html: this.generateWelcomeEmailHTML(data),
        text: `
שלום ${data.userName} 👋

החשבון שלך בפורטל הקורסים מוכן! ✨

פרטי התחברות:
• כתובת מייל: ${data.email}
• שם משתמש: ${data.userName}

להתחברות: ${data.siteUrl}/login

בהצלחה בלימודים! 🌟
        `.trim(),
      };

      const result = await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return false;
    }
  }

  private generateBulkEmailHTML(message: string, siteUrl: string): string {
    return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>הודעה מפורטל הקורסים</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 30px 20px;
            direction: rtl;
            text-align: right;
            line-height: 1.6;
        }
        
        .email-container {
            max-width: 500px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
            border: 2px solid #e5e7eb;
        }
        
        .header {
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            padding: 28px 32px;
            text-align: center;
            color: white;
            position: relative;
            overflow: hidden;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.08"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.08"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.08"/><circle cx="10" cy="60" r="0.5" fill="white" opacity="0.08"/><circle cx="90" cy="40" r="0.5" fill="white" opacity="0.08"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
            pointer-events: none;
        }
        
        .header-content {
            position: relative;
            z-index: 1;
            display: inline-flex;
            align-items: baseline;
            gap: 12px;
            direction: rtl;
        }
        
        .header h1 {
            font-size: 22px;
            font-weight: 700;
            margin: 0;
            letter-spacing: -0.3px;
            line-height: 1.2;
            text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .header-icon {
            font-size: 22px;
            line-height: 1;
            vertical-align: baseline;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15));
            margin-top: -2px;
            margin-right: 10px;
        }
        
        .content {
            padding: 32px;
            text-align: right;
        }
        
        .message-content {
            font-size: 16px;
            color: #1f2937;
            line-height: 1.8;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        
        .footer {
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            padding: 24px 32px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
        
        .footer-message {
            font-size: 16px;
            color: #4f46e5;
            font-weight: 600;
            margin-bottom: 8px;
        }
        
        .footer-note {
            font-size: 12px;
            color: #9ca3af;
            margin-top: 12px;
            line-height: 1.4;
        }
        
        @media (max-width: 600px) {
            body {
                padding: 20px 10px;
            }
            
            .content {
                padding: 24px;
            }
            
            .header {
                padding: 20px 24px;
            }
            
            .footer {
                padding: 20px 24px;
            }
        }
    </style>
</head>
<body style="direction: rtl;">
    <div class="email-container">
        <div class="header">
            <div class="header-content">
                <h1>פורטל הקורסים</h1>
                <span class="header-icon">🎓</span>
            </div>
        </div>
        
        <div class="content">
            <div class="message-content">${message.replace(/\n/g, '<br>')}</div>
        </div>
        
        <div class="footer">
            <div class="footer-message">
                פורטל הקורסים 🌟
            </div>
            <div class="footer-note">
                מייל זה נשלח אוטומטית ממערכת פורטל הקורסים<br>
                אין להשיב למייל זה
            </div>
        </div>
    </div>
</body>
</html>
    `;
  }

  async sendBulkEmail(data: {
    recipients: string[];
    subject: string;
    message: string;
    siteUrl: string;
  }): Promise<boolean> {
    try {
      const transporter = await this.getTransporter();
      const config = this.getEmailConfig();

      const mailOptions = {
        from: `"פורטל הקורסים" <${config.user}>`,
        bcc: data.recipients, // Send as BCC
        subject: data.subject,
        html: this.generateBulkEmailHTML(data.message, data.siteUrl),
        text: data.message,
      };

      await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error sending bulk email:', error);
      return false;
    }
  }

  async testEmailConnection(): Promise<boolean> {
    try {
      const transporter = await this.getTransporter();
      await transporter.verify();
      return true;
    } catch (error) {
      return false;
    }
  }
}

export const emailService = new EmailService();