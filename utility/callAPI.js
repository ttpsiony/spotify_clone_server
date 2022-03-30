const axios = require('axios');

const withAxios = (method, endpoint, params, options = {}) => {
	const isCustomUrl = /^(http|https):\/\/.+/.test(endpoint);
	return axios({
		baseURL: isCustomUrl ? '' : 'https://api.spotify.com',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Accept: 'application/json',
			...options,
		},
		method: method,
		url: endpoint,
		params: method === 'get' ? params || null : null,
		data: method === 'get' ? null : params || null,
		timeout: 5000,
		responseType: 'json',
	})
		.then((response) => response)
		.catch((error) => {
			const err = error || (error.toJSON && error.toJSON());
			console.log('[callAPI.js] error', err);
			throw new Error(err);
		});
};

const callAPI = {
	get: (endpoint, params, options) => withAxios('get', endpoint, params, options),
	post: (endpoint, params, options) => withAxios('post', endpoint, params, options),
	put: (endpoint, params, options) => withAxios('put', endpoint, params, options),
	delete: (endpoint, params, options) => withAxios('delete', endpoint, params, options),
};

module.exports = callAPI;
