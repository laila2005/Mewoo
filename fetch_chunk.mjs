import https from 'https';

https.get('https://petpulse-pi.vercel.app/assets/index-Cw6BXTfq.js', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const lines = data.split('\n');
    const line = lines[203]; // 0-indexed for line 204
    if (line) {
      const col = 31825;
      const start = Math.max(0, col - 200);
      const end = Math.min(line.length, col + 200);
      console.log('--- ERROR CONTEXT ---');
      console.log(line.substring(start, end));
      console.log('--- AT COLUMN ---');
      console.log(line.substring(col - 20, col + 20));
    } else {
      console.log('Line 204 not found.');
    }
  });
}).on('error', (err) => {
  console.log('Error: ' + err.message);
});
