// pages/api/send-contact.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from 'resend';
import { sanitizeHtml } from '@/lib/utils/sanitizeHtml';

const resend = new Resend(process.env.RESEND_API_KEY);

const validateEmail = async (email: string) => {
  const accessKey = process.env.ABSTRACT_API_KEY;
  if (!accessKey) {
    console.warn('❗ ABSTRACT_API_KEY is missing');
    return false;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

    // Note: Abstract API uses query parameters for API keys, which is acceptable
    // for server-side calls. The key is never exposed to the client.
    const response = await fetch(
      `https://emailvalidation.abstractapi.com/v1/?api_key=${accessKey}&email=${encodeURIComponent(email)}`,
      { signal: controller.signal }
    );

    clearTimeout(timeout);

    const result = await response.json();
    console.log('📬 AbstractAPI validation result:', result);

    return result.is_valid_format?.value === true && result.deliverability === "DELIVERABLE";

  } catch (err) {
    console.error('❗ Error during AbstractAPI email validation:', err);
    return false;
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('📩 Incoming request to /api/send-contact:', req.method);

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed.' });
  }

  const { firstName, lastName, email, message } = req.body;
  console.log('📥 Request body:', { firstName, lastName, email, message });

  // Validate input types and presence
  if (!firstName || typeof firstName !== 'string' || 
      !lastName || typeof lastName !== 'string' || 
      !email || typeof email !== 'string' || 
      !message || typeof message !== 'string') {
    return res.status(400).json({ message: 'Please fill out all required fields.' });
  }

  // Sanitize inputs to prevent XSS
  const sanitizedFirstName = sanitizeHtml(firstName.trim());
  const sanitizedLastName = sanitizeHtml(lastName.trim());
  const sanitizedEmail = email.trim().toLowerCase(); // Email doesn't need HTML sanitization, but normalize
  const sanitizedMessage = sanitizeHtml(message.trim());

  // Additional validation
  if (!sanitizedFirstName || !sanitizedLastName || !sanitizedEmail || !sanitizedMessage) {
    return res.status(400).json({ message: 'Please fill out all required fields.' });
  }

  // Validate email format (basic check)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitizedEmail)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }

  const isEmailValid = await validateEmail(sanitizedEmail);
  if (!isEmailValid) {
    console.warn('❗ Invalid email address:', sanitizedEmail);
    return res.status(400).json({ message: 'Please enter a valid, working email address.' });
  }

  const fullName = `${sanitizedFirstName} ${sanitizedLastName}`;

  try {
    const sendResult = await Promise.race([
      resend.emails.send({
        from: 'onboarding@resend.dev',
        to: 'srbotanicals09@gmail.com',
        subject: `New Contact Form Submission from ${fullName}`,
        html: `
          <p><strong>Name:</strong> ${sanitizedFirstName} ${sanitizedLastName}</p>
          <p><strong>Email:</strong> ${sanitizedEmail}</p>
          <p><strong>Message:</strong><br/>${sanitizedMessage.replace(/\n/g, '<br/>')}</p>
        `,
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Email send timeout')), 7000))
    ]);

    console.log('✅ Email sent successfully.', sendResult);
    return res.status(200).json({ message: 'Your message has been sent successfully! We’ll get back to you soon.' });

  } catch (err: any) {
    console.error('❗ Unexpected error while sending email:', err.message || err);
    return res.status(500).json({ message: 'Oops! A server error occurred. Please try again later.' });
  }
}
