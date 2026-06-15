import { QdrantClient } from "@qdrant/js-client-rest";
import { QDRANT_URL, QDRANT_API_KEY } from "../config.js";
import { client } from "./openai.js";

export const qdrant = new QdrantClient({
  url: QDRANT_URL,
  ...(QDRANT_API_KEY && { apiKey: QDRANT_API_KEY }),
});

export const NETFLIX_COLLECTION = "netflix";
export const TAIWAN_COLLECTION = "taiwan";
export const EMBEDDING_DIM = 1536;
export const EMBEDDING_MODEL = "text-embedding-3-small";
export const TAIWAN_SCORE_THRESHOLD = 0.25;

function getMatchLabel(score) {
  if (score >= 0.7) return "高度相關";
  if (score >= 0.45) return "相關";
  return "低相關";
}

function getLandscapeBoost(query, payload) {
  const normalizedQuery = query.toLowerCase();
  const landscapeType = `${payload.landscapeType || ""}`.toLowerCase();
  const category = `${payload.category || ""}`.toLowerCase();
  const status = `${payload.status || payload.description || ""}`.toLowerCase();
  const combinedText = `${landscapeType} ${category} ${status}`;

  if (/(看海|想看海|海邊|海景|海水|沙灘|海浪|海岸|浮潛|游泳|海釣|海洋|海)/i.test(normalizedQuery)) {
    if (/(海|ocean)/i.test(combinedText)) {
      return 1;
    }
  }

  if (/(看山|山景|高山|登山|森林|雲海|日出|爬山)/i.test(normalizedQuery)) {
    if (/(山|mountain|森林|高山|鐵道|古道)/i.test(combinedText)) {
      return 0.16;
    }
  }

  if (/(湖|湖景|潭|水景|看水|划船|環湖)/i.test(normalizedQuery)) {
    if (/(湖|lake|潭|水|渡假|休閒)/i.test(combinedText)) {
      return 0.12;
    }
  }

  return null;
}

export async function embed(text) {
  const res = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return res.data[0].embedding;
}

export async function searchNetflix(query, limit = 5) {
  const vector = await embed(query);

  const results = await qdrant.search(NETFLIX_COLLECTION, {
    vector,
    limit,
    with_payload: true,
  });

  return results.map((r) => ({
    score: r.score,
    title: r.payload.title,
    type: r.payload.type,
    release_year: r.payload.release_year,
    description: r.payload.description,
    listed_in: r.payload.listed_in,
  }));
}
export async function searchTaiwan(query, limit = 1) {
  const vector = await embed(query);

  const results = await qdrant.search(TAIWAN_COLLECTION, {
    vector,
    limit: Math.max(limit * 2, 10),
    with_payload: true,
  });

  return results
    .map((r) => {
      const landscapeBoost = getLandscapeBoost(query, r.payload) ?? 0;
      const baseScore = r.score ?? 0;
      const adjustedScore = Math.min(1, baseScore + landscapeBoost * (1 - baseScore));

      return {
        ...r,
        adjustedScore,
      };
    })
    .filter((r) => (r.adjustedScore ?? 0) >= TAIWAN_SCORE_THRESHOLD)
    .sort((a, b) => (b.adjustedScore ?? 0) - (a.adjustedScore ?? 0))
    .slice(0, limit)
    .map((r) => ({
      score: r.adjustedScore,
      scorePercent: `${Math.round(r.adjustedScore * 100)}%`,
      matchLabel: getMatchLabel(r.adjustedScore),
      title: r.payload.title,
      type: r.payload.type,
      release_year: r.payload.release_year,
      description: r.payload.description,
      listed_in: r.payload.listed_in,
    }));
}