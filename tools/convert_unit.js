export const convertUnitTool = {
  type: "function",
  function: {
    name: "convert_unit",
    description: "進行單位換算",
    parameters: {
      type: "object",
      properties: {
        value: {
          type: "number",
          description: "要轉換的數值，如 25",
        },
        from_unit: {
          type: "string",
          description: "原始單位，支援：C、F、km、mile、kg、lb",
        },
        to_unit: {
          type: "string",
          description: "目標單位，支援：F、C、mile、km、lb、kg",
        },
      },
      required: ["value", "from_unit", "to_unit"],
    },
  },
};

export function convertUnit({ value, from_unit, to_unit }) {
  // 參數驗證
  if (value === null || value === undefined || isNaN(value)) {
    return {
      error: "錯誤：value 必須是有效的數字",
    };
  }

  if (!from_unit || typeof from_unit !== "string" || !from_unit.trim()) {
    return {
      error: "錯誤：from_unit 必須是有效的字串",
    };
  }

  if (!to_unit || typeof to_unit !== "string" || !to_unit.trim()) {
    return {
      error: "錯誤：to_unit 必須是有效的字串",
    };
  }

  const fromUnit = from_unit.toLowerCase().trim();
  const toUnit = to_unit.toLowerCase().trim();

  // 攝氏 <-> 華氏
  if ((fromUnit === "c" || fromUnit === "°c") && (toUnit === "f" || toUnit === "°f")) {
    const result = value * 9 / 5 + 32;
    return {
      value,
      from_unit,
      to_unit,
      result,
      formula: "°F = °C × 9/5 + 32",
    };
  }

  if ((fromUnit === "f" || fromUnit === "°f") && (toUnit === "c" || toUnit === "°c")) {
    const result = (value - 32) * 5 / 9;
    return {
      value,
      from_unit,
      to_unit,
      result,
      formula: "°C = (°F - 32) × 5/9",
    };
  }

  // 公里 <-> 英里
  if ((fromUnit === "km" || fromUnit === "kilometer") && (toUnit === "mile" || toUnit === "mi")) {
    const result = value * 0.621371;
    return {
      value,
      from_unit,
      to_unit,
      result,
      formula: "1 km = 0.621371 mile",
    };
  }

  if ((fromUnit === "mile" || fromUnit === "mi") && (toUnit === "km" || toUnit === "kilometer")) {
    const result = value / 0.621371;
    return {
      value,
      from_unit,
      to_unit,
      result,
      formula: "1 mile = 1.60934 km",
    };
  }

  // 公斤 <-> 磅
  if ((fromUnit === "kg" || fromUnit === "kilogram") && (toUnit === "lb" || toUnit === "pound")) {
    const result = value * 2.20462;
    return {
      value,
      from_unit,
      to_unit,
      result,
      formula: "1 kg = 2.20462 lb",
    };
  }

  if ((fromUnit === "lb" || fromUnit === "pound") && (toUnit === "kg" || toUnit === "kilogram")) {
    const result = value / 2.20462;
    return {
      value,
      from_unit,
      to_unit,
      result,
      formula: "1 lb = 0.453592 kg",
    };
  }

  // 公尺 <-> 公分
  if ((fromUnit === "m" || fromUnit === "meter" || fromUnit === "公尺") && (toUnit === "cm" || toUnit === "centimeter" || toUnit === "公分")) {
    const result = value * 100;
    return {
      value,
      from_unit,
      to_unit,
      result,
      formula: "1 m = 100 cm",
    };
  }

  if ((fromUnit === "cm" || fromUnit === "centimeter" || fromUnit === "公分") && (toUnit === "m" || toUnit === "meter" || toUnit === "公尺")) {
    const result = value / 100;
    return {
      value,
      from_unit,
      to_unit,
      result,
      formula: "1 cm = 0.01 m",
    };
  }

  // 不支援的單位組合
  return {
    error: `不支援的單位轉換: ${from_unit} -> ${to_unit}`,
    supported_conversions: [
      "C <-> F (攝氏 <-> 華氏)",
      "km <-> mile (公里 <-> 英里)",
      "kg <-> lb (公斤 <-> 磅)",
      "m <-> cm (公尺 <-> 公分)",
    ],
  };
}
