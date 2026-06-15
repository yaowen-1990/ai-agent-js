import { readFile } from "node:fs/promises";
import { parse } from "csv-parse/sync";
import { client } from "../lib/openai.js";
import {
  qdrant,
  TAIWAN_COLLECTION,
  EMBEDDING_DIM,
  EMBEDDING_MODEL,
} from "../lib/qdrant.js";

const CSV_PATH = "data/taiwan.csv";
const BATCH_SIZE = 100;

function rowToText(row) {
  const title = row.title || row.NAME || row.name || row.Name || "";
  const landscapeType =
    row.LANDSCAPE_TYPE || row.landscape_type || row.Landscape_Type || "";
  const category = row.CATEGORY || row.category || row.Category || "";
  const status = row.STATUS || row.status || row.Status || "";

  return [title, landscapeType, category, status].filter(Boolean).join(" | ");
}

async function recreateCollection() {
  const exists = await qdrant.collectionExists(TAIWAN_COLLECTION);
  if (exists.exists) {
    await qdrant.deleteCollection(TAIWAN_COLLECTION);
  }
  await qdrant.createCollection(TAIWAN_COLLECTION, {
    vectors: { size: EMBEDDING_DIM, distance: "Cosine" },
  });
}

async function embedBatch(texts) {
  const res = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });
  return res.data.map((d) => d.embedding);
}

async function main() {
  const csv = await readFile(CSV_PATH, "utf8");
  const rows = parse(csv, { columns: true, skip_empty_lines: true });
  console.log(`讀到 ${rows.length} 筆資料`);

  await recreateCollection();
  console.log(`已建立 collection: ${TAIWAN_COLLECTION}`);

  let processed = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const preparedRows = batch
      .map((row, idx) => ({ row, text: rowToText(row), index: i + idx }))
      .filter(({ text }) => text);

    if (preparedRows.length === 0) {
      continue;
    }

    const texts = preparedRows.map(({ text }) => text);
    const vectors = await embedBatch(texts);

    const points = preparedRows.map(({ row, index }, idx) => ({
      id: index,
      vector: vectors[idx],
      payload: {
        title: row.title || row.NAME || row.name || row.Name || "",
        landscapeType:
          row.LANDSCAPE_TYPE || row.landscape_type || row.Landscape_Type || "",
        category: row.CATEGORY || row.category || row.Category || "",
        status: row.STATUS || row.status || row.Status || "",
        description:
          row.description || row.STATUS || row.status || row.Status || "",
      },
    }));

    await qdrant.upsert(TAIWAN_COLLECTION, { wait: true, points });
    processed += preparedRows.length;
    console.log(`進度：${processed} / ${rows.length}`);
  }

  console.log("完成！");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
