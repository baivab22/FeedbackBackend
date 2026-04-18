const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const router = express.Router();

const progressOtpStore = new Map();
const PROGRESS_OTP_TTL_MS = 10 * 60 * 1000;
const PROGRESS_OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const PROGRESS_OTP_MAX_ATTEMPTS = 5;
const PROGRESS_VERIFICATION_TOKEN_TTL = '1h';
const PROGRESS_OTP_ALLOW_CONSOLE_FALLBACK = false;
const PROGRESS_JWT_SECRET = 'replace_with_strong_secret';

const SMTP_CONFIG = {
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  user: 'planingdirectoratetu@gmail.com',
  pass: 'jjuu pqpt zfbh qxlm',
  fromAddress: 'planingdirectoratetu@gmail.com',
};

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function hashOtp(otp) {
  return crypto.createHash('sha256').update(String(otp)).digest('hex');
}

function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function getProgressMailerConfig() {
  const host = String(SMTP_CONFIG.host || '').trim();
  const port = Number(SMTP_CONFIG.port || 0);
  const secure = Boolean(SMTP_CONFIG.secure);
  const user = String(SMTP_CONFIG.user || '').trim();
  const pass = String(SMTP_CONFIG.pass || '');
  const fromAddress = String(SMTP_CONFIG.fromAddress || '').trim();

  if (!host || !port || !fromAddress) {
    return {
      configured: false,
      mailer: null,
      fromAddress,
    };
  }

  const auth = user && pass ? { user, pass } : undefined;

  return {
    configured: true,
    mailer: nodemailer.createTransport({
      host,
      port,
      secure,
      auth,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    }),
    fromAddress,
  };
}

function cleanupExpiredProgressOtps() {
  const now = Date.now();
  for (const [email, record] of progressOtpStore.entries()) {
    if (!record || record.expiresAt <= now) {
      progressOtpStore.delete(email);
    }
  }
}

setInterval(cleanupExpiredProgressOtps, 5 * 60 * 1000).unref?.();

async function sendProgressOtpEmail(email, otp) {
  const { configured, mailer, fromAddress } = getProgressMailerConfig();
  const subject = 'Your progress form verification code';
  const text = `Your verification code is ${otp}. It expires in 10 minutes.`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">
      <h2 style="margin:0 0 12px">Progress Form Verification</h2>
      <p style="margin:0 0 16px">Use the code below to unlock the progress form.</p>
      <div style="display:inline-block;padding:14px 18px;font-size:28px;letter-spacing:6px;font-weight:700;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;color:#1d4ed8">${otp}</div>
      <p style="margin:16px 0 0;color:#475569">This code expires in 10 minutes and can only be used once.</p>
    </div>
  `;

  if (mailer && fromAddress) {
    await mailer.sendMail({
      from: fromAddress,
      to: email,
      subject,
      text,
      html,
    });
    return { deliveryMode: 'smtp', delivered: true, configured };
  }

  if (PROGRESS_OTP_ALLOW_CONSOLE_FALLBACK) {
    console.warn(`[progress-otp] SMTP is not configured. OTP for ${email}: ${otp}`);
    return { deliveryMode: 'console', delivered: false, configured };
  }

  throw new Error('Email service is not configured');
}

function signProgressVerificationToken(email) {
  return jwt.sign(
    { sub: email, email, purpose: 'progress-form-otp' },
    PROGRESS_JWT_SECRET,
    { expiresIn: PROGRESS_VERIFICATION_TOKEN_TTL }
  );
}

router.post('/request', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    cleanupExpiredProgressOtps();

    const { configured } = getProgressMailerConfig();
    if (!configured && !PROGRESS_OTP_ALLOW_CONSOLE_FALLBACK) {
      return res.status(503).json({
        success: false,
        message: 'Email service is not configured on the server. Configure SMTP or explicitly enable PROGRESS_OTP_ALLOW_CONSOLE_FALLBACK=true for non-email environments.',
        configured: false,
      });
    }

    const existingRecord = progressOtpStore.get(email);
    const now = Date.now();
    if (existingRecord && existingRecord.cooldownUntil > now) {
      return res.status(429).json({
        success: false,
        message: 'Please wait before requesting another OTP',
        resendAfterSeconds: Math.ceil((existingRecord.cooldownUntil - now) / 1000),
      });
    }

    const otp = generateOtp();
    progressOtpStore.set(email, {
      otpHash: hashOtp(otp),
      expiresAt: now + PROGRESS_OTP_TTL_MS,
      cooldownUntil: now + PROGRESS_OTP_RESEND_COOLDOWN_MS,
      attempts: 0,
    });

    const delivery = await sendProgressOtpEmail(email, otp);
    const delivered = delivery.deliveryMode === 'smtp';

    return res.json({
      success: true,
      message: delivered
        ? 'OTP sent to your email address'
        : 'Email service is not configured in this environment. OTP was generated for development and logged on the server, not emailed.',
      deliveryMode: delivery.deliveryMode,
      delivered,
      configured: delivery.configured,
      expiresInSeconds: Math.round(PROGRESS_OTP_TTL_MS / 1000),
      resendAfterSeconds: Math.round(PROGRESS_OTP_RESEND_COOLDOWN_MS / 1000),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to send OTP',
      error: error.message,
    });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const otp = String(req.body?.otp || '').trim();

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    cleanupExpiredProgressOtps();

    const record = progressOtpStore.get(email);
    if (!record) {
      return res.status(400).json({ success: false, message: 'OTP has expired or was not requested' });
    }

    const now = Date.now();
    if (record.expiresAt <= now) {
      progressOtpStore.delete(email);
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    if (record.attempts >= PROGRESS_OTP_MAX_ATTEMPTS) {
      progressOtpStore.delete(email);
      return res.status(429).json({ success: false, message: 'Too many failed attempts. Request a new OTP.' });
    }

    if (record.otpHash !== hashOtp(otp)) {
      record.attempts += 1;
      progressOtpStore.set(email, record);
      return res.status(401).json({
        success: false,
        message: 'Invalid OTP',
        remainingAttempts: Math.max(PROGRESS_OTP_MAX_ATTEMPTS - record.attempts, 0),
      });
    }

    progressOtpStore.delete(email);
    const verificationToken = signProgressVerificationToken(email);

    return res.json({
      success: true,
      message: 'Email verified successfully',
      verificationToken,
      expiresInSeconds: 60 * 60,
      email,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to verify OTP',
      error: error.message,
    });
  }
});

module.exports = router;
