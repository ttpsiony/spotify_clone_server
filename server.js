const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require('http');

const authRouter = require('./routes/auth');
const browseRouter = require('./routes/browse');
const userRouter = require('./routes/user');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5500;
const ROUTE_PREFIX = '/api/v1/';

app.use(express.json());
app.use(express.urlencoded());
app.use(cookieParser());

app.use(
	cors({
		origin: 'http://localhost:3000',
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'X-Access-Token', 'Authentication'],
		optionsSuccessStatus: 204,
	}),
);

app.get('/', (_, res) => {
	res.send('Welcome Spotify Clone Demo Server');
});

app.use(ROUTE_PREFIX, authRouter);
app.use(ROUTE_PREFIX, browseRouter);
app.use(ROUTE_PREFIX, userRouter);

http.createServer(app).listen(PORT);
