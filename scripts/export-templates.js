const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function exportTemplates() {
  const templatesDir = path.resolve(__dirname, '../../pdf/dr-parma');
  const outputDir = path.join(templatesDir, 'output');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const files = [
    'contract.html',
    'invoice.html',
    'proposal-no-pricing.html',
    'proposal.html',
    'scope-of-work.html'
  ];

  console.log(`Starting PDF conversion of ${files.length} templates...`);
  console.log(`Source directory: ${templatesDir}`);
  console.log(`Output directory: ${outputDir}`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    for (const file of files) {
      const filePath = path.join(templatesDir, file);
      if (!fs.existsSync(filePath)) {
        console.warn(`Template file not found: ${filePath}, skipping...`);
        continue;
      }

      // Convert system path to file URL for Puppeteer
      const fileUrl = `file:///${filePath.replace(/\\/g, '/')}`;
      console.log(`Loading ${file} from URL: ${fileUrl}`);

      await page.goto(fileUrl, { waitUntil: 'networkidle0' });

      const pdfPath = path.join(outputDir, file.replace('.html', '.pdf'));
      console.log(`Exporting ${file} to ${pdfPath}`);

      await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '12mm',
          right: '0mm',
          bottom: '12mm',
          left: '0mm'
        }
      });
      console.log(`Successfully generated ${path.basename(pdfPath)}`);
    }

    console.log('Template conversion complete!');
  } catch (error) {
    console.error('Error during template conversion:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

exportTemplates();
