require('dotenv').config();
const express = require('express');
const cors = require('cors');
app.get('/', (req, res) => {
    res.send('Civil Connect Backend Running');
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
