const express = require('express');
const callAPI = require('../utility/callAPI');
const { queryStringGenerator } = require('../utility/helper');

const router = express.Router();

const middleware = async (req, res, next) => {
	const token = req.headers['x-access-token'];

	if (!token) {
		res.status(401).json({
			status: 'FAIL',
			message: 'You are not allowed to retrieve the data.',
			error: 'Authorization denied!',
			data: null,
		});

		return;
	}

	next();
};

// 使用者的基本資料
router.post('/user/me', middleware, async (req, res) => {
	try {
		const token = req.headers['x-access-token'];
		const options = { Authorization: `Bearer ${token}` };
		const { data = {} } = await callAPI.get('/v1/me', null, options);

		const _data = {
			user_id: data.id,
			token: token,
			display_name: data.display_name,
			email: data.email,
		};
		res.status(200).json({ status: 'SUCCESS', error: null, data: _data });
	} catch (error) {
		console.log('error', error);
		res.status(400).json({
			status: 'FAIL',
			message: 'Fail to retrieve user profile.',
			error: error.message || error,
			data: null,
		});
	}
});

// 使用者的音樂庫清單
router.post('/user/playlists', middleware, async (req, res) => {
	try {
		const token = req.headers['x-access-token'];

		const user_id = req.body.user_id;
		const offset = req.body.offset || 0;
		const limit = req.body.limit || 20;

		if (!user_id) {
			res.status(400).json({ status: 'FAIL', error: 'user_id must be required!', data: [] });
			return;
		}

		const options = { Authorization: `Bearer ${token}` };
		const { data = {} } = await callAPI.get(
			`v1/users/${user_id}/playlists?${queryStringGenerator({ offset, limit })}`,
			null,
			options,
		);

		res.status(200).json({ status: 'SUCCESS', error: null, data: data });
	} catch (error) {
		console.log('error', error);

		res.status(400).json({
			status: 'FAIL',
			message: 'Fail to retrieve user playlists.',
			error: error.message || error,
			data: null,
		});
	}
});

// 使用者「已按讚的歌曲」的歌曲
router.get('/user/tracks', middleware, async (req, res) => {
	try {
		const token = req.headers['x-access-token'];

		const offset = req.body.offset || 0;
		const limit = req.body.limit || 20;
		const options = { Authorization: `Bearer ${token}` };
		const { data = {} } = await callAPI.get(
			`v1/me/tracks`,
			{ offset, limit, market: 'TW' },
			options,
		);

		const ids = (data.items || []).map((item) => item.track.id).join(',');
		const { data: collected_data } = await callAPI.get(`v1/me/tracks/contains`, { ids }, options);

		const _data = {
			...data,
			items: data.items.map((item, idx) => ({
				added_at: item.added_at,
				track: {
					...item.track,
					is_collected: collected_data[idx] || false,
				},
			})),
		};

		res.status(200).json({ status: 'SUCCESS', error: null, data: _data });
	} catch (error) {
		console.log('error', error);

		res.status(400).json({
			status: 'FAIL',
			message: 'Fail to retrieve user tracks.',
			error: error.message || error,
			data: null,
		});
	}
});

// 加歌曲至收藏(已按讚的歌曲)
router.put('/user/track/:track_id/collection', middleware, async (req, res) => {
	try {
		const token = req.headers['x-access-token'];

		const track_id = req.params.track_id;
		const options = { Authorization: `Bearer ${token}` };
		await callAPI.put(`v1/me/tracks`, { ids: [track_id] }, options);

		res.status(200).json({ status: 'SUCCESS', error: null, data: null });
	} catch (error) {
		console.log('error', error);

		res.status(400).json({
			status: 'FAIL',
			message: 'Fail to update user track collection.',
			error: error.message || error,
			data: null,
		});
	}
});

// 移除收藏歌曲(已按讚的歌曲)
router.delete('/user/track/:track_id/collection', middleware, async (req, res) => {
	try {
		const token = req.headers['x-access-token'];

		const track_id = req.params.track_id;
		const options = { Authorization: `Bearer ${token}` };
		await callAPI.delete(`v1/me/tracks`, { ids: [track_id] }, options);

		res.status(200).json({ status: 'SUCCESS', error: null, data: null });
	} catch (error) {
		console.log('error', error);

		res.status(400).json({
			status: 'FAIL',
			message: 'Fail to update user track collection.',
			error: error || error.message,
			data: null,
		});
	}
});

// 加歌曲(track)到使用者的播放清單(playlists)
router.post('/user/playlists/:playlist_id/track', middleware, async (req, res) => {
	try {
		const token = req.headers['x-access-token'];

		const playlist_id = req.params.playlist_id;
		const uris = `spotify:track:${req.body.track_id}`;
		const options = { Authorization: `Bearer ${token}` };
		await callAPI.post(
			`v1/playlists/${playlist_id}/tracks?${queryStringGenerator({ position: 0, uris })}`,
			null,
			options,
		);

		res.status(200).json({ status: 'SUCCESS', error: null, data: [] });
	} catch (error) {
		console.log('error', error);
		res.status(400).json({
			status: 'FAIL',
			message: "Fail to add track to user's playlist.",
			error: error.message || error,
			data: null,
		});
	}
});

