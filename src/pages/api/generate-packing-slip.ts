import { NextApiRequest, NextApiResponse } from 'next';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { orderId } = req.query;

  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (error || !order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // US Letter size
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 740;

  // Embed logo image from public folder
  const logoPath = path.resolve('./public/logo.png');
  const logoBytes = fs.readFileSync(logoPath);
  const logoImage = await pdfDoc.embedPng(logoBytes);
  page.drawImage(logoImage, {
    x: 50,
    y: y - 50,
    width: 110,
    height: 80,
  });

  // Company info
  page.drawText('SR Botanicals', {
    x: 260,
    y: y,
    size: 18,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  page.drawText('Email: srbotanicals09@gmail.com', {
    x: 230,
    y: y - 20,
    size: 12,
    font,
    color: rgb(0, 0, 0),
  });

  y -= 100;

  // Title
  page.drawText(`Order #${order.id}`, {
    x: 50,
    y,
    size: 12,
    font,
  });

  y -= 20;

  // Date of Order
  const orderDate = new Date(order.created_at).toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  page.drawText(`Order placed: ${orderDate}`, {
    x: 50,
    y,
    size: 12,
    font,
  });

  y -= 50;

  page.drawText('Billing Information', {
    x: 50,
    y,
    size: 12,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  y -= 20;

  // Customer Info
  page.drawText(`Name: ${order.shipping_name || 'N/A'}`, {
    x: 50,
    y,
    size: 12,
    font,
  });

  y -= 18;

  page.drawText(`Phone: ${order.shipping_phone || 'N/A'}`, {
    x: 50,
    y,
    size: 12,
    font,
  });

  y -= 30;

  // Column headers
  page.drawText('Product Name', {
    x: 60,
    y,
    size: 12,
    font: boldFont,
  });
  page.drawText('Qty', {
    x: 500,
    y,
    size: 12,
    font: boldFont,
  });

  y -= 15;
  page.drawLine({
    start: { x: 50, y },
    end: { x: 550, y },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7),
  });

  y -= 20;

  // Product List
  const lineSpacing = 18;
  if (Array.isArray(order.products)) {
    order.products.forEach((item: any, idx: number) => {
      page.drawText(`${idx + 1}. ${item.name}`, {
        x: 60,
        y,
        size: 12,
        font,
      });
      page.drawText(`${item.quantity}`, {
        x: 510,
        y,
        size: 12,
        font,
      });
      y -= lineSpacing;
    });
  } else {
    page.drawText('⚠️ No product data available', {
      x: 60,
      y,
      size: 12,
      font,
    });
  }

  const pdfBytes = await pdfDoc.save();

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="packing-slip.pdf"');
  res.end(Buffer.from(pdfBytes));
}
