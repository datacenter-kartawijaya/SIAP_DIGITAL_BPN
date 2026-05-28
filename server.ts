import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { 
  initDb, 
  listDocuments, 
  getDocument, 
  insertDocument, 
  updateDocument, 
  deleteDocument,
  clearCollection,
  insertManyDocuments,
  getDbStatus
} from "./src/lib/db-server.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize DB
  await initDb();

  // Add JSON parsing middleware with big limit for backups
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // API endpoints for MongoDB CRUD
  app.get("/api/db/:collection", async (req, res) => {
    try {
      const { collection } = req.params;
      const { sortBy, sortDir, ...queryFilters } = req.query;

      // Classify filter parameters
      const filters: any = {};
      Object.entries(queryFilters).forEach(([key, val]) => {
        if (val === "true") filters[key] = true;
        else if (val === "false") filters[key] = false;
        else if (!isNaN(Number(val)) && typeof val === "string" && val.trim() !== "" && (key === "tahunSU" || key === "bundel" || key === "noSU")) {
          filters[key] = Number(val);
        } else {
          filters[key] = val;
        }
      });

      // Build sort options
      let sort: any = null;
      if (sortBy) {
        const dir = sortDir === "desc" || sortDir === "-1" ? -1 : 1;
        sort = { [sortBy as string]: dir };
      }

      const docs = await listDocuments(collection, filters, sort);
      res.json(docs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/db/:collection/:id", async (req, res) => {
    try {
      const { collection, id } = req.params;
      const doc = await getDocument(collection, id);
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.json(doc);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/db/:collection", async (req, res) => {
    try {
      const { collection } = req.params;
      const { id, data } = req.body;
      const doc = await insertDocument(collection, id || null, data);
      res.status(201).json(doc);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/db/:collection/:id", async (req, res) => {
    try {
      const { collection, id } = req.params;
      const { data } = req.body;
      const { upsert } = req.query;
      const shouldUpsert = upsert === "true";
      const doc = await updateDocument(collection, id, data, shouldUpsert);
      res.json(doc);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/db/:collection/:id", async (req, res) => {
    try {
      const { collection, id } = req.params;
      await deleteDocument(collection, id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/db/bulk-clear/:collection", async (req, res) => {
    try {
      const { collection } = req.params;
      await clearCollection(collection);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/db/bulk-insert/:collection", async (req, res) => {
    try {
      const { collection } = req.params;
      const { docs } = req.body;
      await insertManyDocuments(collection, docs || []);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/db-status", (req, res) => {
    try {
      res.json(getDbStatus());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve built files (production mode)
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
