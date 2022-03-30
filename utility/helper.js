const authorization_scopes = [
	'user-top-read',
	'user-read-private',
	'user-read-email',
	'user-library-read',
	'user-library-modify',
	'playlist-read-private',
	'playlist-read-collaborative',
	'playlist-modify-private',
	'playlist-modify-public',
	'streaming',
];

const colorList = [
	'rgb(39, 133, 106)',
	'rgb(30, 50, 100)',
	'rgb(141, 103, 171)',
	'rgb(232, 17, 91)',
	'rgb(180, 155, 200)',
	'rgb(160, 195, 210)',
	'rgb(71, 125, 149)',
	'rgb(20, 138, 8)',
	'rgb(240, 55, 165)',
	'rgb(13, 115, 236)',
	'rgb(230, 30, 50)',
];

const rand = (min = 0, max = 1) => Math.floor(Math.random(0, 1) * (max - min)) + min;

const arrayFromLowToHigh = (low, high) => {
	const array = [];
	for (let i = low; i <= high; i++) {
		array.push(i);
	}
	return array;
};

const generateRandomString = (digit = 16) => {
	if (typeof digit !== 'number') return null;

	const UPPERCASE_CHAR_CODE = arrayFromLowToHigh(65, 90);
	const LOWERCASE_CHAR_CODE = arrayFromLowToHigh(97, 122);
	const NUMBER_CHAR_CODE = arrayFromLowToHigh(48, 57);
	const charCodes = UPPERCASE_CHAR_CODE.concat(LOWERCASE_CHAR_CODE).concat(NUMBER_CHAR_CODE);

	const str = Array.from({ length: digit })
		.map(() => {
			const code = charCodes[Math.floor(Math.random() * charCodes.length)];
			return String.fromCharCode(code);
		})
		.join('');

	return str;
};

const generateRandomNumbers = (total = 5, max = 50, min = 0) => {
	if (total >= max - min) return [];
	if (!Number.isInteger(total) || !Number.isInteger(max) || !Number.isInteger(min)) return [];

	const numbers = [];
	for (let i = 0; i <= total; i++) {
		const rand = Math.floor(Math.random() * (max - min) + min);

		if (numbers.includes(rand)) {
			--i;
		} else {
			numbers.push(rand);
		}
	}

	return numbers;
};

const queryStringGenerator = (params) => {
	if (typeof params !== 'object') return '';
	let arr = [];
	Object.keys(params).forEach((key) => {
		if (params[key]) {
			arr.push(`${key}=${params[key]}`);
		}
	});

	return arr.join('&');
};

module.exports = {
	authorization_scopes,
	generateRandomString,
	generateRandomNumbers,
	queryStringGenerator,
	colorList,
	rand,
};
