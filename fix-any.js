const fs = require('fs');
const glob = require('glob');

const files = glob.sync('app/**/*.tsx');
let count = 0;
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('props: any')) {
    fs.writeFileSync(file, content.replace(/props:\s*any/g, 'props: Record<string, unknown>'));
    count++;
  }
});
console.log('Fixed', count, 'files');
