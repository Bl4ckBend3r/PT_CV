const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const JOBS_DIR = path.join(ROOT, 'jobs');
const DIST_DIR = path.join(ROOT, 'dist');
const DIST_JOBS_DIR = path.join(DIST_DIR, 'jobs');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyDir(source, target) {
  ensureDir(target);
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function humanizeFilename(filename) {
  return path
    .basename(filename, '.html')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase());
}

function decodeHtml(text = '') {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function stripTags(text = '') {
  return decodeHtml(text.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
}

function getJobTitle(html, filename) {
  const dataTitle = html.match(/<[^>]+data-job-title=["']([^"']+)["'][^>]*>/i);
  if (dataTitle?.[1]) return stripTags(dataTitle[1]);

  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleTag?.[1] && stripTags(titleTag[1])) return stripTags(titleTag[1]);

  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1?.[1] && stripTags(h1[1])) return stripTags(h1[1]);

  return humanizeFilename(filename);
}

function safePdfName(title, slug) {
  const clean = (title || slug)
    .normalize('NFKD')
    .replace(/[<>:"/\\|?*]+/g, '')
    .replace(/\s+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `CV_${clean || slug}.pdf`;
}

function injectPdfHelper(html, pdfFile) {
  const helper = `
<!-- Automatycznie dodane przez build Netlify: eksport tego CV do PDF -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\/script>
<script>
(() => {
  const PDF_FILE = ${JSON.stringify(pdfFile)};

  window.addEventListener('message', async (event) => {
    if (event.origin !== window.location.origin) return;
    if (!event.data || event.data.type !== 'cv-download-pdf') return;

    try {
      if (typeof window.html2pdf !== 'function') {
        throw new Error('Biblioteka PDF nie została załadowana.');
      }

      const source = document.querySelector('[data-job-title]') || document.querySelector('.page') || document.body;

      await window.html2pdf()
        .set({
          margin: 0,
          filename: PDF_FILE,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
          },
          jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait'
          },
          pagebreak: { mode: ['css', 'legacy'] }
        })
        .from(source)
        .save();

      window.parent.postMessage({ type: 'cv-pdf-done' }, window.location.origin);
    } catch (error) {
      console.error(error);
      window.parent.postMessage({ type: 'cv-pdf-error', message: error.message }, window.location.origin);
    }
  });
})();
<\/script>
`;

  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${helper}\n</body>`);
  }
  return `${html}\n${helper}`;
}

function build() {
  if (!fs.existsSync(PUBLIC_DIR)) throw new Error('Brak folderu public.');
  ensureDir(JOBS_DIR);

  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  copyDir(PUBLIC_DIR, DIST_DIR);
  copyDir(JOBS_DIR, DIST_JOBS_DIR);

  const htmlFiles = fs
    .readdirSync(JOBS_DIR)
    .filter(file => file.toLowerCase().endsWith('.html'))
    .sort((a, b) => a.localeCompare(b, 'pl'));

  const jobs = htmlFiles.map(file => {
    const sourcePath = path.join(JOBS_DIR, file);
    const html = fs.readFileSync(sourcePath, 'utf8');
    const slug = path.basename(file, path.extname(file));
    const title = getJobTitle(html, file);
    const pdfFile = safePdfName(title, slug);

    const outputPath = path.join(DIST_JOBS_DIR, file);
    fs.writeFileSync(outputPath, injectPdfHelper(html, pdfFile), 'utf8');

    return {
      slug,
      file,
      title,
      url: `/jobs/${encodeURIComponent(file)}`,
      pdfFile
    };
  });

  fs.writeFileSync(
    path.join(DIST_DIR, 'jobs.json'),
    JSON.stringify(jobs, null, 2),
    'utf8'
  );

  console.log(`Build gotowy. Wykryto ${jobs.length} CV.`);
  jobs.forEach(job => console.log(`  ✓ ${job.title} (${job.file})`));
  console.log('Folder publikacji: dist/');
}

try {
  build();
} catch (error) {
  console.error('\nBuild nie powiódł się:');
  console.error(error);
  process.exit(1);
}
