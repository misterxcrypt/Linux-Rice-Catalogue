const fs = require('fs');

const filePath = 'data/formatted_rices.json';

fs.readFile(filePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }

  let rices = JSON.parse(data);
  rices = rices.map(rice => ({
    ...rice,
    date: rice.date || '04-04-2026'
  }));

  fs.writeFile(filePath, JSON.stringify(rices, null, 2), 'utf8', (err) => {
    if (err) {
      console.error('Error writing file:', err);
      return;
    }
    console.log('✅ Added date to all rices in formatted_rices.json');
  });
});