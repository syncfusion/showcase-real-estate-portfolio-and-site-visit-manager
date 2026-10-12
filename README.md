# Real Estate Portfolio & Site Visit Manager

Real Estate Portfolio & Site Visit Manager is an enterprise showcase application for commercial real estate teams, built with Syncfusion UI components.

It brings a multi-market property portfolio into one workspace: properties on a map, scheduled site inspections, lease expirations, the acquisition pipeline, and due diligence documents. It is aimed at operations managers, asset managers, analysts, and acquisitions teams who need one view of occupancy, rollover risk, and deal flow.

> This is a showcase application with sample data that runs entirely in the browser. It is not intended to be used as a production system without adding a backend, authentication, authorization, auditing, secrets management, and operational controls.

## What the showcase includes

- **Portfolio dashboard:** KPI cards for valuation, occupancy, and net operating income, an NOI trend chart, an asset-class donut, and a map of every property, colored by occupancy against a 95% target and clustered when markers overlap
- **Properties:** property cards with occupancy, valuation, and key metrics, plus a sortable lease schedule for upcoming expirations
- **Site Visits:** a scheduler of inspections across properties, a Kanban board that moves visits through their workflow, and an editor to plan and update visits
- **Due Diligence:** a document vault filtered by property, type, and status, with a built-in PDF viewer for reviewing documents
- **Pipeline:** an acquisition Kanban board that moves deals stage by stage, with deal value by stage and projected cap rate charts
- **Sample AI advisor:** an assistant drawer that answers portfolio questions from the data in the current session, using rule-based answers with no external AI model
- **Responsive design:** light and dark themes, a collapsible icon sidebar, loading indicators on first load and page changes, and the ability to reset to the demo data

## Syncfusion components used

Maps, Data Grid, Scheduler, Kanban, Charts, PDF Viewer, AI AssistView, Card, Sidebar, DropDownList, and Tooltip.

## Platforms

| Platform | Folder | Status |
| --- | --- | --- |
| React | [`react/`](react/) | Available |

More platforms are planned. Each platform folder is a self-contained application with the same features and sample data.

### React technology

| Layer | Technology |
| --- | --- |
| UI | React 19, TypeScript, Vite 6, Tailwind CSS 4 |
| Components | Syncfusion Essential Studio for React 35.1.37 (Tailwind 3 light and dark themes) |
| Data | Local JSON sample data; session changes are saved in the browser's local storage |
| Hosting | A dependency-free Node.js static server (`server.mjs`) and IIS `web.config` rewrite rules |

## Repository structure

```text
showcase-real-estate-portfolio-and-site-visit-manager/
└── react/
    ├── src/              # Pages, components, services, styles, and sample data
    ├── public/           # Sample PDF documents, favicon, and IIS web.config
    ├── test/             # Sample data and hosting tests (node --test)
    ├── server.mjs        # Static host for production builds
    └── .env.example      # Syncfusion license key variable
```

## Run locally (React)

### Prerequisites

- Node.js 24 and npm 10 or later
- A Syncfusion license key for Essential Studio 35.x (a [free trial or community license](https://www.syncfusion.com/sales/licensing) works)

### Steps

```bash
cd react
npm ci
cp .env.example .env
```

Set `VITE_SYNCFUSION_LICENSE_KEY` in `.env` to your license key, then start the development server:

```bash
npm run dev
```

Open `http://localhost:5173/real-estate-portfolio/react/`.

Without a license key, the app still runs, but the Syncfusion components show a license banner. Never commit your `.env` file.

## Build and test

```bash
cd react
npm run lint
npm test
npm run build
```

`npm run build` writes the production site to `dist/`, including Brotli and gzip copies of the large files. To serve the build locally:

```bash
PORT=8080 npm start
```

Open `http://localhost:8080/real-estate-portfolio/react/`. A health check is available at `/healthz`.

## Deploy

The app is served under the base path `/real-estate-portfolio/react/`.

- **Azure App Service (Linux):** deploy `dist/`, `server.mjs`, `package.json`, and `package-lock.json`, and set the startup command to `node server.mjs`. The server reads `PORT`, serves the compressed copies when the browser accepts them, and falls back to `index.html` for app routes.
- **Azure App Service (Windows) or IIS:** deploy the contents of `dist/`. The included `web.config` rewrites app routes to `index.html`.
- **Other static hosts:** serve `dist/` under `/real-estate-portfolio/react/` and rewrite unknown routes under that path to `index.html`.

Syncfusion licensing is client-side, so a production build contains the license key it was built with. Build with the key that is licensed for the site you deploy.

## Notes and limitations

- All data is sample data. Changes are kept in the browser only, and **Reset to Demo Data** restores the original set.
- The sample data is dated around October 2026, so the scheduler and charts open on that period.
- The PDF Viewer loads its rendering engine from the Syncfusion CDN, so viewing documents needs internet access. The sample PDFs are served by the app itself.
- The AI advisor is a sample. It does not call any external AI model or send data anywhere.

## Licensing

Syncfusion packages are governed by Syncfusion's licensing terms. Review the [Syncfusion licensing documentation](https://www.syncfusion.com/sales/licensing) before redistributing or deploying the application. Publishing this source repository does not grant a license to Syncfusion products.

## Intended audience

This showcase is useful for engineering leaders, architects, product teams, and developers evaluating how a component-rich property management application can be built with Syncfusion UI components.
