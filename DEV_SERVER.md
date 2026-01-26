# Local Development Server

This file explains how to run the Academy of Heroes website locally for testing.

## Why You Need a Local Server

When you open `index.html` directly in your browser (file:// protocol), the browser blocks JavaScript from loading local files like `database/manifest.json` due to CORS (Cross-Origin Resource Sharing) security restrictions.

**Solution:** Run a local web server to serve the files over HTTP (http://localhost).

## Quick Start (Recommended)

### Option 1: Python (Simplest)
You have Python installed, so this is the easiest option:

```powershell
# Navigate to the project directory
cd C:\Repositories\Academy-of-Heroes

# Start the server on port 8080
python -m http.server 8080

# Open in browser: http://localhost:8080
```

Press `Ctrl+C` to stop the server when done.

### Option 2: Node.js http-server (Faster)
If you install the `http-server` package globally, it's slightly faster:

```powershell
# Install once (global)
npm install -g http-server

# Navigate to project directory
cd C:\Repositories\Academy-of-Heroes

# Start the server
http-server -p 8080

# Open in browser: http://localhost:8080
```

### Option 3: Using the Provided Scripts

We've created helper scripts for you:

#### PowerShell Script:
```powershell
.\start-dev-server.ps1
```

#### NPM Script (if you add package.json):
```powershell
npm start
```

## Development Workflow

1. **Start the server** using one of the methods above
2. **Open** http://localhost:8080 in your browser
3. **Make changes** to HTML/CSS/JS files
4. **Refresh** the browser (F5) to see changes
5. **Test thoroughly** before committing to GitHub
6. **Stop the server** (Ctrl+C) when done

## Automatic Browser Refresh (Optional)

For a better development experience with auto-reload:

### Using VS Code Live Server Extension:
1. Install "Live Server" extension in VS Code
2. Right-click `index.html` → "Open with Live Server"
3. Changes auto-refresh in browser

### Using Browser Sync:
```powershell
npm install -g browser-sync
browser-sync start --server --files "*.html, css/*.css, js/*.js"
```

## Troubleshooting

### Port Already in Use
If port 8080 is taken, try a different port:
```powershell
python -m http.server 8000
# Or
http-server -p 8000
```

### Server Won't Stop
If the server doesn't stop with Ctrl+C:
```powershell
# Find the process
Get-Process | Where-Object {$_.ProcessName -like "*python*"}

# Kill it (replace PID with actual process ID)
Stop-Process -Id <PID>
```

### Files Not Loading
- Make sure you're accessing via `http://localhost:8080` NOT `file://`
- Check that you're in the correct directory
- Verify `database/manifest.json` exists

## Testing Checklist

Before committing to GitHub:
- [ ] Test on localhost with dev server
- [ ] Check all categories load
- [ ] Verify images display correctly  
- [ ] Test responsive breakpoints (resize browser)
- [ ] Check browser console for errors (F12)
- [ ] Test on mobile device (if possible)
- [ ] Verify keyboard navigation works
- [ ] Check different browsers (Chrome, Firefox, Edge)

## GitHub Pages vs Local

**Differences to note:**
- GitHub Pages serves over HTTPS, localhost uses HTTP
- Paths should work the same (relative paths)
- Both should load all resources correctly
- Performance may differ (local is usually faster)

## Next Steps

Once you're happy with local testing:
1. Run validation checks (see Phase 6 in plan.md)
2. Commit changes to Git
3. Push to GitHub
4. Verify on GitHub Pages (final check)