// 從使用者的播放清單(playlists)移除歌曲(track)
router.delete('/user/playlists/:playlist_id/track', middleware, async (req, res) => {
	try {
		const token = req.headers['x-access-token'];

		const playlist_id = req.params.playlist_id;
		const tracks = [{ uri: `spotify:track:${req.body.track_id}` }];
		const options = { Authorization: `Bearer ${token}` };
		await callAPI.delete(`v1/playlists/${playlist_id}/tracks`, { tracks }, options);

		res.status(200).json({ status: 'SUCCESS', error: null, data: [] });
	} catch (error) {
		console.log('error', error);
		res.status(400).json({
			status: 'FAIL',
			message: "Fail to remove track from user's playlist.",
			error: error.message || error,
			data: null,
		});
	}
});

// 檢查使用者是否有收藏播放清單
router.get('/user/playlist/:playlist_id/follow', middleware, async (req, res) => {
	try {
		const token = req.headers['x-access-token'];
		const playlist_id = req.params.playlist_id;
		const user_id = req.query.user_id;

		if (!user_id) {
			res.status(400).json({ status: 'FAIL', error: 'user_id must be required!', data: null });
			return;
		}

		const options = { Authorization: `Bearer ${token}` };
		const { data } = await callAPI.get(
			`v1/playlists/${playlist_id}/followers/contains`,
			{ ids: user_id },
			options,
		);

		res.status(200).json({ status: 'SUCCESS', error: null, data: data });
	} catch (error) {
		console.log('error', error);
		res.status(400).json({
			status: 'FAIL',
			message: 'Fail to check user following playlist.',
			error: error.message || error,
			data: null,
		});
	}
});

// 使用者收藏播放清單
router.put('/user/playlist/:playlist_id/follow', middleware, async (req, res) => {
	try {
		const token = req.headers['x-access-token'];
		const playlist_id = req.params.playlist_id;
		const options = { Authorization: `Bearer ${token}` };
		await callAPI.put(`v1/playlists/${playlist_id}/followers`, { public: true }, options);

		res.status(200).json({ status: 'SUCCESS', error: null, data: null });
	} catch (error) {
		console.log('error', error);
		res.status(400).json({
			status: 'FAIL',
			message: 'Fail to update user following playlist.',
			error: error.message || error,
			data: null,
		});
	}
});

// 使用者移除收藏播放清單
router.delete('/user/playlist/:playlist_id/follow', middleware, async (req, res) => {
	try {
		const token = req.headers['x-access-token'];
		const playlist_id = req.params.playlist_id;
		const options = { Authorization: `Bearer ${token}` };
		await callAPI.delete(`v1/playlists/${playlist_id}/followers`, null, options);

		res.status(200).json({ status: 'SUCCESS', error: null, data: null });
	} catch (error) {
		console.log('error', error);
		res.status(400).json({
			status: 'FAIL',
			message: 'Fail to update user following playlist.',
			error: error.message || error,
			data: null,
		});
	}
});

// 更動播放清單名稱(描述、公開)
router.put('/user/playlist/:playlist_id/detail', middleware, async (req, res) => {
	try {
		const token = req.headers['x-access-token'];
		const playlist_id = req.params.playlist_id;

		const params = { market: 'TW', additional_types: 'track' };
		const options = { Authorization: `Bearer ${token}` };
		const { data = {} } = await callAPI.get(`v1/playlists/${playlist_id}`, params, options);

		const description = req.body.description || data.description;
		const public = req.body.public || data.public;
		const name = req.body.name || data.name;

		const _params = { name, public };
		if (description) {
			_params.description = description;
		}
		const _options = { ...options, 'Content-Type': 'application/json' };
		await callAPI.put(`/v1/playlists/${playlist_id}`, _params, _options);

		res.status(200).json({ status: 'SUCCESS', error: null, data: null });
	} catch (error) {
		console.log('error', error);
		res.status(400).json({
			status: 'FAIL',
			message: 'Fail to update user playlist detail.',
			error: error || error.message,
			data: null,
		});
	}
});

// 使用者新增播放清單(未完)
router.post('/user/playlist/create', middleware, async (req, res) => {
	try {
		const token = req.headers['x-access-token'];
		const user_id = req.query.user_id;
		if (!user_id) {
			res.status(400).json({ status: 'FAIL', error: 'user_id must be required!', data: null });
			return;
		}

		const options = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
		const params = { name: '# 新播放清單', public: true };
		await callAPI.post(`v1/users/${user_id}/playlists`, params, options);

		res.status(200).json({ status: 'SUCCESS', error: null, data: null });
	} catch (error) {
		console.log('error', error);
		res.status(400).json({
			status: 'FAIL',
			message: 'Fail to create new playlist.',
			error: error || error.message,
			data: null,
		});
	}
});

module.exports = router;
