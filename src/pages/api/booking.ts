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

    // ─── LAYER 1: INVISIBLE HONEYPOT SPAM PROTECTION ───
    const honeypot = body.website_url || body.b_name || body.honeypot;
    if (honeypot) {
      console.warn('[Security] Bot detected via honeypot field. Silently dropping request.');
      // Return a simulated success so automated bots don't adapt
      return new Response(
        JSON.stringify({ success: true, message: 'Inquiry received successfully!' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ─── LAYER 2: TIME-DELTA SUBMISSION CHECK ───
    const formRenderedAt = Number(body.form_rendered_at || 0);
    if (formRenderedAt > 0) {
      const timeDeltaMs = Date.now() - formRenderedAt;
      // If submitted in under 1.5 seconds, it is an automated script
      if (timeDeltaMs < 1500) {
        console.warn(`[Security] Rapid submission detected (${timeDeltaMs}ms). Silently dropping bot payload.`);
        return new Response(
          JSON.stringify({ success: true, message: 'Inquiry received successfully!' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Normalize and alias all potential form field variations
    const name = (body.name || body.fullName || '').trim();
    const email = (body.email || '').trim();
    const phone = (body.phone || body.telephone || '').trim();
    const serviceType = (body.serviceType || body.package || body.service || '').trim();
    const targetArea = (body.targetArea || body.location || body.venue || '').trim();
    const preferredDate = (body.preferredDate || body.date || '').trim();
    const timeWindow = (body.timeWindow || body.time || body.preferredTime || '').trim();
    const notes = (body.details || body.message || body.projectDetails || body.vision || '').trim();
    const formattedTime = timeWindow || 'Flexible / Any Time';

    // Basic Validation
    if (!name || !email || !serviceType || !targetArea) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: Name, Email, Service Type, and Location/Venue are required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Resend SDK
    const apiKey = import.meta.env.RESEND_API_KEY;
    const testEmail = import.meta.env.TEST_EMAIL;
    const studioEmail = testEmail || import.meta.env.STUDIO_EMAIL || 'kimberly@kandrpix.com';
    const fromDomain = import.meta.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    
    if (!apiKey) {
      console.warn('⚠️ RESEND_API_KEY is not set. Logging inquiry payload instead of sending email:');
      console.log('Inquiry Payload:', { name, email, serviceType, preferredDate, timeWindow, targetArea, notes, testEmail: studioEmail });

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
    const clientRecipient = testEmail || email;

    console.log(`[Booking API] Dispatching emails via Resend. From: ${fromDomain}, Studio To: ${studioEmail}, Client To: ${clientRecipient}`);

    const [alertResult, confirmResult] = await Promise.all([
      resend.emails.send({
        from: `K&R Studio Leads <${fromDomain}>`,
        to: [studioEmail],
        replyTo: email,
        subject: `📸 New Client Inquiry: ${serviceType} (${name})`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #FAF8F5; color: #1C1917; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid #E7DDD0; }
                .header { font-size: 22px; font-weight: bold; color: #433426; border-bottom: 2px solid #D4AF37; padding-bottom: 12px; margin-bottom: 20px; }
                .field { margin-bottom: 14px; }
                .label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #A68868; font-weight: bold; }
                .value { font-size: 15px; color: #1C1917; margin-top: 4px; }
                .box { background: #FAF8F5; padding: 16px; border-radius: 8px; border-left: 4px solid #A68868; margin-top: 20px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">📸 New Client Lead Received</div>
                
                <div class="field">
                  <div class="label">Client Name</div>
                  <div class="value"><strong>${name}</strong></div>
                </div>

                <div class="field">
                  <div class="label">Client Email</div>
                  <div class="value"><a href="mailto:${email}">${email}</a></div>
                </div>

                ${phone ? `
                <div class="field">
                  <div class="label">Phone Number</div>
                  <div class="value"><a href="tel:${phone}">${phone}</a></div>
                </div>
                ` : ''}

                <div class="field">
                  <div class="label">Requested Service</div>
                  <div class="value"><strong>${serviceType}</strong></div>
                </div>

                <div class="field">
                  <div class="label">Target Location / Venue</div>
                  <div class="value">${targetArea}</div>
                </div>

                <div class="field">
                  <div class="label">Preferred Date &amp; Time Window</div>
                  <div class="value"><strong>${preferredDate || 'Flexible'}</strong> — ${formattedTime}</div>
                </div>

                <div class="box">
                  <div class="label">Project Details & Vision</div>
                  <div class="value">${notes ? String(notes).replace(/\n/g, '<br/>') : 'No additional details provided.'}</div>
                </div>
              </div>
            </body>
          </html>
        `,
      }),
      resend.emails.send({
        from: `Kimberly & Rick | K&R Photography <${fromDomain}>`,
        to: [clientRecipient],
        replyTo: studioEmail,
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
                      <li><strong>Preferred Window:</strong> ${formattedTime}</li>
                    </ul>
                  </div>

                  <div style="background: #F4F0EA; border: 1px solid #E7DDD0; border-radius: 8px; padding: 18px 20px; margin: 26px 0; text-align: center;">
                    <div style="font-size: 14px; font-weight: bold; color: #1C1917; margin-bottom: 4px;">Loved working with us in the past?</div>
                    <div style="font-size: 12.5px; color: #433426; margin-bottom: 12px;">We'd be deeply honored if you left a 5-star review on Google!</div>
                    <a href="https://g.page/r/kandrpix/review" target="_blank" style="display: inline-block; background: #B89635; color: #FAF8F5; text-decoration: none; font-size: 12px; font-weight: bold; padding: 9px 18px; border-radius: 100px; text-transform: uppercase; letter-spacing: 1px;">★ Leave a Google Review</a>
                  </div>

                  <p>Warmest regards,<br/><strong>Kimberly & Rick</strong><br/>K&R Photography (kandrpix.com)</p>
                </div>

                <div class="footer">
                  ★★★★★ 380+ 5-Star Reviews on <a href="https://www.google.com/search?q=K%26R+Photography+Orlando" style="color: #A68868; text-decoration: underline;">Google</a><br/>
                  Instagram: <a href="https://instagram.com/kandrpix" style="color: #A68868;">@kandrpix</a> | Email: kimberly@kandrpix.com
                </div>
              </div>
            </body>
          </html>
        `,
      })
    ]);

    console.log('[Booking API] Alert Result:', JSON.stringify(alertResult));
    console.log('[Booking API] Confirmation Result:', JSON.stringify(confirmResult));

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
