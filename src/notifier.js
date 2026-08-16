const nodemailer = require('nodemailer');
const config = require('./config');
const { escapeHtml, sanitizeSafeHttpsUrl } = require('./security');

let transporter = null;

function initTransporter() {
  if (!config.gmail.user || !config.gmail.appPassword) {
    console.log('⚠️  Email notifications disabled: GMAIL_USER or GMAIL_APP_PASSWORD not configured');
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
    console.log(`📧 Email notifications configured for: ${config.gmail.notifyEmail}`);
    return true;
  } catch (err) {
    console.error('❌ Failed to initialize email transporter:', err.message);
    return false;
  }
}

/**
 * Format rich HTML email with full scan statistics and top matched jobs
 * All untrusted fields are escaped with escapeHtml and URLs validated with sanitizeSafeHttpsUrl
 */
function formatEmailHtml(newJobs, totalStats = null) {
  const remoteCount = newJobs.filter(j => j.workplaceType === 'Remote' || (j.location && j.location.toLowerCase().includes('remote'))).length;
  const pittsburghCount = newJobs.filter(j => j.isPittsburgh).length;
  const top100Count = newJobs.filter(j => j.isTop100).length;

  const totalAll = totalStats ? totalStats.totalJobs : newJobs.length;
  const totalRemote = totalStats ? totalStats.remoteJobs : remoteCount;
  const totalPgh = totalStats ? totalStats.pittsburghJobs : pittsburghCount;
  const totalTop100 = totalStats ? totalStats.top100Jobs : top100Count;

  const jobCardsHtml = newJobs.slice(0, 25).map(job => {
    const isPgh = job.isPittsburgh;
    const isTop100 = job.isTop100;
    const skillsList = (job.matchedSkills || []).slice(0, 4).map(s => 
      `<span style="display:inline-block; padding:2px 8px; margin:2px; font-size:11px; background:#f1f5f9; color:#334155; border-radius:12px; border:1px solid #e2e8f0;">${escapeHtml(s)}</span>`
    ).join(' ');

    const safeApplyUrl = sanitizeSafeHttpsUrl(job.companyApplyUrl);
    const safeLinkedInUrl = sanitizeSafeHttpsUrl(job.url);

    return `
      <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:10px; padding:16px 18px; margin-bottom:14px; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
          <div>
            <h3 style="margin:0 0 4px 0; color:#0f172a; font-size:15px; font-weight:700;">${escapeHtml(job.title)}</h3>
            <div style="color:#334155; font-size:13px; font-weight:600;">🏢 ${escapeHtml(job.company || 'Unknown Company')}</div>
          </div>
          ${job.matchScore ? `<div style="background:#ecfdf5; color:#047857; font-weight:700; font-size:12px; padding:3px 9px; border-radius:20px; border:1px solid #a7f3d0;">${escapeHtml(job.matchScore)}% Match</div>` : ''}
        </div>

        <div style="margin-bottom:8px; font-size:12px; color:#64748b;">
          <span>📍 ${escapeHtml(job.location || 'United States')}</span>
          ${job.listDate ? `<span style="margin-left:12px;">🕒 ${escapeHtml(job.listDate)}</span>` : ''}
        </div>

        <div style="margin-bottom:10px;">
          ${job.workplaceType === 'Remote' ? '<span style="display:inline-block; padding:2px 8px; margin-right:4px; font-size:11px; font-weight:600; background:#eff6ff; color:#1d4ed8; border-radius:6px; border:1px solid #bfdbfe;">🌐 Remote</span>' : ''}
          ${isPgh ? '<span style="display:inline-block; padding:2px 8px; margin-right:4px; font-size:11px; font-weight:600; background:#fef3c7; color:#b45309; border-radius:6px; border:1px solid #fde68a;">📍 Pittsburgh Area</span>' : ''}
          ${isTop100 ? '<span style="display:inline-block; padding:2px 8px; margin-right:4px; font-size:11px; font-weight:600; background:#f0fdf4; color:#15803d; border-radius:6px; border:1px solid #bbf7d0;">⭐ Top 100 Employer</span>' : ''}
          ${skillsList}
        </div>

        <div style="display:flex; gap:8px; margin-top:8px;">
          <a href="${safeApplyUrl}" target="_blank" style="display:inline-block; background:#0f172a; color:#ffffff; padding:7px 12px; border-radius:6px; text-decoration:none; font-size:12px; font-weight:600;">🚀 Apply on Company Site →</a>
          <a href="${safeLinkedInUrl}" target="_blank" style="display:inline-block; background:#f8fafc; color:#0f172a; border:1px solid #cbd5e1; padding:7px 12px; border-radius:6px; text-decoration:none; font-size:12px; font-weight:500;">View on LinkedIn</a>
        </div>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background:#f8fafc; margin:0; padding:20px; color:#1e293b;">
      <div style="max-width:680px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
        
        <!-- Header -->
        <div style="background:#0f172a; padding:24px; color:#ffffff;">
          <h1 style="margin:0 0 6px 0; font-size:20px; font-weight:700;">🎯 SDET & QA 3-Hour Refresh Summary</h1>
          <p style="margin:0; color:#94a3b8; font-size:13px;">Automated LinkedIn Monitor for Ankita Agrawal (11+ Yrs SDET & QA Lead)</p>
        </div>

        <!-- Metric Statistics Bar -->
        <div style="background:#f1f5f9; padding:14px 20px; border-bottom:1px solid #e2e8f0; display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; text-align:center;">
          <div style="background:#ffffff; padding:10px 6px; border-radius:8px; border:1px solid #e2e8f0;">
            <div style="font-size:18px; font-weight:800; color:#0f172a;">${totalAll}</div>
            <div style="font-size:11px; color:#64748b; font-weight:600;">Total Openings</div>
          </div>
          <div style="background:#ffffff; padding:10px 6px; border-radius:8px; border:1px solid #e2e8f0;">
            <div style="font-size:18px; font-weight:800; color:#059669;">+${newJobs.length}</div>
            <div style="font-size:11px; color:#64748b; font-weight:600;">New Discovered</div>
          </div>
          <div style="background:#ffffff; padding:10px 6px; border-radius:8px; border:1px solid #e2e8f0;">
            <div style="font-size:18px; font-weight:800; color:#2563eb;">${totalRemote}</div>
            <div style="font-size:11px; color:#64748b; font-weight:600;">Remote (US)</div>
          </div>
          <div style="background:#ffffff; padding:10px 6px; border-radius:8px; border:1px solid #e2e8f0;">
            <div style="font-size:18px; font-weight:800; color:#d97706;">${totalPgh}</div>
            <div style="font-size:11px; color:#64748b; font-weight:600;">Pittsburgh Area</div>
          </div>
        </div>

        <!-- Job cards container -->
        <div style="padding:20px;">
          <h2 style="font-size:15px; font-weight:700; color:#0f172a; margin:0 0 14px 0;">🔥 Newly Discovered Roles</h2>
          ${newJobs.length > 0 ? jobCardsHtml : '<p style="color:#64748b; font-size:13px; text-align:center; padding:20px;">No new roles found in this 3-hour scan cycle. All existing roles are active in the live dashboard.</p>'}
          ${newJobs.length > 25 ? `<p style="text-align:center; color:#64748b; font-size:12px;">+ ${newJobs.length - 25} more openings available on your dashboard.</p>` : ''}
        </div>

        <!-- Footer -->
        <div style="background:#f8fafc; border-top:1px solid #e2e8f0; padding:16px 20px; text-align:center; font-size:12px; color:#64748b;">
          <p style="margin:0 0 8px 0; font-size:13px;">
            👉 <a href="https://ankitallm.github.io/sdet-job-monitor/" style="color:#2563eb; text-decoration:none; font-weight:700;">Open Live Web Dashboard</a>
          </p>
          <p style="margin:0;">Refreshed every 3 hours • Dual Track: Remote US + Pittsburgh Local</p>
        </div>

      </div>
    </body>
    </html>
  `;
}

/**
 * Send notification email with newly found jobs and summary stats
 */
async function sendNotification(newJobs, totalStats = null) {
  if (!transporter) {
    const initialized = initTransporter();
    if (!initialized) {
      return { sent: false, reason: 'Email transporter not configured' };
    }
  }

  const subject = newJobs && newJobs.length > 0
    ? `🎯 SDET Job Alert: ${newJobs.length} New Openings (${newJobs[0].title} at ${newJobs[0].company})`
    : `📊 SDET Job Refresh Summary: ${totalStats ? totalStats.totalJobs : 0} Total Active Roles`;

  const html = formatEmailHtml(newJobs || [], totalStats);

  try {
    const mailOptions = {
      from: `"SDET Job Monitor" <${config.gmail.user}>`,
      to: config.gmail.notifyEmail,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Summary email sent to: ${config.gmail.notifyEmail} (ID: ${info.messageId})`);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error('❌ Failed to send notification email:', err.message);
    return { sent: false, reason: err.message };
  }
}

module.exports = { initTransporter, sendNotification, formatEmailHtml };
