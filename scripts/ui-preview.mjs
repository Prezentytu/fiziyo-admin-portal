import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = await createServer({
  configFile: false,
  root: path.join(repository, '.ai/preview'),
  publicDir: path.join(repository, 'public'),
  plugins: [react()],
  resolve: { alias: { '@': path.join(repository, 'src') } },
  css: { postcss: repository },
  server: { host: '127.0.0.1', port: 3100, strictPort: true, fs: { allow: [repository] } },
});

await server.listen();
server.printUrls();