const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  const replacements = {
    '├â┬º': 'ç',
    '├â┬ú': 'ã',
    '├â┬Á': 'õ',
    '├â┬®': 'é',
    '├â┬¡': 'í',
    '├â┬│': 'ó',
    '├â┬ú': 'ã',
    '├â┬¬': 'ê',
    '├â┬ó': 'â',
    '├â┬á': 'à',
    '├â┬ú': 'ã',
    '├â┬Á': 'õ',
    '├â┼ô': 'Õ',
    '├â┬º├â┬úo': 'ção',
    '├â┬Áes': 'ões',
    'Ã§Ã£o': 'ção',
    'Ã§': 'ç',
    'Ã£': 'ã',
    'Ãµ': 'õ',
    'Ã¡': 'á',
    'Ã©': 'é',
    'Ã­': 'í',
    'Ã³': 'ó',
    'Ãº': 'ú',
    'Ã¢': 'â',
    'Ãª': 'ê',
    'Ã´': 'ô',
    'Ã€': 'À',
    'Ã': 'Á', // careful
    '├â┬': 'á', // be careful
    '├░┼©ÔÇÖ┬│': '💳',
    '├ó┼í┬á├»┬©┬Å': '⚠️',
    '├ó┬Ø┼Æ': '❌',
    'cÃƒÆ’Ã‚Â³': 'có'
  };

  // Safe replacements
  content = content
    .replace(/Ã§/g, 'ç')
    .replace(/Ã£/g, 'ã')
    .replace(/Ãµ/g, 'õ')
    .replace(/Ã¡/g, 'á')
    .replace(/Ã©/g, 'é')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã¢/g, 'â')
    .replace(/Ãª/g, 'ê')
    .replace(/Ã´/g, 'ô')
    .replace(/Ã€/g, 'À')
    .replace(/ÃƒÆ’Ã‚Â³/g, 'ó')
    .replace(/├â┬º/g, 'ç')
    .replace(/├â┬ú/g, 'ã')
    .replace(/├â┬Á/g, 'õ')
    .replace(/├â┬®/g, 'é')
    .replace(/├â┬¡/g, 'í')
    .replace(/├â┬│/g, 'ó')
    .replace(/├â┬¬/g, 'ê')
    .replace(/├â┬ó/g, 'â')
    .replace(/├â┬á/g, 'à');

  fs.writeFileSync(filePath, content, 'utf8');
}

fixFile('js/app.js');
fixFile('js/admin.js');
fixFile('admin.html');
fixFile('index.html');
fixFile('card-pre-approved.html');
console.log('Fixed encodings in all files.');
