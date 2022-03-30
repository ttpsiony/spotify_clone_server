const express = require('express');
const { Buffer } = require('buffer');
const axios = require('axios');

const router = express.Router();
const {
	authorization_scopes,
	queryStringGenerator,
	generateRandomString,
} = require('../utility/helper');

router.post('/auth/login', async (req, res) => {
	try {
		const client_id = process.env.CLIENT_ID;
		const response_type = 'code';
		const redirect_uri = process.env.REDIRECT_URI;
		const scope = authorization_scopes.join(' ');
		const csrf_state = generateRandomString(48);

		const params = {
			response_type,
			scope: encodeURIComponent(scope),
			state: csrf_state,
			client_id: encodeURIComponent(client_id),
			redirect_uri: encodeURIComponent(redirect_uri),
			show_dialog: true, // always ask permission
		};
		const query = queryStringGenerator(params);
		const url = `https://accounts.spotify.com/authorize?${query}`;

		res.status(200).json({ status: 'SUCCESS', error: null, data: { url, csrf_state } });
	} catch (error) {
		res
			.status(401)
			.json({ status: 'FAIL', error: (error && error.message) || 'Fail to login!', data: null });
	}
});

// request access_token and refresh_token
router.post('/auth/callback', async (req, res) => {
	try {
		const redirect_uri = process.env.REDIRECT_URI;
		const client_id = process.env.CLIENT_ID;
		const client_secret = process.env.CLIENT_SECRET;
		const code = req.body.code || '';
		const state = req.body.state || '';
		if (!state) {
			throw new Error('state_mismatch');
		}

		const grant_type = 'authorization_code';
		const base64String = Buffer.from(`${client_id}:${client_secret}`, 'utf8').toString('base64');

		const { data } = await axios({
			method: 'POST',
			url: 'https://accounts.spotify.com/api/token',
			headers: {
				Authorization: `Basic ${base64String}`,
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			params: { code, grant_type, redirect_uri },
		});

		const _data = { ...data };
		delete _data.scope;
		res.status(200).json({ status: 'SUCCESS', error: null, data: _data });
	} catch (error) {
		res.status(401).json({
			status: 'FAIL',
			error: (error && error.message) || 'Fail to retrieve the access_token.',
			data: null,
		});
	}
});

// TODO: refresh access_token
router.put('/auth/callback', async (req, res) => {
	try {
		const client_id = process.env.CLIENT_ID;
		const client_secret = process.env.CLIENT_SECRET;
		const refresh_token = req.body.refresh_token;
		const grant_type = 'refresh_token';
		const base64String = Buffer.from(`${client_id}:${client_secret}`, 'utf8').toString('base64');

		if (!refresh_token) {
			throw new Error('refresh_token must be provided.');
		}

		const { data } = await axios({
			method: 'POST',
			url: 'https://accounts.spotify.com/api/token',
			headers: {
				Authorization: `Basic ${base64String}`,
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			params: { grant_type, refresh_token },
		});

		res.status(200).json({ status: 'SUCCESS', error: null, data: { ...data } });
	} catch (error) {
		res.status(401).json({
			status: 'FAIL',
			error: (error && error.message) || 'Fail to retrieve refreshed access_token.',
			data: null,
		});
	}
});

module.exports = router;
