import 'dotenv/config';

import { callBrightspace } from './api-client.js';

function safeStringify(value) {
	return JSON.stringify(value, null, 2);
}

async function runLegacy() {
	console.log('\n=== Legacy ID/Key demo ===');
	const result = await callBrightspace({ authMode: 'legacy' });
	console.log('Request preview:');
	console.log(safeStringify(result.request));
	console.log('Legacy signing details:');
	console.log(safeStringify(result.authDebug));
	console.log('Response:');
	console.log(safeStringify(result.response));
}

async function runOauth2() {
	console.log('\n=== OAuth2 demo ===');
	const result = await callBrightspace({ authMode: 'oauth2' });
	console.log('Request preview:');
	console.log(safeStringify(result.request));
	console.log('Token details:');
	console.log(safeStringify(result.authDebug));
	console.log('Response:');
	console.log(safeStringify(result.response));
}

async function runMigrationCompare() {
	console.log('\n=== Migration demo (same endpoint, different auth) ===');
	const legacy = await callBrightspace({ authMode: 'legacy' });
	const oauth2 = await callBrightspace({ authMode: 'oauth2' });

	const summary = {
		endpointLegacy: legacy.request.url,
		endpointOauth2: oauth2.request.url,
		sameEndpoint: legacy.request.url === oauth2.request.url,
		changes: [
			'Legacy uses query-based signature values (x_a/x_b/x_c/x_d/x_signature)',
			'OAuth2 uses Authorization: Bearer token header',
			'Request/response handling can stay the same',
		],
	};

	console.log(safeStringify(summary));
}

async function main() {
	const mode = process.argv[2] || 'all';

	if (mode === 'legacy') {
		await runLegacy();
		return;
	}

	if (mode === 'oauth2') {
		await runOauth2();
		return;
	}

	if (mode === 'migrate') {
		await runMigrationCompare();
		return;
	}

	if (mode === 'all') {
		await runLegacy();
		await runOauth2();
		await runMigrationCompare();
		return;
	}

	throw new Error(`Unknown mode: ${mode}. Use legacy | oauth2 | migrate | all`);
}

main().catch((error) => {
	if (error.response) {
		console.error('Demo failed with HTTP error:');
		console.error(
			safeStringify({
				status: error.response.status,
				data: error.response.data,
			})
		);
	} else {
		console.error('Demo failed:', error.message);
	}
	process.exit(1);
});
