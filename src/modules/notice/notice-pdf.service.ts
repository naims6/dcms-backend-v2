import { Injectable, NotFoundException } from '@nestjs/common';
import puppeteer from 'puppeteer';
import type { Notice } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

// ─── Category display labels ─────────────────────────────────────────────────

const CATEGORY_LABEL: Record<string, string> = {
  GENERAL: 'General',
  SCHOLARSHIP: 'Scholarship',
  JOB: 'Job Circular',
  RESULT: 'Result',
};

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class NoticePdfService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetch a PUBLISHED notice by ID and render it as a white-paper PDF.
   * Returns the raw PDF buffer so the controller can stream it to the client.
   */
  async generatePdf(id: string): Promise<Buffer> {
    const notice = await this.prisma.notice.findUnique({ where: { id } });

    if (!notice) {
      throw new NotFoundException(`Notice "${id}" not found`);
    }

    const html = buildHtml(notice);
    return renderPdf(html);
  }
}

// ─── HTML builder ─────────────────────────────────────────────────────────────

/**
 * Produces a self-contained HTML document that looks like a formal white-paper
 * notice when printed to PDF.
 */
function buildHtml(notice: Notice): string {
  const category = CATEGORY_LABEL[notice.category] ?? notice.category;
  const noticeDate = formatDate(notice.noticeDate);
  const publishedAt = notice.publishedAt ? formatDate(notice.publishedAt) : '—';
  const issuedOn = formatDate(notice.createdAt);

  return /* html */ `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(notice.subject)}</title>
  <style>
    /* ── Reset & base ───────────────────────────────────────── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.7;
      color: #1a1a1a;
      background: #fff;
    }

    /* ── Page layout ────────────────────────────────────────── */
    .page {
      max-width: 720px;
      margin: 0 auto;
      padding: 48px 56px;
    }

    /* ── Letterhead ─────────────────────────────────────────── */
    .letterhead {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #1a1a1a;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }

    .letterhead-title {
      font-size: 22pt;
      font-weight: bold;
      letter-spacing: 0.5px;
    }

    .letterhead-sub {
      font-size: 9pt;
      color: #555;
      margin-top: 2px;
    }

    .category-badge {
      font-size: 8.5pt;
      font-weight: bold;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #fff;
      background: #1a1a1a;
      padding: 4px 10px;
      border-radius: 3px;
    }

    /* ── Notice header ──────────────────────────────────────── */
    .notice-heading {
      text-align: center;
      margin-bottom: 28px;
    }

    .notice-heading h1 {
      font-size: 15pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 4px;
      text-decoration: underline;
      text-underline-offset: 4px;
    }

    .notice-heading p {
      font-size: 10pt;
      color: #444;
    }

    /* ── Meta table ─────────────────────────────────────────── */
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 28px;
      font-size: 10.5pt;
    }

    .meta-table td {
      padding: 4px 8px;
      vertical-align: top;
    }

    .meta-table td:first-child {
      font-weight: bold;
      width: 130px;
      color: #333;
    }

    .meta-table td:nth-child(2) {
      width: 12px;
      color: #888;
    }

    /* ── Divider ────────────────────────────────────────────── */
    .divider {
      border: none;
      border-top: 1px solid #ccc;
      margin: 0 0 28px;
    }

    /* ── Body content (user-supplied HTML) ──────────────────── */
    .body-content {
      font-size: 12pt;
      line-height: 1.8;
      text-align: justify;
    }

    .body-content p    { margin-bottom: 12px; }
    .body-content ul,
    .body-content ol   { padding-left: 24px; margin-bottom: 12px; }
    .body-content li   { margin-bottom: 4px; }
    .body-content h1,
    .body-content h2,
    .body-content h3   { margin: 16px 0 8px; }
    .body-content strong { font-weight: bold; }
    .body-content em     { font-style: italic; }
    .body-content a      { color: #1a1a1a; }
    .body-content table  { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    .body-content td,
    .body-content th     { border: 1px solid #ccc; padding: 6px 10px; }
    .body-content th     { background: #f2f2f2; font-weight: bold; }

    /* ── Footer ─────────────────────────────────────────────── */
    .footer {
      margin-top: 48px;
      border-top: 1px solid #ccc;
      padding-top: 14px;
      font-size: 9pt;
      color: #666;
      display: flex;
      justify-content: space-between;
    }

    /* ── Print tweaks ───────────────────────────────────────── */
    @page { margin: 0; }
    @media print { body { -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="page">

    <!-- Letterhead -->
    <header class="letterhead">
      <div>
        <div class="letterhead-title">DCMS</div>
        <div class="letterhead-sub">Digital Campus Management System</div>
      </div>
      <span class="category-badge">${escapeHtml(category)}</span>
    </header>

    <!-- Notice title section -->
    <div class="notice-heading">
      <h1>Notice</h1>
      <p>${escapeHtml(notice.subject)}</p>
    </div>

    <!-- Meta information -->
    <table class="meta-table">
      <tbody>
        <tr>
          <td>Notice Date</td>
          <td>:</td>
          <td>${noticeDate}</td>
        </tr>
        <tr>
          <td>Published On</td>
          <td>:</td>
          <td>${publishedAt}</td>
        </tr>
        <tr>
          <td>Reference No.</td>
          <td>:</td>
          <td style="font-family: monospace; font-size: 10pt;">${escapeHtml(notice.id)}</td>
        </tr>
      </tbody>
    </table>

    <hr class="divider" />

    <!-- Notice body (stored as HTML from rich-text editor) -->
    <div class="body-content">
      ${notice.body}
    </div>

    <!-- Footer -->
    <footer class="footer">
      <span>Issued on ${issuedOn}</span>
      <span>DCMS — Official Notice</span>
    </footer>

  </div>
</body>
</html>
  `.trim();
}

// ─── Puppeteer renderer ───────────────────────────────────────────────────────

/**
 * Launches a headless Chromium instance, loads the HTML, and exports it as
 * an A4 PDF with proper print margins.
 */
async function renderPdf(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage', // avoids /dev/shm overflow in containers
    ],
  });

  try {
    const page = await browser.newPage();

    // Use setContent instead of navigation — faster and avoids network timeouts
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' },
    });

    return Buffer.from(pdf);
  } finally {
    // Always close the browser even if PDF generation throws
    await browser.close();
  }
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/** Prevents XSS from notice subject / category leaking into the HTML wrapper. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
