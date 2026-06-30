const fs = require('fs');
let text = fs.readFileSync('js/app.js', 'utf8');

function unMojibake(str) {
    try {
        let buf = Buffer.from(str, 'latin1');
        let decoded = buf.toString('utf8');
        // if decoded contains standard replacement characters, it failed
        if (decoded.includes('\uFFFD')) return str;
        return decoded;
    } catch (e) {
        return str;
    }
}

let iters = 0;
while(text.includes('Ã') || text.includes('ǟ')) {
    let newText = unMojibake(text);
    if (newText === text) break;
    text = newText;
    iters++;
}

console.log('Fixed js/app.js in ' + iters + ' iterations. Sample:');
console.log(text.substring(0, 300));
