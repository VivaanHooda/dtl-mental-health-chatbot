import nodemailer from 'nodemailer';

export interface EmergencyEmailData {
  emergencyContactEmail: string;
  userName: string;
  userEmail: string;
  timestamp: Date;
}

const createTransporter = () => {
  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT || '587');
  const user = process.env.EMAIL_USER;
  const password = process.env.EMAIL_PASSWORD;

  if (!host || !user || !password) {
    throw new Error('Email configuration missing');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass: password },
  });
};

export async function sendEmergencyAlert(data: EmergencyEmailData): Promise<boolean> {
  try {
    console.log('📧 Sending emergency alert to:', data.emergencyContactEmail);
    
    const transporter = createTransporter();
    
    const message = `🚨 URGENT: Mental Health Emergency Alert

${data.userName} (${data.userEmail}) has expressed concerning thoughts that may indicate a crisis.

Time: ${data.timestamp.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST

IMMEDIATE ACTION REQUIRED:
1. Contact ${data.userName} RIGHT NOW - call, text, or visit in person
2. Do NOT leave them alone
3. Remove any means of self-harm
4. Call crisis hotlines or emergency services if needed

24/7 CRISIS HOTLINES:
- AASRA: 91-9820466726
- Vandrevala Foundation: 1860-2662-345
- Emergency: 108

IF IN IMMEDIATE DANGER:
- Call 108 (ambulance)
- Go to nearest hospital emergency room
- Contact campus security

This is an automated alert from DTL Mental Health Chatbot.
`;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: data.emergencyContactEmail,
      subject: `🚨 URGENT: Emergency Alert for ${data.userName}`,
      text: message,
      priority: 'high',
    });
    
    console.log('✅ Emergency alert sent successfully');
    return true;
  } catch (error: any) {
    console.error('❌ Failed to send emergency alert:', error);
    return false;
  }
}