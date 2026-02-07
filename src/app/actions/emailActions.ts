
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

  const apiKey = process.env.SENDGRID_API_KEY;
  console.log('🔵 [RECHARGE EMAIL] API Key status:', {
    exists: !!apiKey,
    length: apiKey?.length || 0,
    firstChars: apiKey?.substring(0, 10) || 'N/A'
  });

  // Check if key is missing OR is the placeholder
  if (!apiKey || apiKey === 'your_sendgrid_api_key_here') {
    console.warn('⚠️ [RECHARGE EMAIL] SENDGRID_API_KEY is missing or invalid. Running in DEMO MODE.');
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
    personalizations: [
      {
        to: recipients.map(email => ({ email })),
      }
    ],
    from: {
      email: 'info@bizroom.in',
      name: 'BizRoom Notifications'
    },
    subject: `New Recharge Request: ₹${details.amount} for ${details.mobileNumber}`,
    content: [
      {
        type: 'text/html',
        value: `
          <h1>New Recharge Request</h1>
          <p>A new manual recharge request has been submitted. Please process it as soon as possible.</p>
          <ul>
            <li><strong>Name:</strong> ${details.name}</li>
            <li><strong>Mobile Number:</strong> ${details.mobileNumber}</li>
            <li><strong>Operator:</strong> ${details.operator}</li>
            <li><strong>Amount:</strong> ₹${details.amount}</li>
          </ul>
        `,
      },
    ],
  };

  console.log('🔵 [RECHARGE EMAIL] Email data prepared, calling sendEmail...');
  const result = await sendEmail(emailData, apiKey);
  console.log('🔵 [RECHARGE EMAIL] sendEmail result:', result);
  return result;
}

// Helper to send email via SendGrid
async function sendEmail(data: any, apiKey: string) {
  console.log('📧 [SEND EMAIL] Starting email send process...');
  console.log('📧 [SEND EMAIL] Request payload:', JSON.stringify(data, null, 2));

  try {
    console.log('📧 [SEND EMAIL] Making fetch request to SendGrid API...');
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
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
      console.log('✅ [SEND EMAIL] Email sent successfully via SendGrid API!');
      return { success: true };
    } else {
      let errorBody;
      try {
        errorBody = await response.json();
      } catch (e) {
        errorBody = await response.text();
      }
      console.error('❌ [SEND EMAIL] Error sending email with SendGrid API:', {
        status: response.status,
        statusText: response.statusText,
        errorBody
      });
      return {
        success: false,
        error: `SendGrid API Error (${response.status}): ${JSON.stringify(errorBody)}`
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
  const apiKey = process.env.SENDGRID_API_KEY;

  if (!apiKey || apiKey === 'your_sendgrid_api_key_here') {
    console.warn('SENDGRID_API_KEY is missing or invalid. Running in DEMO MODE.');
    console.log('--- MOCK BOOKING EMAIL START ---');
    console.log(`To: ${details.userEmail}`);
    console.log(`Subject: Booking Confirmed: ${details.eventTitle}`);
    console.log(`Booking ID: ${details.bookingId}`);
    console.log('--- MOCK BOOKING EMAIL END ---');
    return { success: true };
  }

  const emailData = {
    personalizations: [
      {
        to: [{ email: details.userEmail }],
      }
    ],
    from: {
      email: 'info@bizroom.in',
      name: 'BizRoom Events'
    },
    subject: `Booking Confirmed: ${details.eventTitle}`,
    content: [
      {
        type: 'text/html',
        value: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #0d9488;">Booking Confirmed!</h1>
            <p>Hi ${details.userName},</p>
            <p>Thank you for booking your ticket for <strong>${details.eventTitle}</strong>.</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Booking ID:</strong> <span style="font-family: monospace; font-size: 1.2em; color: #0d9488;">${details.bookingId}</span></p>
                <hr style="border: 0; border-top: 1px solid #d1d5db; margin: 15px 0;">
                <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(details.eventDate).toLocaleDateString()}</p>
                 <p style="margin: 5px 0;"><strong>Venue:</strong> ${details.eventVenue}</p>
                <p style="margin: 5px 0;"><strong>Price:</strong> ₹${details.totalPrice}</p>
            </div>

            <p>Please present your Booking ID or this email at the venue entrance.</p>
            <p>Best regards,<br>The BizRoom Team</p>
          </div>
        `,
      },
    ],
  };

  return sendEmail(emailData, apiKey);
}

export interface EvergreenInquiryDetails {
  name: string;
  email: string;
  phone: string;
  message: string;
}

export async function sendEvergreenInquiry(details: EvergreenInquiryDetails) {
  const apiKey = process.env.SENDGRID_API_KEY;

  if (!apiKey || apiKey === 'your_sendgrid_api_key_here') {
    console.warn('SENDGRID_API_KEY is missing or invalid. Running in DEMO MODE.');
    console.log('--- MOCK INQUIRY EMAIL START ---');
    console.log(`To: korattur.che@fr.dtdc.com`);
    console.log(`Subject: New Inquiry from Website: ${details.name}`);
    console.log(`From: ${details.email} (${details.phone})`);
    console.log(`Message: ${details.message}`);
    console.log('--- MOCK INQUIRY EMAIL END ---');
    return { success: true };
  }

  const emailData = {
    personalizations: [
      {
        to: [{ email: 'korattur.che@fr.dtdc.com' }],
      }
    ],
    from: {
      email: 'info@bizroom.in',
      name: 'Evergreen Website Inquiry'
    },
    subject: `New Inquiry from Website: ${details.name}`,
    content: [
      {
        type: 'text/html',
        value: `
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
      },
    ],
  };

  return sendEmail(emailData, apiKey);
}


