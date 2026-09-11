# CV Portfolio — Netlify

Gotowy projekt do hostowania na **Netlify**. Nie wymaga Expressa, serwera VPS ani funkcji backendowych.

## Co robi automatycznie

Przy każdym deployu Netlify uruchamia `npm run build`. Skrypt:

- skanuje wszystkie pliki `*.html` w folderze `jobs/`,
- odczytuje z każdego pliku nazwę stanowiska,
- automatycznie tworzy listę zakładek w `jobs.json`,
- kopiuje CV do gotowej strony,
- dodaje do każdego CV mechanizm pobierania go jako PDF.

Czyli żeby dodać nowe CV, wystarczy dodać nowy plik HTML do `jobs/` i zrobić push do repozytorium.

## Struktura

```text
cv-portfolio/
├── jobs/
│   ├── customer-care.html
│   ├── help-desk.html
│   └── technical-support.html
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── scripts/
│   └── build.js
├── netlify.toml
├── package.json
└── README.md
```

Folder `dist/` jest tworzony automatycznie podczas builda.

## Skąd bierze się nazwa zakładki

Kolejność:

1. atrybut `data-job-title`,
2. tag `<title>`,
3. pierwszy `<h1>`,
4. nazwa pliku.

Najlepiej w każdym CV dodać:

```html
<body data-job-title="Help Desk Specialist">
```

Atrybut może być również na głównym elemencie CV, np.:

```html
<main class="page" data-job-title="Help Desk Specialist">
```

## Dodawanie CV

Przykład:

```text
jobs/customer-care.html
jobs/help-desk.html
jobs/technical-support.html
```

Nie zmieniasz `index.html`, `app.js` ani żadnej listy stanowisk. Build zrobi to automatycznie.

## Deploy na Netlify — zalecany sposób

1. Wrzuć cały folder projektu do repozytorium GitHub.
2. W Netlify wybierz **Add new site → Import an existing project**.
3. Połącz repozytorium.
4. Netlify automatycznie odczyta `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node.js: `20`
5. Uruchom deploy.

Od tej chwili każdy push do repozytorium automatycznie przebuduje stronę.

## Test lokalny

Nie ma żadnych zależności npm do instalowania.

```bash
npm run build
npx serve dist
```

Następnie otwórz adres pokazany przez `serve`.

## Pobieranie PDF

Przycisk **Pobierz PDF** działa bez backendu. Każde CV podczas builda otrzymuje mechanizm eksportu przez `html2pdf.js`, a PDF jest generowany bezpośrednio w przeglądarce użytkownika.

Dzięki temu rozwiązanie działa na zwykłym hostingu statycznym Netlify.

## Ważne

Netlify nie udostępnia aplikacji możliwości wykonywania `fs.readdir()` na folderze witryny już po deployu. Dlatego nowe CV pojawia się automatycznie przy **kolejnym buildzie/deployu**. Przy połączeniu z GitHub wystarczy dodać HTML i wykonać push — Netlify zrobi resztę samo.
