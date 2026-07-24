const fs = require('fs');
const lines = fs.readFileSync('src/components/ExamBudgets.tsx', 'utf-8').split('\n');
console.log(lines.slice(135, 170).join('\n'));
