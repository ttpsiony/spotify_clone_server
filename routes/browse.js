const express = require('express');
const apiCache = require('apicache');
const { Buffer } = require('buffer');

const callAPI = require('../utility/callAPI');
const axios = require('axios');
const { generateRandomNumbers, rand, colorList } = require('../utility/helper');

const router = express.Router();
const cache = apiCache.middleware;

const middleware = async (req, res, next) => {
	try {
		const client_id = process.env.CLIENT_ID;
		const client_secret = process.env.CLIENT_SECRET;
		const base64String = Buffer.from(`${client_id}:${client_secret}`, 'utf8').toString('base64');

		const { data } = await axios({
			method: 'POST',
			url: 'https://accounts.spotify.com/api/token',
			headers: {
				Authorization: `Basic ${base64String}`,
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			params: {
				grant_type: 'client_credentials',
			},
		});

		if (!data.access_token) {
			throw new Error('Fail to get client_credentials!');
		}

		req.client_credentials_access_token = data.access_token;
		next();
	} catch (error) {
		res.status(401).json({ status: 'FAIL', error: error.message || error, data: null });
	}
};

//
//
//
const onlyStatus200 = (_, res) => res.statusCode === 200;
// 首頁播放清單
router.get('/featured-playlists', middleware, cache('1 hour', onlyStatus200), async (req, res) => {
	try {
		const client_credentials_access_token = req.client_credentials_access_token;
		const params = { country: 'TW', locale: 'zh_TW', limit: 5, offset: 0 };
		const options = { Authorization: `Bearer ${client_credentials_access_token}` };
		const { data = {} } = await callAPI.get('/v1/browse/featured-playlists', params, options);
		//
		const { data: { categories } = {} } = await callAPI.get(
			'/v1/browse/categories',
			{ country: 'TW', locale: 'zh_TW', limit: 50 },
			options,
		);

		const numbers = generateRandomNumbers(4, 50);
		const __params = { country: 'TW', locale: 'zh_TW', limit: 5 };
		let categories_response = [];
		categories_response = await Promise.all(
			numbers.map((i) =>
				callAPI.get(`/v1/browse/categories/${categories.items[i].id}/playlists`, __params, options),
			),
		).catch(() => {
			categories_response = [];
		});

		const category_playlists = categories_response.map(({ data }, i) => ({
			id: categories.items[numbers[i]].id,
			name: categories.items[numbers[i]].name,
			...data.playlists,
		}));
		let _data = [];
		_data.push({ name: '為你打造', id: '', ...data.playlists });
		_data = _data.concat(category_playlists);

		res.status(200).json({ status: 'SUCCESS', error: null, data: _data || [] });
	} catch (error) {
		console.log('error', error);
		res.status(400).json({
			status: 'FAIL',
			message: 'Fail to retrieve featured-playlist.',
			error: error.message || error,
			data: null,
		});
	}
});

//
// 音樂類別
router.get('/categories', middleware, cache('1 hour', onlyStatus200), async (req, res) => {
	try {
		const client_credentials_access_token = req.client_credentials_access_token;
		const params = { country: 'TW', locale: 'zh_TW', limit: 50 };
		const options = { Authorization: `Bearer ${client_credentials_access_token}` };
		const { data = {} } = await callAPI.get('/v1/browse/categories', params, options);

		const { items } = data.categories || {};

		const _data = {
			...data.categories,
			items: items.map((item) => ({ ...item, color: colorList[rand(0, colorList.length)] })),
		};

		res.status(200).json({ status: 'SUCCESS', error: null, data: _data });
		//
	} catch (error) {
		console.log('error', error);
		res.status(400).json({
			status: 'FAIL',
			message: 'Fail to retrieve category list.',
			error: error.message || error,
			data: null,
		});
	}
});

// 音樂類別 播放列表
router.get('/categories/playlists', middleware, async (req, res) => {
	try {
		const client_credentials_access_token = req.client_credentials_access_token;
		const category_id = req.query.category_id;

		if (!category_id) {
			throw new Error('Invalid Request. category_id must be provided!');
		}

		const limit = req.query.limit || 50;
		const offset = req.query.offset || 0;
		const params = { country: 'TW', limit, offset };
		const options = { Authorization: `Bearer ${client_credentials_access_token}` };
		const { data: cat_data = {} } = await callAPI.get(
			`/v1/browse/categories/${category_id}`,
			{ locale: 'zh_TW', country: 'TW' },
			options,
		);

		const { data } = await callAPI.get(
			`/v1/browse/categories/${category_id}/playlists`,
			params,
			options,
		);

		res.status(200).json({
			status: 'SUCCESS',
			error: null,
			data: { ...data, name: cat_data.name },
		});
	} catch (error) {
		console.log('error', error);
		res.status(400).json({
			status: 'FAIL',
			message: 'Fail to retrieve category playlists.',
			error: error.message || error,
			data: null,
		});
	}
});

// 播放清單歌曲列表
router.get('/playlist/:playlist_id/tracks', middleware, async (req, res) => {
	try {
		const client_credentials_access_token = req.client_credentials_access_token;
		const playlist_id = req.params.playlist_id;
		const params = { market: 'TW', additional_types: 'track' };
		const options = { Authorization: `Bearer ${client_credentials_access_token}` };
		const { data } = await callAPI.get(`/v1/playlists/${playlist_id}`, params, options);

		let _data = { ...data };
		const user_access_token = req.headers['x-access-token'];

		if (user_access_token) {
			// 檢查 user 收藏
			const { tracks = {} } = data || {};
			const ids_groups = [];
			const items = tracks.items || [];

			let group = [];
			for (let i = 0; i < items.length; i++) {
				const track = (items[i] || {}).track || {};
				const id = track.id || '';
				group.push(id);
				if (group.length === 10) {
					ids_groups.push(group);
					group = [];
				}
			}
			if (group.length) {
				ids_groups.push(group); // 剩餘的id
			}

			if (ids_groups.length > 0) {
				const options = { Authorization: `Bearer ${user_access_token}` };
				const promises = ids_groups.map((group) =>
					callAPI.get(`v1/me/tracks/contains`, { ids: group.join(',') }, options),
				);
				const response_data = await Promise.all(promises);
				const collected_data = response_data.reduce(
					(collected, { data: group }) => collected.concat(group),
					[],
				);

				_data = {
					...data,
					tracks: {
						...data.tracks,
						items: (tracks.items || []).map((item, idx) => ({
							...item,
							is_collected: collected_data[idx] || false,
						})),
					},
				};
			}
		}

		res.status(200).json({ status: 'SUCCESS', error: null, data: _data });
	} catch (error) {
		console.log('error', error);
		res.status(400).json({
			status: 'FAIL',
			message: 'Fail to retrieve playlist tracks',
			error: error.message || error,
			data: null,
		});
	}
});

// 搜尋
router.get('/search', middleware, async (req, res) => {
	try {
		const client_credentials_access_token = req.client_credentials_access_token;
		const q = req.query.q || '';
		if (!q) {
			throw new Error('Please enter some text');
		}

		const type = ['playlist', 'track'].join(',');
		const params = { country: 'TW', include_external: 'audio', limit: 10, offset: 0, type, q };
		const options = { Authorization: `Bearer ${client_credentials_access_token}` };
		const { data } = await callAPI.get(`/v1/search`, params, options);

		const token = req.headers['x-access-token'];
		let collects = [];
		if (token) {
			const ids = (data?.tracks?.items || []).map((item) => item.id).join(',');
			const _options = { Authorization: `Bearer ${token}` };
			const { data: collected_data } = await callAPI.get(
				`v1/me/tracks/contains`,
				{ ids },
				_options,
			);

			collects = [...collected_data];
		}

		const _data = {
			playlists: data?.playlists?.items || [],
			tracks:
				data?.tracks?.items?.map((track, i) => ({
					...track,
					is_collected: collects[i] || false,
				})) || [],
		};

		res.status(200).json({ status: 'SUCCESS', error: null, data: _data });
	} catch (error) {
		console.log('error', error);
		res.status(400).json({
			status: 'FAIL',
			message: 'Fail to find',
			error: error.message || error,
			data: null,
		});
	}
});

module.exports = router;
