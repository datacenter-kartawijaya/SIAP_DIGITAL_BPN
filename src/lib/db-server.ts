import "dotenv/config";
import { MongoClient, Db, ObjectId } from 'mongodb';
import fs from 'fs';
import path from 'path';

const MONGODB_URI = process.env.MONGODB_URI || '';
const DATA_DIR = path.join(process.cwd(), 'data');

let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;

// Initialize MongoDB or Local Storage
export async function initDb() {
  if (MONGODB_URI) {
    try {
      console.log("Connecting to MongoDB URI:", MONGODB_URI.replace(/\/\/.*@/, "//***:***@"));
      mongoClient = new MongoClient(MONGODB_URI);
      await mongoClient.connect();
      mongoDb = mongoClient.db();
      console.log("MongoDB connected successfully to:", mongoDb.databaseName);
    } catch (err) {
      console.error("Failed to connect to MongoDB, falling back to local file storage:", err);
      setupLocalStorage();
    }
  } else {
    console.log("No MONGODB_URI detected. Using local disk-based JSON database in /data/");
    setupLocalStorage();
  }
}

function setupLocalStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Read/Write helper for Local Storage fallback
function getLocalFile(collectionName: string): string {
  return path.join(DATA_DIR, `${collectionName}.json`);
}

function readLocalCollection(collectionName: string): any[] {
  const filePath = getLocalFile(collectionName);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading collection ${collectionName}:`, err);
    return [];
  }
}

function writeLocalCollection(collectionName: string, data: any[]) {
  const filePath = getLocalFile(collectionName);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`Error writing collection ${collectionName}:`, err);
  }
}

// Generalized CRUD Actions
export async function listDocuments(collectionName: string, filters: any = {}, sort: any = null) {
  if (mongoDb) {
    try {
      const col = mongoDb.collection<any>(collectionName);
      let queryCursor = col.find(filters);
      if (sort) {
        queryCursor = queryCursor.sort(sort);
      }
      const docs = await queryCursor.toArray();
      return docs.map(doc => {
        const { _id, ...rest } = doc;
        return { id: _id.toString(), ...rest };
      });
    } catch (err) {
      console.error(`MongoDB list error for ${collectionName}:`, err);
      throw err;
    }
  } else {
    let docs = readLocalCollection(collectionName);
    if (filters && Object.keys(filters).length > 0) {
      docs = docs.filter(doc => {
        return Object.entries(filters).every(([key, value]) => {
          return doc[key] === value;
        });
      });
    }
    if (sort) {
      const [sortField, sortDir] = Object.entries(sort)[0];
      docs.sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;
        const comp = valA < valB ? -1 : valA > valB ? 1 : 0;
        return sortDir === -1 || sortDir === 'desc' ? -comp : comp;
      });
    }
    return docs;
  }
}

export async function getDocument(collectionName: string, id: string) {
  if (mongoDb) {
    try {
      const col = mongoDb.collection<any>(collectionName);
      const doc = await col.findOne({ _id: id });
      if (doc) {
        const { _id, ...rest } = doc;
        return { id: _id.toString(), ...rest };
      }
      return null;
    } catch (err) {
      console.error(`MongoDB get error for ${collectionName}/${id}:`, err);
      throw err;
    }
  } else {
    const docs = readLocalCollection(collectionName);
    return docs.find(doc => doc.id === id) || null;
  }
}

export async function insertDocument(collectionName: string, id: string | null, data: any) {
  const finalId = id || (mongoDb ? new ObjectId().toString() : `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
  const docToInsert = { ...data, id: finalId };
  
  if (mongoDb) {
    try {
      const col = mongoDb.collection<any>(collectionName);
      const { id: _, ...fields } = docToInsert;
      await col.updateOne({ _id: finalId }, { $set: fields }, { upsert: true });
      return docToInsert;
    } catch (err) {
      console.error(`MongoDB insert error for ${collectionName}:`, err);
      throw err;
    }
  } else {
    const docs = readLocalCollection(collectionName);
    const filtered = docs.filter(d => d.id !== finalId);
    filtered.push(docToInsert);
    writeLocalCollection(collectionName, filtered);
    return docToInsert;
  }
}

export async function updateDocument(collectionName: string, id: string, data: any, upsert: boolean = false) {
  if (mongoDb) {
    try {
      const col = mongoDb.collection<any>(collectionName);
      const { id: _, _id: __, ...updateFields } = data;
      await col.updateOne({ _id: id }, { $set: updateFields }, { upsert });
      const updated = await col.findOne({ _id: id });
      if (updated) {
        const { _id, ...rest } = updated;
        return { id: _id.toString(), ...rest };
      }
      return { id, ...updateFields };
    } catch (err) {
      console.error(`MongoDB update error for ${collectionName}/${id}:`, err);
      throw err;
    }
  } else {
    const docs = readLocalCollection(collectionName);
    const index = docs.findIndex(d => d.id === id);
    if (index !== -1) {
      docs[index] = { ...docs[index], ...data, id: id };
      writeLocalCollection(collectionName, docs);
      return docs[index];
    } else if (upsert) {
      const docToInsert = { ...data, id: id };
      docs.push(docToInsert);
      writeLocalCollection(collectionName, docs);
      return docToInsert;
    }
    throw new Error(`Document not found: ${collectionName}/${id}`);
  }
}

export async function deleteDocument(collectionName: string, id: string) {
  if (mongoDb) {
    try {
      const col = mongoDb.collection<any>(collectionName);
      await col.deleteOne({ _id: id });
      return true;
    } catch (err) {
      console.error(`MongoDB delete error for ${collectionName}/${id}:`, err);
      throw err;
    }
  } else {
    const docs = readLocalCollection(collectionName);
    const filtered = docs.filter(d => d.id !== id);
    writeLocalCollection(collectionName, filtered);
    return true;
  }
}

export async function clearCollection(collectionName: string) {
  if (mongoDb) {
    try {
      await mongoDb.collection<any>(collectionName).deleteMany({});
      return true;
    } catch (err) {
      console.error(`MongoDB clear error for ${collectionName}:`, err);
      throw err;
    }
  } else {
    writeLocalCollection(collectionName, []);
    return true;
  }
}

export async function insertManyDocuments(collectionName: string, docs: any[]) {
  if (mongoDb) {
    try {
      const col = mongoDb.collection<any>(collectionName);
      await col.deleteMany({});
      if (docs.length === 0) return true;
      const mongoDocs = docs.map(d => {
        const docId = d.id || new ObjectId().toString();
        const { id: _, ...rest } = d;
        return { _id: docId, ...rest };
      });
      await col.insertMany(mongoDocs);
      return true;
    } catch (err) {
      console.error(`MongoDB insertMany error for ${collectionName}:`, err);
      throw err;
    }
  } else {
    writeLocalCollection(collectionName, docs);
    return true;
  }
}

export function getDbStatus() {
  return {
    connected: mongoDb !== null,
    databaseName: mongoDb ? mongoDb.databaseName : null,
    mode: mongoDb ? "MongoDB" : "Local JSON File Fallback",
    uri: MONGODB_URI ? MONGODB_URI.replace(/\/\/.*@/, "//***:***@") : null
  };
}

