import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import compression from "compression";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable Brotli/Gzip compression
  app.use(compression());

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    
    // 1. Static assets (JS, CSS, fonts, images with hashes)
    // Vite puts these in /assets/ by default
    app.use('/assets', express.static(path.join(distPath, 'assets'), {
      maxAge: '1y',
      immutable: true,
      index: false
    }));

    // 2. Other static files and HTML
    app.use(express.static(distPath, {
      maxAge: '1h',
      setHeaders: (res, filePath) => {
        // 2. HTML caching (5 minutes)
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'public, max-age=300');
        } 
        // 3. Images, fonts, and other static assets (1 year)
        else if (/\.(jpg|jpeg|png|gif|ico|svg|webp|woff|woff2|ttf|eot)$/.test(filePath)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    }));

    // Fallback to index.html for SPA routing
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
