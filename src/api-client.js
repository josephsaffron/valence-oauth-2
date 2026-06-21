import axios from 'axios';
import { buildLegacyQueryAndHeader } from './legacy-auth.js';
import { buildOAuth2Header } from './oauth2-auth.js';

function getBaseUrl() {
	const baseUrl = process.env.BRIGHTSPACE_BASE_URL;
	if (!baseUrl) {
		throw new Error('Missing required env var: BRIGHTSPACE_BASE_URL');
	}
	return baseUrl.replace(/\/$/, '');
}

function getApiPath() {
	return process.env.BRIGHTSPACE_API_PATH || '/d2l/api/lp/1.0/users/whoami';
}

export async function callBrightspace({ authMode }) {
	const method = 'GET';
	const baseUrl = getBaseUrl();
	const apiPath = getApiPath();
	const url = `${baseUrl}${apiPath}`;

	let requestConfig = {
		method,
		url,
		timeout: Number(process.env.DEMO_TIMEOUT_MS || '15000'),
	};

	let authDebug = {};

	if (authMode === 'legacy') {
		const legacy = buildLegacyQueryAndHeader(method, apiPath);
		requestConfig = {
			...requestConfig,
			headers: legacy.headers,
			params: legacy.legacyQuery,
		};
		authDebug = legacy.explanation;
	} else if (authMode === 'oauth2') {
		const oauth2 = await buildOAuth2Header();
		requestConfig = {
			...requestConfig,
			headers: oauth2.headers,
		};
		authDebug = oauth2.tokenMeta;
	} else {
		throw new Error(`Unsupported auth mode: ${authMode}`);
	}

	const response = await axios(requestConfig);

	return {
		authMode,
		request: {
			method,
			url,
			params: requestConfig.params || {},
			headersPreview: redactHeaders(requestConfig.headers || {}),
		},
		authDebug,
		response: {
			status: response.status,
			data: response.data,
		},
	};
}

function redactHeaders(headers) {
	const out = { ...headers };
	if (out.Authorization) {
		out.Authorization = 'Bearer [redacted]';
	}
	return out;
}

