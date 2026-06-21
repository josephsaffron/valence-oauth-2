import crypto from 'node:crypto';

function requireEnv(name) {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required env var: ${name}`);
	}
	return value;
}

function toEpochSeconds(date = new Date()) {
	return Math.floor(date.getTime() / 1000).toString();
}

function buildLegacyAuthParts() {
	const appId = requireEnv('VALENCE_APP_ID');
	const appKey = requireEnv('VALENCE_APP_KEY');
	const userId = requireEnv('VALENCE_USER_ID');
	const userKey = requireEnv('VALENCE_USER_KEY');

	const nonce = process.env.LEGACY_FIXED_NONCE || crypto.randomBytes(16).toString('hex');
	const timestamp = process.env.LEGACY_FIXED_TIMESTAMP || toEpochSeconds();

	return {
		appId,
		appKey,
		userId,
		userKey,
		nonce,
		timestamp,
	};
}

function signLegacyString(stringToSign, appKey, userKey) {
	const appSig = crypto.createHmac('sha256', appKey).update(stringToSign).digest();
	const userSig = crypto.createHmac('sha256', userKey).update(appSig).digest('base64');
	return userSig;
}

export function buildLegacyQueryAndHeader(method, requestPath) {
	const parts = buildLegacyAuthParts();
	const methodUpper = method.toUpperCase();

	// Workshop-friendly canonical string for explaining nonce/timestamp signing.
	const stringToSign = [methodUpper, requestPath, parts.nonce, parts.timestamp].join('&');
	const signature = signLegacyString(stringToSign, parts.appKey, parts.userKey);

	return {
		legacyQuery: {
			x_a: parts.appId,
			x_b: parts.userId,
			x_c: parts.nonce,
			x_d: parts.timestamp,
			x_signature: signature,
		},
		explanation: {
			method: methodUpper,
			requestPath,
			nonce: parts.nonce,
			timestamp: parts.timestamp,
			stringToSign,
			signature,
		},
		headers: {
			'User-Agent': 'valence-oauth-workshop/1.0',
			Accept: 'application/json',
		},
	};
}

