const { connectDB, dbConfig } = require('./db');

const express = require('express');
const redirectUri = require('./index');
const app = express();

app.get('/signin', (req, res) => {
    res.send('Token generated sucessfully');
});
