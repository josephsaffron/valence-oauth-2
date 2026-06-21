import axios from 'axios';

function env(name) {
	return process.env[name] || '';
}

function requireEnv(name) {
	const value = env(name);
	if (!value) {
		throw new Error(`Missing required env var: ${name}`);
	}
	return value;
}

async function getAccessToken() {
	const staticToken = env('OAUTH2_ACCESS_TOKEN');
	if (staticToken) {
		return {
			accessToken: staticToken,
			source: 'env',
		};
	}

	const tokenUrl = requireEnv('OAUTH2_TOKEN_URL');
	const clientId = requireEnv('OAUTH2_CLIENT_ID');
	const clientSecret = requireEnv('OAUTH2_CLIENT_SECRET');
	const scope = env('OAUTH2_SCOPE');

	const body = new URLSearchParams();
	body.set('grant_type', 'client_credentials');
	if (scope) {
		body.set('scope', scope);
	}

	const response = await axios.post(tokenUrl, body.toString(), {
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		auth: {
			username: clientId,
			password: clientSecret,
		},
		timeout: Number(process.env.DEMO_TIMEOUT_MS || '15000'),
	});

	if (!response.data || !response.data.access_token) {
		throw new Error('Token response did not contain access_token');
	}

	return {
		accessToken: response.data.access_token,
		source: 'client_credentials',
		expiresIn: response.data.expires_in,
		tokenType: response.data.token_type,
	};
}

export async function buildOAuth2Header() {
	const token = await getAccessToken();
	return {
		headers: {
			Authorization: `Bearer ${token.accessToken}`,
			'User-Agent': 'valence-oauth-workshop/1.0',
			Accept: 'application/json',
		},
		tokenMeta: {
			source: token.source,
			expiresIn: token.expiresIn,
			tokenType: token.tokenType,
		},
	};
}

