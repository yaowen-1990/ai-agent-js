import { input } from "@inquirer/prompts";
import { client, DEFAULT_MODEL } from "./lib/openai.js";
import { spinner } from "./utils/spinner.js";
import { toOpenAITool } from "./utils/func-tool.js";
import { currentTimeTool, youbikeTool } from "./tools/index.js";

const toolList = [youbikeTool, currentTimeTool];
const tools = toolList.map(toOpenAITool);
const AVAILABLE_TOOLS = Object.fromEntries(toolList.map((t) => [t.name, t.fn]));

const messages = [
  {
    role: "system",
    content:
      "你是一位台灣生活助理。當使用者詢問現在時間、台北車站附近的 YouBike 站點與可租車輛數時，請優先使用工具查詢。你可以使用 get_current_time 取得目前時間，也可以使用 get_nearby_youbike 取得附近可租借的 YouBike 站點與距離。請用繁體中文回答，並在必要時整理成清楚的站點列表。",
  },
];

try {
  while (true) {
    const userQuestion = (
      await input({ message: "請輸入你的問題（輸入 exit 離開）：" })
    ).trim();

    if (userQuestion === "") continue;
    if (userQuestion.toLowerCase() === "exit") {
      console.log("再會~");
      break;
    }

    messages.push({ role: "user", content: userQuestion });

    const spin = spinner("思考中...").start();

    const response = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      messages,
      tools,
      tool_choice: "auto",
    });

    spin.stop();

    const message = response.choices[0].message;
    messages.push(message);

    if (!message.tool_calls || message.tool_calls.length === 0) {
      console.log(message.content);
      continue;
    }

    for (const toolCall of message.tool_calls) {
      const fnName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);
      console.log(`\n[呼叫 tool] ${fnName}(${JSON.stringify(args)})`);

      const fn = AVAILABLE_TOOLS[fnName];
      const result = await fn(args);

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }

    const finalResponse = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      messages,
      tools: [],
    });

    console.log(finalResponse.choices[0].message.content);
  }
} catch (err) {
  if (err.name === "ExitPromptError") {
    console.log("\n再會~");
  } else {
    throw err;
  }
}
