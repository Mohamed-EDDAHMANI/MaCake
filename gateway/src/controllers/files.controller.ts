import { Controller, Get, Req, Res, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import express from 'express';
import http from 'http';
import { URL } from 'url';

/**
 * Proxy controller that serves MinIO/S3 files through the gateway.
 * Routes:  GET /files/:bucket/*key  →  proxied from MinIO
 *
 * This avoids exposing MinIO port directly and removes firewall issues.
 * Photo URLs stored in DB:  http://<host>:3000/files/auth/profile-pics/userId/uuid.jpg
 */
@Controller('files')
export class FilesController {
  private readonly logger = new Logger(FilesController.name);
  private readonly minioEndpoint: string;

  constructor(private readonly config: ConfigService) {
    // Internal Docker MinIO endpoint (gateway → minio inside Docker network)
    this.minioEndpoint = this.config.get<string>('MINIO_INTERNAL_URL', 'http://minio:9000');
  }

  @Get('*')
  async proxy(@Req() req: express.Request, @Res() res: express.Response): Promise<void> {
    // req.originalUrl = /files/auth/profile-pics/userId/uuid.jpg
    const objectPath = req.originalUrl.replace(/^\/files\//, '');

    if (!objectPath) {
      res.status(400).json({ error: 'Missing file path' });
      return;
    }

    const targetUrl = `${this.minioEndpoint}/${objectPath}`;

    try {
      const parsed = new URL(targetUrl);

      await new Promise<void>((resolve, reject) => {
        const proxyReq = http.get(
          {
            hostname: parsed.hostname,
            port: parsed.port || 9000,
            path: parsed.pathname + (parsed.search || ''),
            timeout: 10000,
          },
          (proxyRes) => {
            const status = proxyRes.statusCode ?? 502;

            if (status >= 400) {
              res.status(status).json({ error: 'File not found or access denied' });
              proxyRes.resume(); // Drain
              resolve();
              return;
            }

            // Forward content headers
            const ct = proxyRes.headers['content-type'];
            const cl = proxyRes.headers['content-length'];
            if (ct) res.setHeader('Content-Type', ct);
            if (cl) res.setHeader('Content-Length', cl);
            res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache 24h

            res.status(status);
            proxyRes.pipe(res);
            proxyRes.on('end', resolve);
            proxyRes.on('error', reject);
          },
        );

        proxyReq.on('error', (err) => {
          this.logger.error(`MinIO proxy error: ${err.message}`);
          if (!res.headersSent) {
            res.status(502).json({ error: 'Failed to fetch file from storage' });
          }
          resolve();
        });

        proxyReq.on('timeout', () => {
          proxyReq.destroy();
          if (!res.headersSent) {
            res.status(504).json({ error: 'Storage timeout' });
          }
          resolve();
        });
      });
    } catch (err: any) {
      this.logger.error(`File proxy error: ${err.message}`);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal proxy error' });
      }
    }
  }
}
