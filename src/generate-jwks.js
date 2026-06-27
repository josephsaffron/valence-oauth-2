import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { exportJWK, exportPKCS8, generateKeyPair } from 'jose';

function parseArgs(argv) {
	const args = {};

	for (let i = 0; i < argv.length; i += 1) {
		const part = argv[i];
		if (!part.startsWith('--')) {
			continue;
		}
		const key = part.slice(2);
		const value = argv[i + 1];
		if (!value || value.startsWith('--')) {
			args[key] = 'true';
			continue;
		}
		args[key] = value;
		i += 1;
	}

	return args;
}

function buildGithubPagesUrl(owner, repo, publicPath) {
	if (!owner || !repo) {
		return '';
	}
	return `https://${owner}.github.io/${repo}/${publicPath}`;
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const docsDir = resolve(process.cwd(), 'docs');
	const keysDir = resolve(process.cwd(), 'jwks');
	const privateDir = resolve(keysDir, 'private');
	const publicFileName = args.publicFile || 'jwks.json';
	const publicPath = resolve(docsDir, publicFileName);
	const privatePath = resolve(privateDir, 'private-key.pem');
	const publicRepoPath = publicFileName;
	const kid = args.kid || randomUUID();
	const algorithm = args.alg || 'RS256';

	if (algorithm !== 'RS256') {
		throw new Error('This script currently supports RS256 only.');
	}

	const { privateKey, publicKey } = await generateKeyPair('RS256', {
		extractable: true,
	});
	const privateKeyPem = await exportPKCS8(privateKey);
	const publicJwk = await exportJWK(publicKey);
	publicJwk.kid = kid;
	publicJwk.alg = algorithm;
	publicJwk.use = 'sig';

	const jwks = {
		keys: [publicJwk],
	};

	await mkdir(docsDir, { recursive: true });
	await mkdir(privateDir, { recursive: true });
	await writeFile(publicPath, `${JSON.stringify(jwks, null, 2)}\n`, 'utf8');
	await writeFile(privatePath, `${privateKeyPem}\n`, 'utf8');

	const suggestedJwksUrl = buildGithubPagesUrl(args.githubOwner, args.githubRepo, publicRepoPath);

	console.log('JWKS assets generated successfully.');
	console.log('');
	console.log(`Public JWKS: ${publicPath}`);
	console.log(`Private key: ${privatePath}`);
	console.log('');
	console.log('Set these .env values:');
	console.log('OAUTH2_CLIENT_AUTH_METHOD=private_key_jwt');
	console.log(`OAUTH2_PRIVATE_KEY_PATH=${privatePath}`);
	console.log(`OAUTH2_PRIVATE_KEY_KID=${kid}`);
	console.log(`OAUTH2_PRIVATE_KEY_ALG=${algorithm}`);
	if (suggestedJwksUrl) {
		console.log(`Suggested JWKS URL for Brightspace: ${suggestedJwksUrl}`);
	}
	console.log('');
	console.log('Security note: keep jwks/private/private-key.pem private and out of git.');
}

main().catch((error) => {
	console.error('Failed to generate JWKS assets:', error.message);
	process.exit(1);
});
