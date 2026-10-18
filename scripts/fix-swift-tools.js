const fs = require('fs');
const path = require('path');

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.name === 'Package.swift') {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('swift-tools-version: 6.2')) {
        content = content.replace(/swift-tools-version:\s*6\.2/g, 'swift-tools-version: 6.0');
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`[fix-swift-tools] Patched Package.swift: ${fullPath}`);
      }
    } else if (entry.name.endsWith('.swift')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('weak let ')) {
        content = content.replace(/\bweak\s+let\b/g, 'weak var');
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`[fix-swift-tools] Patched weak let -> weak var: ${fullPath}`);
      }
    }
  }
}

walk(path.join(__dirname, '..', 'node_modules'));
console.log('[fix-swift-tools] Done checking Swift files.');
