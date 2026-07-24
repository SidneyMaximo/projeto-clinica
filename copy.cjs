const fs = require('fs');
const content = fs.readFileSync('src/components/ExamBudgets.tsx', 'utf-8');
console.log(content.length + " bytes read.");
fs.writeFileSync('ExamBudgetsCopy.txt', content);
