import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON and urlencoded parsers
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Ensure upload folder exists
  const uploadDirName = "images";
  const isProd = process.env.NODE_ENV === "production";
  
  const publicUploadDir = path.join(process.cwd(), "public", uploadDirName);
  const distUploadDir = path.join(process.cwd(), "dist", uploadDirName);
  
  // Save to dist/images in production, public/images in development
  const uploadDir = isProd ? distUploadDir : publicUploadDir;

  if (!fs.existsSync(publicUploadDir)) {
    fs.mkdirSync(publicUploadDir, { recursive: true });
  }
  if (!fs.existsSync(distUploadDir)) {
    fs.mkdirSync(distUploadDir, { recursive: true });
  }

  // Handle static images from both public and dist images directories to be bulletproof
  app.use(`/${uploadDirName}`, express.static(publicUploadDir));
  app.use(`/${uploadDirName}`, express.static(distUploadDir));

  // Configure Multer storage
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const basename = path.basename(file.originalname, ext);
      // Replace non-safe chars, support Korean and Chinese characters
      const safeBasename = basename.replace(/[^a-zA-Z0-9_\-가-힣\u4e00-\u9fa5]/g, "_");
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, `${safeBasename}-${uniqueSuffix}${ext}`);
    }
  });

  const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit for high quality paintings
  });

  // Client uploads image in POST body with field 'image'
  app.post("/api/upload", upload.single("image"), (req: any, res: any) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const fileUrl = `/${uploadDirName}/${req.file.filename}`;
      return res.status(200).json({ url: fileUrl });
    } catch (error: any) {
      console.error("Upload error:", error);
      return res.status(500).json({ error: error.message || "Upload failed" });
    }
  });

  // Vite integration middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
