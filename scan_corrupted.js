const fs = require('fs');
const path = require('path');

function scanDir(dir) {
  let files = fs.readdirSync(dir);
  let corrupted = new Set();
  
  for (let file of files) {
    let fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        scanDir(fullPath);
      }
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.html')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let matches = content.match(/├./g);
      if (matches) {
        matches.forEach(m => corrupted.add(m));
      }
    }
  }
  return corrupted;
}
let c = scanDir('.');
console.log(Array.from(c));
