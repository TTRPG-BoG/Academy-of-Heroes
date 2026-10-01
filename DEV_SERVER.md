# Local development

The site must be served over HTTP because browsers do not allow a page opened with the `file:` protocol to fetch `database/manifest.json`.

## Requirements

- Node.js 20 or newer

The project has no third-party runtime dependencies, so an install step is not required.

## Start the site

From the repository root, run:

```powershell
npm start
```

This regenerates `database/manifest.json` and serves the site at <http://localhost:8080/>. Stop the server with `Ctrl+C`.

To use another port:

```powershell
$env:PORT = 3000
npm start
```

The PowerShell helper can also choose a port and open the browser:

```powershell
.\start-dev-server.ps1 -Port 3000
```

Use `-NoBrowser` to keep it from opening a browser window.

## Validate changes

```powershell
npm run check
```

The check regenerates the manifest, parses all JavaScript, verifies HTML and CSS references, validates the data structure, confirms that referenced assets exist, and exercises the development server's path handling.

Before publishing, also test the important interactions in a browser: category navigation, search, favorites, direct hash links, keyboard navigation, and the responsive layouts.
