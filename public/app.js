const tabsEl = document.getElementById('tabs');
const frame = document.getElementById('cvFrame');
const downloadBtn = document.getElementById('downloadBtn');
const downloadBtnText = document.getElementById('downloadBtnText');
const refreshBtn = document.getElementById('refreshBtn');
const emptyState = document.getElementById('emptyState');
const viewerWrap = document.getElementById('viewerWrap');
const currentTitle = document.getElementById('currentTitle');
const openNewTab = document.getElementById('openNewTab');
const jobCount = document.getElementById('jobCount');
const toast = document.getElementById('toast');

let jobs = [];
let activeSlug = null;
let pdfTimeout = null;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2400);
}

function setPdfBusy(isBusy) {
  downloadBtn.disabled = isBusy || !activeSlug;
  downloadBtnText.textContent = isBusy ? 'Generowanie…' : 'Pobierz PDF';
}

function selectJob(job) {
  activeSlug = job.slug;
  frame.src = job.url;
  currentTitle.textContent = job.title;
  openNewTab.href = job.url;
  setPdfBusy(false);

  emptyState.classList.add('hidden');
  viewerWrap.classList.remove('hidden');

  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.slug === job.slug);
  });

  history.replaceState(null, '', `#${encodeURIComponent(job.slug)}`);
}

function renderJobs() {
  tabsEl.innerHTML = '';
  jobCount.textContent = jobs.length;

  if (!jobs.length) {
    activeSlug = null;
    frame.src = 'about:blank';
    viewerWrap.classList.add('hidden');
    emptyState.classList.remove('hidden');
    setPdfBusy(false);
    return;
  }

  jobs.forEach(job => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tab';
    button.dataset.slug = job.slug;
    button.textContent = job.title;
    button.addEventListener('click', () => selectJob(job));
    tabsEl.appendChild(button);
  });

  const hashSlug = decodeURIComponent(location.hash.replace(/^#/, ''));
  const initial = jobs.find(job => job.slug === hashSlug)
    || jobs.find(job => job.slug === activeSlug)
    || jobs[0];

  selectJob(initial);
}

async function loadJobs(showMessage = false) {
  refreshBtn.disabled = true;
  try {
    const response = await fetch(`/jobs.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Nie udało się pobrać listy CV.');
    jobs = await response.json();
    renderJobs();
    if (showMessage) showToast(`Znaleziono ${jobs.length} CV.`);
  } catch (error) {
    console.error(error);
    showToast('Nie udało się wczytać listy CV.');
  } finally {
    refreshBtn.disabled = false;
  }
}

downloadBtn.addEventListener('click', () => {
  if (!activeSlug || !frame.contentWindow) return;

  setPdfBusy(true);
  frame.contentWindow.postMessage({ type: 'cv-download-pdf' }, window.location.origin);

  clearTimeout(pdfTimeout);
  pdfTimeout = setTimeout(() => {
    setPdfBusy(false);
    showToast('Generowanie PDF trwa zbyt długo. Spróbuj ponownie.');
  }, 30000);
});

window.addEventListener('message', event => {
  if (event.origin !== window.location.origin) return;

  if (event.data?.type === 'cv-pdf-done') {
    clearTimeout(pdfTimeout);
    setPdfBusy(false);
    showToast('PDF został wygenerowany.');
  }

  if (event.data?.type === 'cv-pdf-error') {
    clearTimeout(pdfTimeout);
    setPdfBusy(false);
    showToast('Nie udało się wygenerować PDF.');
  }
});

refreshBtn.addEventListener('click', () => loadJobs(true));
window.addEventListener('hashchange', () => {
  const slug = decodeURIComponent(location.hash.replace(/^#/, ''));
  const job = jobs.find(item => item.slug === slug);
  if (job && job.slug !== activeSlug) selectJob(job);
});

loadJobs();
