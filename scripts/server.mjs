import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const renderDir = path.join(root, 'out', 'renders');
const port = Number(process.env.PORT ?? 4177);

const contentTypes = new Map([
  ['.css', 'text/css'],
  ['.html', 'text/html'],
  ['.js', 'text/javascript'],
  ['.json', 'application/json'],
  ['.mp4', 'video/mp4'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
]);

const sendJson = (response, status, body) => {
  response.writeHead(status, {'Content-Type': 'application/json'});
  response.end(JSON.stringify(body));
};

const readJsonBody = async (request) => {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
};

const renderProject = async (project) => {
  await fs.mkdir(renderDir, {recursive: true});
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const projectPath = path.join(renderDir, `${stamp}.json`);
  const outputPath = path.join(renderDir, `${stamp}.mp4`);
  await fs.writeFile(projectPath, JSON.stringify(project, null, 2));

  await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['scripts/render.mjs', '--project', projectPath, '--out', outputPath],
      {
        cwd: root,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    let stderr = '';
    child.stdout.on('data', (chunk) => process.stdout.write(chunk));
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      process.stderr.write(chunk);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr || `Render exited with code ${code}`));
    });
  });

  return {
    outputPath,
    videoUrl: `/renders/${path.basename(outputPath)}`,
  };
};

const serveFile = async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host}`);
  const isRender = url.pathname.startsWith('/renders/');
  const baseDir = isRender ? renderDir : distDir;
  const relativePath = isRender ? url.pathname.replace('/renders/', '') : url.pathname.replace(/^\//, '');
  const safePath = path.normalize(relativePath || 'index.html');
  const filePath = path.join(baseDir, safePath);

  if (!filePath.startsWith(baseDir)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  try {
    const stat = await fs.stat(filePath);
    const finalPath = stat.isDirectory() ? path.join(filePath, 'index.html') : filePath;
    const type = contentTypes.get(path.extname(finalPath)) ?? 'application/octet-stream';
    response.writeHead(200, {'Content-Type': type});
    createReadStream(finalPath).pipe(response);
  } catch {
    if (!isRender) {
      response.writeHead(200, {'Content-Type': 'text/html'});
      createReadStream(path.join(distDir, 'index.html')).pipe(response);
      return;
    }

    response.writeHead(404);
    response.end('Not found');
  }
};

const server = http.createServer(async (request, response) => {
  if (request.method === 'POST' && request.url === '/api/render') {
    try {
      const project = await readJsonBody(request);
      const result = await renderProject(project);
      sendJson(response, 200, result);
    } catch (error) {
      sendJson(response, 500, {error: error instanceof Error ? error.message : String(error)});
    }
    return;
  }

  if (request.method === 'GET') {
    await serveFile(request, response);
    return;
  }

  response.writeHead(405);
  response.end('Method not allowed');
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Perspective animation server: http://127.0.0.1:${port}/`);
});
