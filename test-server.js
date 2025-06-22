const express = require('express');
const app = express();
const PORT = process.env.PORT || 8000;
const HOST = '0.0.0.0';

app.get('/', (req, res) => {
  res.json({ message: 'Test server working!' });
});

app.listen(PORT, HOST, () => {
  console.log(`Test server running on ${HOST}:${PORT}`);
});