// utils/emailService.js
const brevo = require('@getbrevo/brevo');

function getBrevoApi() {
  const apiInstance = new brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);
  return apiInstance;
}

async function sendVerificationEmail(email, username, verificationToken) {
  if (!process.env.BREVO_API_KEY) {
    console.warn('⚠️ Brevo API key not configured. Verification email not sent.');
    return null;
  }

  const apiInstance = getBrevoApi();
  const fromEmail = process.env.FROM_EMAIL || 'your-email@gmail.com';

  const verifyUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/verify-email.html?token=${verificationToken}`;

  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.sender = { email: fromEmail, name: 'Rice Gallery' };
  sendSmtpEmail.to = [{ email }];
  sendSmtpEmail.subject = 'Verify Your Email - Rice Gallery';
  sendSmtpEmail.textContent = `Hi ${username},\n\nWelcome to Rice Gallery! Please verify your email by clicking the link below:\n\n${verifyUrl}\n\nThis link will expire in 24 hours.\n\nIf you didn't create an account, please ignore this email.`;
  sendSmtpEmail.htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #5D5FEF;">Welcome to Rice Gallery!</h2>
          <p>Hi ${username},</p>
          <p>Thanks for signing up! Please verify your email by clicking the button below:</p>
          <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background-color: #5D5FEF; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">Verify Email</a>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #5D5FEF;">${verifyUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #888; font-size: 12px;">If you didn't create an account, please ignore this email.</p>
        </div>
      </body>
    </html>
  `;

  const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
  console.log('📧 Verification email sent to:', email);
  return result;
}

async function sendPasswordResetEmail(email, username, resetCode) {
  if (!process.env.BREVO_API_KEY) {
    console.warn('⚠️ Brevo API key not configured. Password reset email not sent.');
    return null;
  }

  const apiInstance = getBrevoApi();
  const fromEmail = process.env.FROM_EMAIL || 'your-email@gmail.com';

  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.sender = { email: fromEmail, name: 'Rice Gallery' };
  sendSmtpEmail.to = [{ email }];
  sendSmtpEmail.subject = 'Password Reset Request - Rice Gallery';
  sendSmtpEmail.textContent = `Hi ${username},\n\nYou requested a password reset. Use the code below to reset your password:\n\n${resetCode}\n\nThis code will expire in 1 hour.\n\nIf you didn't request this, please ignore this email and your password will remain unchanged.`;
  sendSmtpEmail.htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #5D5FEF;">Password Reset Request</h2>
          <p>Hi ${username},</p>
          <p>You requested a password reset. Use the code below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="display: inline-block; padding: 16px 32px; background-color: #f0f0f0; border: 2px solid #5D5FEF; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #5D5FEF;">${resetCode}</span>
          </div>
          <p>This code will expire in 1 hour.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #888; font-size: 12px;">If you didn't request this, please ignore this email and your password will remain unchanged.</p>
        </div>
      </body>
    </html>
  `;

  const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
  console.log('📧 Password reset email sent to:', email);
  return result;
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
