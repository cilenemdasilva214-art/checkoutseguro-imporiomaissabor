const fs = require('fs');

let adminJs = fs.readFileSync('js/admin.js', 'utf8');

// 1. Remove supabase initialization
adminJs = adminJs.replace(/if\s*\(window\.supabase\)\s*\{[\s\S]*?\}\s*\}\s*catch\s*\(\w+\)\s*\{\s*console\.error\('Erro na conexo realtime:',\s*\w+\);\s*\}\s*\}/g, "");
// Remove the specific supabaseClient block that I saw earlier
adminJs = adminJs.replace(/if\s*\(window\.supabase\)\s*\{\s*const SUPABASE_URL[\s\S]*?\}\s*\}\s*catch\s*\(err\)\s*\{\s*console\.error[\s\S]*?\}\s*\}/g, "");

fs.writeFileSync('js/admin.js', adminJs, 'utf8');
console.log('js/admin.js cleanup done');

