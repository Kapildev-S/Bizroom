
'use server';

interface RechargeDetails {
  name: string;
  mobileNumber: string;
  operator: string;
  amount: number;
}

export async function sendRechargeEmail(details: RechargeDetails) {
  console.log('🔵 [RECHARGE EMAIL] Function called with details:', {
    name: details.name,
    mobileNumber: details.mobileNumber,
    operator: details.operator,
    amount: details.amount
  });

  const apiKey = process.env.RESEND_API_KEY;
  console.log('🔵 [RECHARGE EMAIL] API Key status:', {
    exists: !!apiKey,
    length: apiKey?.length || 0,
    firstChars: apiKey?.substring(0, 10) || 'N/A'
  });

  // Check if key is missing OR is the placeholder
  if (!apiKey || apiKey === 're_your_key_here') {
    console.warn('⚠️ [RECHARGE EMAIL] RESEND_API_KEY is missing or invalid. Running in DEMO MODE.');
    console.log('--- MOCK EMAIL START ---');
    console.log(`To: karubegins@gmail.com`);
    console.log(`Subject: New Recharge Request: ₹${details.amount} for ${details.mobileNumber}`);
    console.log(`Body: Name: ${details.name}, Operator: ${details.operator}`);
    console.log('--- MOCK EMAIL END ---');
    return { success: true, message: 'Demo email logged to console.' };
  }

  const recipients = ['karubegins@gmail.com'];
  console.log('🔵 [RECHARGE EMAIL] Recipients:', recipients);

  const emailData = {
    from: 'BizRoom Notifications <info@bizroom.in>',
    to: recipients,
    subject: `New Recharge Request: ₹${details.amount} for ${details.mobileNumber}`,
    html: `
      <h1>New Recharge Request</h1>
      <p>A new manual recharge request has been submitted. Please process it as soon as possible.</p>
      <ul>
        <li><strong>Name:</strong> ${details.name}</li>
        <li><strong>Mobile Number:</strong> ${details.mobileNumber}</li>
        <li><strong>Operator:</strong> ${details.operator}</li>
        <li><strong>Amount:</strong> ₹${details.amount}</li>
      </ul>
    `,
  };

  console.log('🔵 [RECHARGE EMAIL] Email data prepared, calling sendEmail...');
  const result = await sendEmail(emailData, apiKey);
  console.log('🔵 [RECHARGE EMAIL] sendEmail result:', result);
  return result;
}

// Helper to send email via Resend
async function sendEmail(data: { from: string; to: string[]; subject: string; html: string }, apiKey: string) {
  console.log('📧 [SEND EMAIL] Starting email send process...');
  console.log('📧 [SEND EMAIL] Request payload:', JSON.stringify(data, null, 2));

  try {
    console.log('📧 [SEND EMAIL] Making fetch request to Resend API...');
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(data),
    });

    console.log('📧 [SEND EMAIL] Response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (response.ok) {
      const respData = await response.json();
      console.log('✅ [SEND EMAIL] Email sent successfully via Resend API!', respData);
      return { success: true };
    } else {
      let errorBody;
      try {
        errorBody = await response.json();
      } catch (e) {
        errorBody = await response.text();
      }
      console.error('❌ [SEND EMAIL] Error sending email with Resend API:', {
        status: response.status,
        statusText: response.statusText,
        errorBody
      });
      return {
        success: false,
        error: `Resend API Error (${response.status}): ${JSON.stringify(errorBody)}`
      };
    }
  } catch (error: any) {
    console.error('❌ [SEND EMAIL] Network or other error sending email:', {
      message: error.message,
      stack: error.stack,
      error
    });
    return {
      success: false,
      error: `Network error: ${error.message}`
    };
  }
}

export interface BookingEmailDetails {
  bookingId: string;
  userName: string;
  userEmail: string;
  eventTitle: string;
  eventDate: string;
  eventVenue: string;
  totalPrice: string;
}


