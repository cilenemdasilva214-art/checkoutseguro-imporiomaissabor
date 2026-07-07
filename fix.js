const fs = require('fs');
let code = fs.readFileSync('js/admin.js', 'utf8');

// Fix invalid assignment
code = code.replace(/escapeHtml\(client\.name\) = tx\.customer_name;/g, "client.name = tx.customer_name;");
code = code.replace(/if \(tx\.customer_name && \(\!escapeHtml\(client\.name\) \|\| escapeHtml\(client\.name\) === 'Sem Nome'\)\)/g, "if (tx.customer_name && (!client.name || client.name === 'Sem Nome'))");

// Fix missing catch block
let lines = code.split(/\r?\n/);
let output = [];
let replaced = false;
for (let i = 0; i < lines.length; i++) {
  if (!replaced && lines[i].includes('// 3. Atualiza')) {
    output.push('    } catch (err) {');
    output.push('      console.error(\"Erro ao carregar dados iniciais:\", err);');
    output.push('    }');
    output.push('  }');
    output.push('');
    replaced = true;
  }
  output.push(lines[i]);
}
fs.writeFileSync('js/admin.js', output.join('\n'));
console.log('Fixed js/admin.js. Replaced: ' + replaced);
