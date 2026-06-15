import { input } from "@inquirer/prompts";
import { searchTaiwan } from "./lib/qdrant.js";
import { spinner } from "./utils/spinner.js";

try {
  while (true) {
    const query = (
      await input({ message: "請輸入要搜尋的景點內容：" })
    ).trim();

    if (query === "") continue;
    if (query.toLowerCase() === "exit") {
      console.log("再會~");
      break;
    }

    const spin = spinner("搜尋中...").start();
    const results = await searchTaiwan(query, 1);
    spin.stop();

    if (results.length === 0) {
      console.log("沒有找到達到相關門檻的結果。")
    }

    for (const [i, r] of results.entries()) {
      console.log(`\n${i + 1}. ${r.title}`);
      console.log(`   相似度：${r.scorePercent} (${r.matchLabel})`);
      if (r.type) console.log(`   類型：${r.type}`);
      if (r.release_year) console.log(`   年份：${r.release_year}`);
      if (r.listed_in) console.log(`   分類：${r.listed_in}`);
      console.log(`   描述：${r.description}`);
    }
    console.log();
  }
} catch (err) {
  if (err.name === "ExitPromptError") {
    console.log("\n再會~");
  } else {
    throw err;
  }
}
