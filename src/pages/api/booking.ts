import type { APIRoute } from 'astro';
import { Resend } from 'resend';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const contentType = request.headers.get('content-type') || '';
    let body: Record<string, any> = {};

    if (contentType.includes('application/json')) {
      body = await request.json();
    } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries());
    } else {
      return new Response(JSON.stringify({ error: 'Invalid content type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { name, email, serviceType, preferredDate, targetArea, projectDetails } = body;

    // Basic Validation
    if (!name || !email || !serviceType || !targetArea) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: Name, Email, Service Type, and Target Area are required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Resend SDK
    const apiKey = import.meta.env.RESEND_API_KEY || process.env.RESEND_API_KEY;
    
    if (!apiKey) {
      console.warn('⚠️ RESEND_API_KEY is not set. Logging inquiry payload instead of sending email:');
      console.log('Inquiry Payload:', { name, email, serviceType, preferredDate, targetArea, projectDetails });

      return new Response(
        JSON.stringify({
          success: true,
          mode: 'sandbox',
          message: 'Inquiry received successfully! (Running in preview mode without active RESEND_API_KEY)',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(apiKey);

    // 1. Business Alert Email to Kimberly & Rick
    const businessAlertEmail = resend.emails.send({
      from: 'K&R Photography Website <inquiries@kandrpix.com>',
      to: ['kimberly@kandrpix.com'],
      subject: `✨ New Inquiry: ${serviceType} in ${targetArea} from ${name}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #FAF8F5; color: #1C1917; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid #E7DDD0; }
              .header { font-size: 22px; font-weight: bold; color: #433426; border-bottom: 2px solid #D4AF37; padding-bottom: 12px; margin-bottom: 20px; }
              .field { margin-bottom: 14px; }
              .label { font-size: 11px; text-transform: uppercase; tracking: 1px; color: #A68868; font-weight: bold; }
              .value { font-size: 15px; color: #1C1917; margin-top: 4px; }
              .box { background: #FAF8F5; padding: 16px; border-radius: 8px; border-left: 4px solid #A68868; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">📸 New Client Inquiry</div>
              
              <div class="field">
                <div class="label">Client Name</div>
                <div class="value"><strong>${name}</strong></div>
              </div>

              <div class="field">
                <div class="label">Client Email</div>
                <div class="value"><a href="mailto:${email}">${email}</a></div>
              </div>

              <div class="field">
                <div class="label">Requested Service</div>
                <div class="value"><strong>${serviceType}</strong></div>
              </div>

              <div class="field">
                <div class="label">Target Area</div>
                <div class="value">${targetArea}</div>
              </div>

              <div class="field">
                <div class="label">Preferred Date / Timeline</div>
                <div class="value">${preferredDate || 'Flexible / Not Specified'}</div>
              </div>

              <div class="box">
                <div class="label">Project Details & Vision</div>
                <div class="value">${projectDetails ? projectDetails.replace(/\n/g, '<br/>') : 'No additional details provided.'}</div>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    // 2. Automated Confirmation Email to Client
    const clientConfirmationEmail = resend.emails.send({
      from: 'Kimberly & Rick @ K&R Photography <kimberly@kandrpix.com>',
      to: [email],
      subject: `Thank you for reaching out to K&R Photography, ${name}!`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #FAF8F5; color: #1C1917; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 36px; border-radius: 12px; border: 1px solid #E7DDD0; }
              .brand { font-size: 24px; font-family: Georgia, serif; letter-spacing: 2px; color: #1C1917; text-align: center; margin-bottom: 8px; }
              .subbrand { font-size: 11px; text-transform: uppercase; letter-spacing: 3px; color: #A68868; text-align: center; margin-bottom: 24px; }
              .content { font-size: 15px; line-height: 1.6; color: #433426; }
              .highlight-box { background: #FAF8F5; padding: 20px; border-radius: 8px; border: 1px solid #E7DDD0; margin: 24px 0; }
              .footer { text-align: center; font-size: 12px; color: #8A6D4F; margin-top: 32px; border-top: 1px solid #E7DDD0; padding-top: 16px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="brand">K&R PHOTOGRAPHY</div>
              <div class="subbrand">Kimberly & Rick • Orlando • Daytona • Cocoa Beach</div>

              <div class="content">
                <p>Hello ${name},</p>
                <p>Thank you so much for reaching out to us! We have received your inquiry for <strong>${serviceType}</strong> in <strong>${targetArea}</strong>.</p>
                
                <p>As a husband-and-wife duo with over 20 years of experience photographing special moments and architectural spaces across Central Florida, we personally review every request together.</p>

                <div class="highlight-box">
                  <strong>Summary of Your Inquiry:</strong>
                  <ul>
                    <li><strong>Service:</strong> ${serviceType}</li>
                    <li><strong>Target Location:</strong> ${targetArea}</li>
                    <li><strong>Preferred Date:</strong> ${preferredDate || 'Flexible'}</li>
                  </ul>
                </div>

                <p>We will check our calendar availability and get back to you within 24 hours with details, pricing packages, and next steps.</p>
                
                <p>Warmest regards,<br/><strong>Kimberly & Rick</strong><br/>K&R Photography (kandrpix.com)</p>
              </div>

              <div class="footer">
                ★★★★★ 380+ 5-Star Reviews on Google<br/>
                Instagram: <a href="https://instagram.com/kandrpix" style="color: #A68868;">@kandrpix</a> | Email: kimberly@kandrpix.com
              </div>
            </div>
          </body>
        </html>
      `,
    });

    await Promise.all([businessAlertEmail, clientConfirmationEmail]);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Inquiry submitted successfully! Confirmation email has been sent.',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error processing booking request:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error processing booking.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
