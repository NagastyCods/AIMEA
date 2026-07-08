import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const emailUser = String(process.env.EMAIL_USER || '').trim();
const emailPassword = String(process.env.EMAIL_PASSWORD || '').replace(/\s+/g, '');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: emailUser,
    pass: emailPassword
  }
});

export const sendContactMessage = async (name, email, subject, message) => {
  const recipient = process.env.EMERGENCY_TEAM_EMAIL || process.env.EMAIL_USER;
  const mailOptions = {
    from: `AIMEA Support <${emailUser}>`,
    to: recipient,
    replyTo: email,
    subject: `🚨 Contact Request: ${subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
        <div style="background-color: #2a6af8; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="margin: 0;">📩 New Contact Request</h2>
        </div>
        <div style="background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <p><strong>From:</strong> ${name}</p>
          <p><strong>Reply Email:</strong> ${email}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
          <p style="margin-top: 20px; padding: 15px; background-color: #e7f3ff; border-radius: 5px;">
            <strong>Action Required:</strong> Please respond to the sender as soon as possible.
          </p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true, message: 'Contact message sent successfully' };
  } catch (error) {
    console.error('Contact email sending error:', error);
    return { success: false, error: error.message };
  }
};

export const sendEmergencyAlert = async (contactEmail, userName, symptom, location, ambulanceRequest = false) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: contactEmail,
    subject: `🚨 Emergency Alert${ambulanceRequest ? ' + Ambulance Request' : ''}`,
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
        <div style="background-color: #ff4444; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="margin: 0;">⚠️ EMERGENCY ALERT</h2>
        </div>
        <div style="background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <p><strong>${userName}</strong> has activated the emergency assistance system.</p>
          <p><strong>Reported Symptoms:</strong> ${symptom}</p>
          ${location ? `<p><strong>Last Known Location:</strong> ${location}</p>` : ''}
          ${ambulanceRequest ? `<p style="margin-top: 10px;"><strong>An ambulance has been requested.</strong></p>` : ''}
          <p style="margin-top: 20px; padding: 15px; background-color: #fff3cd; border-radius: 5px;">
            <strong>Action Required:</strong> Please respond immediately and coordinate with local emergency services.
          </p>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            This is an automated alert from AIMEA (AI Medical Emergency Assistant). If this is a mistake, please contact the user directly.
          </p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true, message: 'Alert sent successfully' };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: error.message };
  }
};

export const sendTeamAlert = async (teamEmail, userName, symptom, location, ambulanceRequest = false) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: teamEmail,
    subject: `🚑 Emergency Team Alert${ambulanceRequest ? ' + Ambulance Requested' : ''}`,
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
        <div style="background-color: #2a6af8; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="margin: 0;">🚨 Emergency Team Notification</h2>
        </div>
        <div style="background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <p><strong>${userName}</strong> has requested emergency support.</p>
          <p><strong>Reported Symptoms:</strong> ${symptom}</p>
          ${location ? `<p><strong>Location:</strong> ${location}</p>` : ''}
          ${ambulanceRequest ? `<p style="margin-top: 10px;"><strong>An ambulance request has been made.</strong></p>` : ''}
          <p style="margin-top: 20px; padding: 15px; background-color: #e7f3ff; border-radius: 5px;">
            <strong>Immediate Action Required:</strong> Dispatch medical transport and contact the user.
          </p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true, message: 'Team alert sent successfully' };
  } catch (error) {
    console.error('Team email sending error:', error);
    return { success: false, error: error.message };
  }
};

export const sendProfileUpdateConfirmation = async (userEmail, userName) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: userEmail,
    subject: 'AIMEA - Profile Updated Successfully',
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Hi ${userName},</h2>
        <p>Your profile has been updated successfully.</p>
        <p>If you did not make these changes, please contact support immediately.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false };
  }
};
