#!/usr/bin/env node

/**
 * scripts/generate_manifest.js
 *
 * Scans the `database/` directory and produces `database/manifest.json` with this shape:
 *
 * {
 *   categories: [
 *     {
 *       name: "NPCs",
 *       subcategories: [
 *         {
 *           name: "Female NPCs",
 *           thumbnail: "database/NPCs/Female NPCs/thumbnail.png", // or null
 *           items: [
 *             {
 *               name: "Thalia",
 *               avatar: "database/NPCs/Female NPCs/Thalia/avatar.jpg",
 *               image:   "database/NPCs/Female NPCs/Thalia/image.png", // or null
 *               info:    "…file contents of info.txt…",               // or null
 *             },
 *             …
 *           ]
 *         },
 *         …
 *       ]
 *     },
 *     …
 *   ]
 * }
 */

const fs   = require('fs');
const path = require('path');

async function main() {
  const rootDir    = path.resolve(process.cwd(), 'database');
  // ensure database/ exists (Git won’t track empty dirs)
  if (!fs.existsSync(rootDir)) {
    await fs.promises.mkdir(rootDir, { recursive: true });
  }
  const outPath    = path.join(rootDir, 'manifest.json');
  const manifest   = { categories: [] };

  // helper to list only directories, sorted alphabetically
  async function listDirs(dir) {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    return entries
      .filter(e => e.isDirectory())
      .map(e => e.name)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }

  // helper to list only files
  async function listFiles(dir) {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    return entries.filter(e => e.isFile()).map(e => e.name);
  }

  // scan top‐level categories
  const categories = await listDirs(rootDir);
  for (const cat of categories) {
    const catPath = path.join(rootDir, cat);
    const subcats = await listDirs(catPath);

    const subcategories = [];
    for (const sub of subcats) {
      const subPath = path.join(catPath, sub);
      const files   = await listFiles(subPath);

      // find optional thumbnail.*
      const thumb = files.find(fn => /^thumbnail\.[^.]+$/i.test(fn)) || null;
      const thumbnail = thumb
        ? ['database', cat, sub, thumb].join('/')
        : null;

      // scan items
      const items = [];
      const itemDirs = await listDirs(subPath);
      for (const item of itemDirs) {
        const itemPath = path.join(subPath, item);
        const itemFiles = await listFiles(itemPath);

        const avatarFile = itemFiles.find(fn => /^avatar\.[^.]+$/i.test(fn)) || null;
        const imageFile  = itemFiles.find(fn => /^image\.[^.]+$/i.test(fn))  || null;
        const infoFile   = itemFiles.find(fn => /^info\.[^.]+$/i)          || null;

        // read info text if present
        let info = null;
        if (infoFile) {
          info = await fs.promises.readFile(
            path.join(itemPath, infoFile),
            'utf8'
          );
        }

        items.push({
          name:   item,
          avatar: avatarFile
            ? ['database', cat, sub, item, avatarFile].join('/')
            : null,
          image: imageFile
            ? ['database', cat, sub, item, imageFile].join('/')
            : null,
          info
        });
      }

      subcategories.push({
        name:      sub,
        thumbnail,
        items
      });
    }

    manifest.categories.push({
      name:          cat,
      subcategories
    });
  }

  // write out pretty‐printed JSON
  await fs.promises.writeFile(outPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`✅  Generated manifest at ${outPath}`);
}

// run
main().catch(err => {
  console.error(err);
  process.exit(1);
});
