const nodemailer = require('nodemailer');
const config = require('./config');

let transporter = null;

function initTransporter() {
  if (!config.gmail.user || !config.gmail.appPassword) {
    console.log('⚠️  Email notifications disabled: GMAIL_USER or GMAIL_APP_PASSWORD not set in .env');
    return false;
  }

  try {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.gmail.user,
        pass: config.gmail.appPassword,
      },
    });
    console.log(`📧 Email notifications configured for recipient: ${config.gmail.notifyEmail}`);
    return true;
  } catch (err) {
    console.error('❌ Failed to initialize email transporter:', err.message);
    return false;
  }
}

/**
 * Format email HTML for newly discovered jobs
 */
function formatEmailHtml(newJobs) {
  const remoteCount = newJobs.filter(j => j.workplaceType === 'Remote' || (j.location && j.location.toLowerCase().includes('remote'))).length;
  const pittsburghCount = newJobs.filter(j => j.isPittsburgh).length;
  const top100Count = newJobs.filter(j => j.isTop100).length;

  const jobCardsHtml = newJobs.slice(0, 30).map(job => {
    const isPgh = job.isPittsburgh;
    const isTop100 = job.isTop100;
    const skillsList = (job.matchedSkills || []).slice(0, 4).map(s => 
      `<span style="display:inline-block; padding:2px 8px; margin:2px; font-size:11px; background:#f1f5f9; color:#334155; border-radius:12px; border:1px solid #e2e8f0;">${s}</span>`
    ).join(' ');

    return `
      <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:10px; padding:18px; margin-bottom:14px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
          <div>
            <h3 style="margin:0 0 4px 0; color:#0f172a; font-size:16px; font-weight:600;">${job.title}</h3>
            <div style="color:#475569; font-size:14px; font-weight:500;">🏢 ${job.company || 'Unknown Company'}</div>
          </div>
          ${job.matchScore ? `<div style="background:#ecfdf5; color:#047857; font-weight:700; font-size:12px; padding:4px 10px; border-radius:20px; border:1px solid #a7f3d0;">${job.matchScore}% Match</div>` : ''}
        </div>

        <div style="margin-bottom:10px; font-size:13px; color:#64748b;">
          <span>📍 ${job.location || 'United States'}</span>
          ${job.listDate ? `<span style="margin-left:12px;">🕒 ${job.listDate}</span>` : ''}
        </div>

        <div style="margin-bottom:12px;">
          ${job.workplaceType === 'Remote' ? '<span style="display:inline-block; padding:3px 9px; margin-right:6px; font-size:11px; font-weight:600; background:#eff6ff; color:#1d4ed8; border-radius:6px; border:1px solid #bfdbfe;">🌐 Remote</span>' : ''}
          ${isPgh ? '<span style="display:inline-block; padding:3px 9px; margin-right:6px; font-size:11px; font-weight:600; background:#fef3c7; color:#b45309; border-radius:6px; border:1px solid #fde68a;">📍 Pittsburgh Area</span>' : ''}
          ${isTop100 ? '<span style="display:inline-block; padding:3px 9px; margin-right:6px; font-size:11px; font-weight:600; background:#f0fdf4; color:#15803d; border-radius:6px; border:1px solid #bbf7d0;">⭐ Top 100 Employer</span>' : ''}
          ${skillsList}
        </div>

        <div style="display:flex; gap:10px; margin-top:10px;">
          <a href="${job.companyApplyUrl}" target="_blank" style="display:inline-block; background:#0f172a; color:#ffffff; padding:8px 14px; border-radius:6px; text-decoration:none; font-size:13px; font-weight:600;">Apply on Company Site →</a>
          <a href="${job.url}" target="_blank" style="display:inline-block; background:#f8fafc; color:#0f172a; border:1px solid #cbd5e1; padding:8px 14px; border-radius:6px; text-decoration:none; font-size:13px; font-weight:500;">View on LinkedIn</a>
        </div>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background:#f8fafc; margin:0; padding:24px; color:#1e293b;">
      <div style="max-width:680px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
        
        <!-- Header -->
        <div style="background:#0f172a; padding:24px; color:#ffffff;">
          <h1 style="margin:0 0 6px 0; font-size:22px; font-weight:700;">🎯 New QA & SDET Job Openings</h1>
          <p style="margin:0; color:#94a3b8; font-size:14px;">Tailored for Ankita Agrawal • 11+ Years Experience</p>
        </div>

        <!-- Summary stats -->
        <div style="background:#f1f5f9; padding:16px 24px; border-bottom:1px solid #e2e8f0; display:flex; gap:18px;">
          <div style="font-size:13px; font-weight:600; color:#0f172a;">🔥 ${newJobs.length} New Openings</div>
          <div style="font-size:13px; color:#475569;">🌐 ${remoteCount} Remote</div>
          <div style="font-size:13px; color:#475569;">📍 ${pittsburghCount} Pittsburgh Area</div>
          <div style="font-size:13px; color:#475569;">⭐ ${top100Count} Top 100 Employers</div>
        </div>

        <!-- Job cards container -->
        <div style="padding:20px 24px;">
          ${jobCardsHtml}
          ${newJobs.length > 30 ? `<p style="text-align:center; color:#64748b; font-size:13px;">+ ${newJobs.length - 30} more openings available in your local dashboard.</p>` : ''}
        </div>

        <!-- Footer -->
        <div style="background:#f8fafc; border-top:1px solid #e2e8f0; padding:16px 24px; text-align:center; font-size:12px; color:#64748b;">
          <p style="margin:0 0 6px 0;">Dashboard: <a href="http://localhost:${config.port}" style="color:#2563eb; text-decoration:none; font-weight:600;">Open SDET Job Monitor</a></p>
          <p style="margin:0;">Automatically updated every 3 hours • No sponsorship required</p>
        </div>

      </div>
    </body>
    </html>
  `;
}

/**
 * Send notification email with newly found jobs
 */
async function sendNotification(newJobs) {
  if (!transporter) {
    const initialized = initTransporter();
    if (!initialized) {
      return { sent: false, reason: 'Email transporter not configured' };
    }
  }

  if (!newJobs || newJobs.length === 0) {
    return { sent: false, reason: 'No new jobs to notify' };
  }

  const subject = `🎯 ${newJobs.length} New QA & SDET Jobs: ${newJobs[0].title} at ${newJobs[0].company} (+${newJobs.length - 1} more)`;
  const html = formatEmailHtml(newJobs);

  try {
    const mailOptions = {
      from: `"SDET Job Monitor" <${config.gmail.user}>`,
      to: config.gmail.notifyEmail,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Alert email sent to ${config.gmail.notifyEmail} (ID: ${info.messageId})`);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error('❌ Failed to send notification email:', err.message);
    return { sent: false, reason: err.message };
  }
}

module.exports = { initTransporter, sendNotification };
