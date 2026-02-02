import nodemailer from 'nodemailer';

interface EmailConfig {
  host: string;
  // port: number;
  // secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface WelcomeEmailData {
  email: string;
  userName: string;
  role: string;
  organizationName?: string;
  groupName?: string;
  loginUrl: string;
  password?: string; // רק למצב יצירה ישירה
  isInvitation?: boolean; // האם זו הזמנה או יצירה ישירה
  invitationToken?: string; // טוקן הזמנה
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    console.log('=== EmailService Constructor ===');
    this.initializeTransporter();
  }

  private initializeTransporter() {
    console.log('=== Initializing Email Transporter ===');
    // בדיקה אם יש הגדרות מייל במשתני הסביבה
    const emailHost = process.env.EMAIL_HOST;
    const emailPort = process.env.EMAIL_PORT;
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    console.log('Email configuration check:', {
      hasHost: !!emailHost,
      hasPort: !!emailPort,
      hasUser: !!emailUser,
      hasPass: !!emailPass,
      host: emailHost,
      port: emailPort,
      user: emailUser ? emailUser.substring(0, 3) + '***' : 'undefined'
    });

    if (!emailHost || !emailUser || !emailPass) {
      console.warn('=== Email configuration not found ===');
      console.warn('Email sending will be disabled.');
      console.warn('Missing:', {
        host: !emailHost,
        user: !emailUser,
        pass: !emailPass
      });
      return;
    }

    console.log('=== Creating nodemailer transporter ===');
    const config: EmailConfig = {
      host: emailHost,
      // port: parseInt(emailPort || '587'),
      // secure: emailPort === '465', // true for 465, false for other ports
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    };

    console.log('Email config:', {
      host: config.host,
      port: config.port,
      secure: config.secure,
      user: config.auth.user
    });

    try {
      this.transporter = nodemailer.createTransporter(config);
      console.log('✅ Nodemailer transporter created successfully');
    } catch (error) {
      console.error('❌ Error creating nodemailer transporter:', error);
      this.transporter = null;
    }
  }

  private generateWelcomeEmailHTML(data: WelcomeEmailData): string {
    const {
      userName,
      role,
      organizationName,
      groupName,
      loginUrl,
      password,
      isInvitation,
      invitationToken
    } = data;

    const roleNames: Record<string, string> = {
      student: 'סטודנט',
      instructor: 'מרצה',
      moderator: 'מנחה',
      org_admin: 'מנהל ארגון',
      admin: 'מנהל מערכת'
    };

    const finalLoginUrl = isInvitation && invitationToken 
      ? `${loginUrl}/accept-invitation?token=${invitationToken}`
      : loginUrl;

    return `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ברוכים הבאים לפלטפורמת הלמידה</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
                direction: rtl;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px 20px;
                text-align: center;
            }
            .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 300;
            }
            .header p {
                margin: 10px 0 0 0;
                font-size: 16px;
                opacity: 0.9;
            }
            .content {
                padding: 40px 30px;
            }
            .welcome-message {
                background-color: #f8f9ff;
                border-right: 4px solid #667eea;
                padding: 20px;
                margin: 20px 0;
                border-radius: 5px;
            }
            .user-details {
                background-color: #f9f9f9;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
            }
            .user-details h3 {
                margin-top: 0;
                color: #667eea;
                font-size: 18px;
            }
            .detail-row {
                display: flex;
                justify-content: space-between;
                margin: 10px 0;
                padding: 8px 0;
                border-bottom: 1px solid #eee;
            }
            .detail-row:last-child {
                border-bottom: none;
            }
            .detail-label {
                font-weight: 600;
                color: #555;
            }
            .detail-value {
                color: #333;
            }
            .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 15px 30px;
                text-decoration: none;
                border-radius: 25px;
                font-weight: 600;
                font-size: 16px;
                text-align: center;
                margin: 20px 0;
                transition: transform 0.2s ease;
            }
            .cta-button:hover {
                transform: translateY(-2px);
            }
            .password-section {
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
            }
            .password-section h4 {
                margin-top: 0;
                color: #856404;
            }
            .password-display {
                background-color: #fff;
                border: 2px dashed #ffeaa7;
                padding: 15px;
                border-radius: 5px;
                font-family: 'Courier New', monospace;
                font-size: 18px;
                font-weight: bold;
                text-align: center;
                color: #856404;
                margin: 10px 0;
            }
            .footer {
                background-color: #f8f9fa;
                padding: 20px;
                text-align: center;
                color: #666;
                font-size: 14px;
            }
            .footer a {
                color: #667eea;
                text-decoration: none;
            }
            .security-note {
                background-color: #e8f4fd;
                border-right: 4px solid #3498db;
                padding: 15px;
                margin: 20px 0;
                border-radius: 5px;
                font-size: 14px;
            }
            @media (max-width: 600px) {
                .container {
                    margin: 10px;
                    border-radius: 5px;
                }
                .content {
                    padding: 20px 15px;
                }
                .header {
                    padding: 20px 15px;
                }
                .detail-row {
                    flex-direction: column;
                    gap: 5px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎓 ברוכים הבאים לפלטפורמת הלמידה</h1>
                <p>${isInvitation ? 'הוזמנת להצטרף אלינו!' : 'החשבון שלך מוכן!'}</p>
            </div>
            
            <div class="content">
                <div class="welcome-message">
                    <h2>שלום ${userName || 'משתמש יקר'},</h2>
                    <p>
                        ${isInvitation 
                          ? 'אנחנו שמחים להזמין אותך להצטרף לפלטפורמת הלמידה שלנו! חשבון חדש נוצר עבורך ואתה מוזמן להתחיל ללמוד.'
                          : 'חשבון חדש נוצר עבורך בפלטפורמת הלמידה שלנו! אתה מוזמן להתחבר ולהתחיל ללמוד.'
                        }
                    </p>
                </div>

                <div class="user-details">
                    <h3>פרטי החשבון שלך:</h3>
                    <div class="detail-row">
                        <span class="detail-label">כתובת מייל:</span>
                        <span class="detail-value">${data.email}</span>
                    </div>
                    ${userName ? `
                    <div class="detail-row">
                        <span class="detail-label">שם משתמש:</span>
                        <span class="detail-value">${userName}</span>
                    </div>
                    ` : ''}
                    <div class="detail-row">
                        <span class="detail-label">תפקיד:</span>
                        <span class="detail-value">${roleNames[role] || role}</span>
                    </div>
                    ${organizationName ? `
                    <div class="detail-row">
                        <span class="detail-label">ארגון:</span>
                        <span class="detail-value">${organizationName}</span>
                    </div>
                    ` : ''}
                    ${groupName ? `
                    <div class="detail-row">
                        <span class="detail-label">קבוצה:</span>
                        <span class="detail-value">${groupName}</span>
                    </div>
                    ` : ''}
                </div>

                ${password ? `
                <div class="password-section">
                    <h4>🔐 פרטי התחברות</h4>
                    <p>הסיסמה הזמנית שלך היא:</p>
                    <div class="password-display">${password}</div>
                    <p><strong>חשוב:</strong> מומלץ לשנות את הסיסמה לאחר ההתחברות הראשונה.</p>
                </div>
                ` : ''}

                <div style="text-align: center; margin: 30px 0;">
                    <a href="${finalLoginUrl}" class="cta-button">
                        ${isInvitation ? '🚀 השלמת ההרשמה' : '🎯 התחברות למערכת'}
                    </a>
                </div>

                <div class="security-note">
                    <strong>💡 טיפים לשימוש במערכת:</strong>
                    <ul style="margin: 10px 0; padding-right: 20px;">
                        <li>שמור על פרטי ההתחברות שלך במקום בטוח</li>
                        <li>אל תשתף את פרטי ההתחברות עם אחרים</li>
                        <li>במידה ושכחת את הסיסמה, תוכל לאפס אותה דרך המערכת</li>
                        <li>לכל שאלה או בעיה, פנה לתמיכה הטכנית</li>
                    </ul>
                </div>
            </div>

            <div class="footer">
                <p>מייל זה נשלח אוטומטית ממערכת ניהול הלמידה</p>
                <p>אם קיבלת מייל זה בטעות, אנא התעלם ממנו</p>
                <p>© 2026 פלטפורמת הלמידה - כל הזכויות שמורות</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  async sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
    if (!this.transporter) {
      console.warn('Email transporter not configured. Skipping email send.');
      return false;
    }

    try {
      const htmlContent = this.generateWelcomeEmailHTML(data);
      
      const mailOptions = {
        from: {
          name: 'פלטפורמת הלמידה',
          address: process.env.EMAIL_USER || 'noreply@example.com'
        },
        to: data.email,
        subject: data.isInvitation 
          ? `🎓 הוזמנת להצטרף לפלטפורמת הלמידה - ${data.userName || 'משתמש יקר'}`
          : `🎯 החשבון שלך מוכן! ברוכים הבאים לפלטפורמת הלמידה`,
        html: htmlContent,
        // גרסת טקסט פשוט כגיבוי
        text: `
שלום ${data.userName || 'משתמש יקר'},

${data.isInvitation 
  ? 'הוזמנת להצטרף לפלטפורמת הלמידה שלנו!'
  : 'חשבון חדש נוצר עבורך בפלטפורמת הלמידה!'
}

פרטי החשבון:
- כתובת מייל: ${data.email}
${data.userName ? `- שם משתמש: ${data.userName}` : ''}
- תפקיד: ${data.role}
${data.organizationName ? `- ארגון: ${data.organizationName}` : ''}
${data.groupName ? `- קבוצה: ${data.groupName}` : ''}

${data.password ? `הסיסמה הזמנית שלך: ${data.password}` : ''}

לכניסה למערכת: ${data.loginUrl}

בברכה,
צוות פלטפורמת הלמידה
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Welcome email sent successfully:', result.messageId);
      return true;
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      console.log('Email server connection verified');
      return true;
    } catch (error) {
      console.error('Email server connection failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
export type { WelcomeEmailData };