import axios from 'axios';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { SignJWT, importPKCS8 } from 'jose';

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
			clientAuthMethod: 'n/a',
		};
	}

	const tokenUrl = requireEnv('OAUTH2_TOKEN_URL');
	const clientId = requireEnv('OAUTH2_CLIENT_ID');
	const scope = env('OAUTH2_SCOPE');
	const clientAuthMethod = env('OAUTH2_CLIENT_AUTH_METHOD') || 'client_secret_basic';

	const body = new URLSearchParams();
	body.set('grant_type', 'client_credentials');
	if (scope) {
		body.set('scope', scope);
	}

	const requestConfig = {
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		timeout: Number(process.env.DEMO_TIMEOUT_MS || '15000'),
	};

	if (clientAuthMethod === 'private_key_jwt') {
		body.set('client_id', clientId);
		body.set('client_assertion_type', 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer');
		body.set('client_assertion', await buildClientAssertion(tokenUrl, clientId));
	} else {
		const clientSecret = requireEnv('OAUTH2_CLIENT_SECRET');
		requestConfig.auth = {
			username: clientId,
			password: clientSecret,
		};
	}

	const response = await axios.post(tokenUrl, body.toString(), requestConfig);

	if (!response.data || !response.data.access_token) {
		throw new Error('Token response did not contain access_token');
	}

	return {
		accessToken: response.data.access_token,
		source: 'client_credentials',
		clientAuthMethod,
		expiresIn: response.data.expires_in,
		tokenType: response.data.token_type,
	};
}

async function buildClientAssertion(tokenUrl, clientId) {
	const algorithm = env('OAUTH2_PRIVATE_KEY_ALG') || 'RS256';
	const keyId = env('OAUTH2_PRIVATE_KEY_KID') || env('OAUTH2_PRIVATE_KEY_KEYID');
	if (!keyId) {
		throw new Error('Missing required env var for private_key_jwt: OAUTH2_PRIVATE_KEY_KID');
	}
	const issuer = env('OAUTH2_CLIENT_ASSERTION_ISS') || clientId;
	const subject = env('OAUTH2_CLIENT_ASSERTION_SUB') || clientId;
	const privateKeyPem = await loadPrivateKeyPem();

	const key = await importPKCS8(privateKeyPem, algorithm);
	const protectedHeader = {
		alg: algorithm,
		typ: 'JWT',
		kid: keyId,
	};

	return new SignJWT({})
		.setProtectedHeader(protectedHeader)
		.setIssuer(issuer)
		.setSubject(subject)
		.setAudience(tokenUrl)
		.setJti(randomUUID())
		.setIssuedAt()
		.setExpirationTime('5m')
		.sign(key);
}

async function loadPrivateKeyPem() {
	const inlinePem = env('OAUTH2_PRIVATE_KEY_PEM');
	if (inlinePem) {
		return inlinePem.replace(/\\n/g, '\n');
	}

	const keyPath = requireEnv('OAUTH2_PRIVATE_KEY_PATH');
	return readFile(keyPath, 'utf8');
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
			clientAuthMethod: token.clientAuthMethod,
			expiresIn: token.expiresIn,
			tokenType: token.tokenType,
		},
	};
}

