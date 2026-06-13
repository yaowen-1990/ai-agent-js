import readline from "readline";
import { client, DEFAULT_MODEL } from "./lib/openai.js";
import { getWeatherTool, getWeather } from "./tools/weather.js";
import { convertUnitTool, convertUnit } from "./tools/convert_unit.js";
import { spinner } from "./utils/spinner.js";

const AVAILABLE_TOOLS = {
  get_weather: getWeather,
  convert_unit: convertUnit,
};

const tools = [getWeatherTool, convertUnitTool];
const messages = [];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}


async function processToolCall(message) {
  if (!message.tool_calls || message.tool_calls.length === 0) {
    return false;
  }

  for (const toolCall of message.tool_calls) {
    const fnName = toolCall.function.name;
    const args = JSON.parse(toolCall.function.arguments);
    console.log(`\n [呼叫 tool] ${fnName}(${JSON.stringify(args)})`);

    const fn = AVAILABLE_TOOLS[fnName];
    const result = await fn(args);
    console.log(`[結果] ${JSON.stringify(result)}\n`);


    messages.push({
      role: "tool",
      tool_call_id: toolCall.id,
      content: JSON.stringify(result),
    });
  }

  return true;
}

async function chat(userInput) {
  messages.push({ role: "user", content: userInput });

  const askingSpinner = spinner("思考中...").start();

  let response = await client.chat.completions.create({
    model: DEFAULT_MODEL,
    messages,
    tools,
    tool_choice: "auto",
  });

  askingSpinner.stop();

  let message = response.choices[0].message;
  messages.push(message);

  // 如果呼叫了工具，需要再次請求 AI 回應
  if (await processToolCall(message)) {
    const replySpinner = spinner("思考中...").start();

    response = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      messages,
    });

    replySpinner.stop();

    message = response.choices[0].message;
    messages.push(message);
  }

  console.log(`${message.content}\n`);
}

async function main() {
 
  while (true) {
    const userInput = await question("提個問題: ");

    if (userInput.toLowerCase() === "exit") {
      console.log("\n再見！");
      rl.close();
      break;
    }

    if (!userInput.trim()) {
      continue;
    }

    try {
      await chat(userInput);
    } catch (error) {
      console.error("錯誤:", error.message);
    }
  }
}

main();