export async function sendBookingEmail(details: BookingEmailDetails) {
  console.log('📬 [BOOKING EMAIL] Function called for ID:', details.bookingId);
  console.log('📬 [BOOKING EMAIL] Destination:', details.userEmail);

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || apiKey === 're_your_key_here') {
    console.warn('⚠️ [BOOKING EMAIL] RESEND_API_KEY is missing. Demo mode.');
    return { success: true };
  }

  const emailData = {
    from: 'BizRoom Events <info@bizroom.in>',
    to: [details.userEmail, 'karubegins@gmail.com'],
    subject: `Booking Confirmed: ${details.eventTitle} [#${details.bookingId}]`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; color: #1f2937;">
        <h1 style="color: #4f46e5; text-align: center;">Booking Confirmed!</h1>
        <p>Hi ${details.userName},</p>
        <p>Your ticket for <strong>${details.eventTitle}</strong> has been successfully booked. We've included your details below.</p>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 24px 0; border: 1px solid #f1f5f9;">
            <p style="margin: 5px 0; color: #64748b; font-size: 0.875rem; text-transform: uppercase; font-weight: bold; letter-spacing: 0.05em;">Booking ID</p>
            <p style="margin: 0; font-family: monospace; font-size: 1.5rem; color: #4f46e5; font-weight: bold;">${details.bookingId}</p>
            
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 15px 0;">
            
            <p style="margin: 8px 0;"><strong>📅 Date:</strong> ${details.eventDate ? new Date(details.eventDate).toLocaleDateString() : 'N/A'}</p>
            <p style="margin: 8px 0;"><strong>📍 Venue:</strong> ${details.eventVenue}</p>
            <p style="margin: 8px 0;"><strong>💰 Paid:</strong> ₹${details.totalPrice}</p>
        </div>

        <div style="text-align: center; margin: 32px 0;">
            <a href="https://bizroom.in/tickets/receipt/${details.bookingId}" 
               style="background-color: #4f46e5; color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 1.1rem; display: inline-block;">
               View Ticket & QR Code
            </a>
        </div>

        <p style="text-align: center; color: #64748b; font-size: 0.875rem;">
            Please present the QR code from the link above at the venue entry.
        </p>
        <p style="margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px; font-size: 0.875rem;">Best regards,<br>The BizRoom Team</p>
      </div>
    `,
  };

  console.log('📬 [BOOKING EMAIL] Sending via Resend...');
  return sendEmail(emailData, apiKey);
}

export interface EvergreenInquiryDetails {
  name: string;
  email: string;
  phone: string;
  message: string;
}

export async function sendEvergreenInquiry(details: EvergreenInquiryDetails) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || apiKey === 're_your_key_here') {
    console.warn('RESEND_API_KEY is missing or invalid. Running in DEMO MODE.');
    console.log('--- MOCK INQUIRY EMAIL START ---');
    console.log(`To: korattur.che@fr.dtdc.com`);
    console.log(`Subject: New Inquiry from Website: ${details.name}`);
    console.log(`From: ${details.email} (${details.phone})`);
    console.log(`Message: ${details.message}`);
    console.log('--- MOCK INQUIRY EMAIL END ---');
    return { success: true };
  }

  const emailData = {
    from: 'Evergreen Website Inquiry <info@bizroom.in>',
    to: ['korattur.che@fr.dtdc.com'],
    subject: `New Inquiry from Website: ${details.name}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #0d9488;">New Website Inquiry</h1>
        <p>You have received a new message from the Evergreen Enterprises website contact form.</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Name:</strong> ${details.name}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${details.email}</p>
            <p style="margin: 5px 0;"><strong>Phone:</strong> ${details.phone}</p>
            <hr style="border: 0; border-top: 1px solid #d1d5db; margin: 15px 0;">
            <p style="margin: 5px 0;"><strong>Message:</strong></p>
            <p style="white-space: pre-wrap;">${details.message}</p>
        </div>

        <p>Please reply directly to the customer at <a href="mailto:${details.email}">${details.email}</a> or call them at <a href="tel:${details.phone}">${details.phone}</a>.</p>
      </div>
    `,
  };

  return sendEmail(emailData, apiKey);
}


