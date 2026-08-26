import { createRequire } from 'module'; const require = createRequire(import.meta.url);

// backend/lambda/shared/response.ts
var CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,PATCH,OPTIONS",
  "Content-Type": "application/json"
};
function successResponse(body, statusCode = 200) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body)
  };
}
function errorResponse(statusCode, error, message, details) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify({ error, message, ...details && { details } })
  };
}

// backend/lambda/shared/errors.ts
var ValidationError = class extends Error {
  details;
  constructor(message, details = []) {
    super(message);
    this.name = "ValidationError";
    this.details = details;
  }
};
var NotFoundError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "NotFoundError";
  }
};

// backend/lambda/shared/error-handler.ts
async function errorHandler(handler2) {
  try {
    return await handler2();
  } catch (error) {
    if (error instanceof ValidationError) {
      return errorResponse(
        400,
        "VALIDATION_ERROR",
        error.message,
        error.details
      );
    }
    if (error instanceof NotFoundError) {
      return errorResponse(404, "NOT_FOUND", error.message);
    }
    if (error instanceof Error && error.name === "ThrottlingException") {
      return errorResponse(
        429,
        "RATE_LIMITED",
        "\uC694\uCCAD\uC774 \uB108\uBB34 \uB9CE\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694."
      );
    }
    console.error("Unhandled error:", error);
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "\uC11C\uBC84 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4."
    );
  }
}

// backend/lambda/chat/bedrock-client.ts
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
var BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID ?? "us.openai.gpt-5.6-terra";
var AWS_REGION = process.env.AWS_REGION ?? "ap-northeast-2";
var bedrockClient = new BedrockRuntimeClient({ region: AWS_REGION });
async function invokeClaude(systemPrompt, messages) {
  const chatMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((msg) => ({
      role: msg.role,
      content: msg.content
    }))
  ];
  const requestBody = {
    model: BEDROCK_MODEL_ID,
    max_tokens: 1024,
    messages: chatMessages
  };
  const { ConverseCommand } = await import("@aws-sdk/client-bedrock-runtime");
  const command = new ConverseCommand({
    modelId: BEDROCK_MODEL_ID,
    system: [{ text: systemPrompt }],
    messages: messages.map((msg) => ({
      role: msg.role,
      content: [{ text: msg.content }]
    })),
    inferenceConfig: {
      maxTokens: 1024
    }
  });
  const response = await bedrockClient.send(command);
  const outputMessage = response.output?.message;
  if (outputMessage?.content && outputMessage.content.length > 0) {
    const textBlock = outputMessage.content.find((block) => "text" in block);
    if (textBlock && "text" in textBlock) {
      return textBlock.text;
    }
  }
  return "";
}

// backend/lambda/chat/intent-parser.ts
var INTENT_SYSTEM_PROMPT = `\uB2F9\uC2E0\uC740 \uB9CC\uB8CC\uC77C \uAD00\uB9AC \uB300\uC2DC\uBCF4\uB4DC\uC758 AI \uC5B4\uC2DC\uC2A4\uD134\uD2B8\uC785\uB2C8\uB2E4.
\uC0AC\uC6A9\uC790 \uBA54\uC2DC\uC9C0\uB97C \uBD84\uC11D\uD558\uC5EC \uC758\uB3C4\uB97C \uD30C\uC545\uD558\uACE0, JSON \uD615\uC2DD\uC73C\uB85C \uC751\uB2F5\uD558\uC138\uC694.

\uC758\uB3C4 \uBD84\uB958:
- "create": \uC544\uC774\uD15C \uB4F1\uB85D (\uC608: "\uC2A4\uD0C0\uBC85\uC2A4 \uAE30\uD504\uD2F0\uCF58 \uB4F1\uB85D\uD574\uC918", "\uC6B0\uC720 \uB0C9\uC7A5\uACE0\uC5D0 \uB123\uC5C8\uC5B4 \uC720\uD1B5\uAE30\uD55C 12\uC6D4 25\uC77C")
- "list": \uC544\uC774\uD15C \uC870\uD68C (\uC608: "\uAE30\uD504\uD2F0\uCF58 \uBAA9\uB85D \uBCF4\uC5EC\uC918", "\uC774\uBC88 \uC8FC \uB9CC\uB8CC\uB418\uB294 \uAC70 \uBB50 \uC788\uC5B4?")
- "delete": \uC544\uC774\uD15C \uC0AD\uC81C (\uC608: "\uC2A4\uD0C0\uBC85\uC2A4 \uCFE0\uD3F0 \uC0AD\uC81C\uD574\uC918", "\uB2E4 \uC0AC\uC6A9\uD588\uC5B4 \uC9C0\uC6CC\uC918")
- "unknown": \uC704 \uC5B4\uB514\uC5D0\uB3C4 \uD574\uB2F9\uD558\uC9C0 \uC54A\uB294 \uACBD\uC6B0

\uBC18\uB4DC\uC2DC \uC544\uB798 JSON \uD615\uC2DD\uC73C\uB85C\uB9CC \uC751\uB2F5\uD558\uC138\uC694:

\uB4F1\uB85D \uC758\uB3C4:
{
  "type": "create",
  "data": {
    "name": "\uCD94\uCD9C\uB41C \uC544\uC774\uD15C\uBA85 \uB610\uB294 null",
    "category": "gifticon|food|subscription|other \uB610\uB294 null",
    "expiryDate": "YYYY-MM-DD \uD615\uC2DD \uB610\uB294 null",
    "brand": "\uBE0C\uB79C\uB4DC\uBA85 \uB610\uB294 null"
  },
  "missingFields": ["\uB204\uB77D\uB41C \uD544\uC218 \uD544\uB4DC\uBA85"],
  "followUpQuestion": "\uB204\uB77D\uB41C \uC815\uBCF4\uB97C \uBB3B\uB294 \uC9C8\uBB38 (\uD544\uC218 \uC815\uBCF4\uAC00 \uBAA8\uB450 \uC788\uC73C\uBA74 null)"
}

\uC870\uD68C \uC758\uB3C4:
{
  "type": "list",
  "data": {
    "category": "gifticon|food|subscription|other \uB610\uB294 null",
    "keyword": "\uAC80\uC0C9 \uD0A4\uC6CC\uB4DC \uB610\uB294 null"
  }
}

\uC0AD\uC81C \uC758\uB3C4:
{
  "type": "delete",
  "data": {
    "itemName": "\uC0AD\uC81C \uB300\uC0C1 \uC544\uC774\uD15C\uBA85 \uB610\uB294 null",
    "itemId": "\uC544\uC774\uD15C ID \uB610\uB294 null"
  }
}

\uC54C \uC218 \uC5C6\uC74C:
{
  "type": "unknown",
  "message": "\uC774\uD574\uD558\uC9C0 \uBABB\uD588\uC74C\uC744 \uC548\uB0B4\uD558\uB294 \uBA54\uC2DC\uC9C0 + \uAC00\uB2A5\uD55C \uBA85\uB839 \uC608\uC2DC"
}

\uC624\uB298 \uB0A0\uC9DC \uC815\uBCF4: ${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}
"\uB2E4\uC74C \uC8FC \uAE08\uC694\uC77C", "\uB0B4\uC77C", "\uC774\uBC88 \uB2EC \uB9D0" \uB4F1 \uC0C1\uB300\uC801 \uB0A0\uC9DC\uB294 \uC624\uB298 \uAE30\uC900\uC73C\uB85C \uACC4\uC0B0\uD558\uC5EC YYYY-MM-DD\uB85C \uBCC0\uD658\uD558\uC138\uC694.`;
async function parseIntent(message, conversationHistory) {
  const messages = [];
  if (conversationHistory && conversationHistory.length > 0) {
    for (const msg of conversationHistory.slice(-10)) {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    }
  }
  messages.push({
    role: "user",
    content: message
  });
  const response = await invokeClaude(INTENT_SYSTEM_PROMPT, messages);
  try {
    const parsed = extractJson(response);
    return validateAndNormalize(parsed);
  } catch {
    return {
      type: "unknown",
      message: '\uC8C4\uC1A1\uD569\uB2C8\uB2E4, \uC694\uCCAD\uC744 \uC774\uD574\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uB2E4\uC74C\uACFC \uAC19\uC740 \uBA85\uB839\uC744 \uC2DC\uB3C4\uD574\uBCF4\uC138\uC694:\n- "\uC2A4\uD0C0\uBC85\uC2A4 \uAE30\uD504\uD2F0\uCF58 \uB4F1\uB85D\uD574\uC918, \uB9CC\uB8CC\uC77C 2025-03-15"\n- "\uC774\uBC88 \uC8FC \uB9CC\uB8CC\uB418\uB294 \uC544\uC774\uD15C \uBCF4\uC5EC\uC918"\n- "\uC2A4\uD0C0\uBC85\uC2A4 \uCFE0\uD3F0 \uC0AD\uC81C\uD574\uC918"'
    };
  }
}
function extractJson(response) {
  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[1].trim());
  }
  const braceMatch = response.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    return JSON.parse(braceMatch[0]);
  }
  throw new Error("No JSON found in response");
}
function validateAndNormalize(parsed) {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid parsed result");
  }
  const obj = parsed;
  const type = obj.type;
  switch (type) {
    case "create": {
      const data = obj.data ?? {};
      const missingFields = [];
      if (!data.name) missingFields.push("name");
      if (!data.category) missingFields.push("category");
      if (!data.expiryDate) missingFields.push("expiryDate");
      return {
        type: "create",
        data: {
          name: data.name,
          category: data.category,
          expiryDate: data.expiryDate,
          brand: data.brand
        },
        missingFields,
        followUpQuestion: obj.followUpQuestion ?? void 0
      };
    }
    case "list": {
      const data = obj.data ?? {};
      return {
        type: "list",
        data: {
          category: data.category,
          keyword: data.keyword
        }
      };
    }
    case "delete": {
      const data = obj.data ?? {};
      return {
        type: "delete",
        data: {
          itemName: data.itemName,
          itemId: data.itemId
        }
      };
    }
    default:
      return {
        type: "unknown",
        message: obj.message ?? '\uC8C4\uC1A1\uD569\uB2C8\uB2E4, \uC694\uCCAD\uC744 \uC774\uD574\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uB2E4\uC74C\uACFC \uAC19\uC740 \uBA85\uB839\uC744 \uC2DC\uB3C4\uD574\uBCF4\uC138\uC694:\n- "\uC2A4\uD0C0\uBC85\uC2A4 \uAE30\uD504\uD2F0\uCF58 \uB4F1\uB85D\uD574\uC918, \uB9CC\uB8CC\uC77C 2025-03-15"\n- "\uC774\uBC88 \uC8FC \uB9CC\uB8CC\uB418\uB294 \uC544\uC774\uD15C \uBCF4\uC5EC\uC918"\n- "\uC2A4\uD0C0\uBC85\uC2A4 \uCFE0\uD3F0 \uC0AD\uC81C\uD574\uC918"'
      };
  }
}

// backend/lambda/chat/item-service.ts
import { PutCommand, ScanCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

// backend/node_modules/uuid/dist/esm-node/stringify.js
var byteToHex = [];
for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 256).toString(16).slice(1));
}
function unsafeStringify(arr, offset = 0) {
  return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
}

// backend/node_modules/uuid/dist/esm-node/rng.js
import crypto from "node:crypto";
var rnds8Pool = new Uint8Array(256);
var poolPtr = rnds8Pool.length;
function rng() {
  if (poolPtr > rnds8Pool.length - 16) {
    crypto.randomFillSync(rnds8Pool);
    poolPtr = 0;
  }
  return rnds8Pool.slice(poolPtr, poolPtr += 16);
}

// backend/node_modules/uuid/dist/esm-node/native.js
import crypto2 from "node:crypto";
var native_default = {
  randomUUID: crypto2.randomUUID
};

// backend/node_modules/uuid/dist/esm-node/v4.js
function v4(options, buf, offset) {
  if (native_default.randomUUID && !buf && !options) {
    return native_default.randomUUID();
  }
  options = options || {};
  const rnds = options.random || (options.rng || rng)();
  rnds[6] = rnds[6] & 15 | 64;
  rnds[8] = rnds[8] & 63 | 128;
  if (buf) {
    offset = offset || 0;
    for (let i = 0; i < 16; ++i) {
      buf[offset + i] = rnds[i];
    }
    return buf;
  }
  return unsafeStringify(rnds);
}
var v4_default = v4;

// backend/lambda/shared/dynamodb-client.ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
var client = new DynamoDBClient({});
var docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true
  }
});
var TABLE_NAME = process.env.TABLE_NAME ?? "expiry-dashboard-items";

// backend/lambda/chat/item-service.ts
function calculateDday(expiryDate) {
  const expiry = new Date(expiryDate);
  const now = /* @__PURE__ */ new Date();
  expiry.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diffMs = expiry.getTime() - now.getTime();
  return Math.ceil(diffMs / (1e3 * 60 * 60 * 24));
}
function toItemSummary(item) {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    expiryDate: item.expiryDate,
    dday: calculateDday(item.expiryDate),
    brand: item.brand,
    imageUrl: item.imageUrl
  };
}
async function createItemFromChat(params) {
  const { name, category, expiryDate, brand } = params;
  if (!name || name.trim().length === 0 || name.trim().length > 50) {
    return { success: false, error: "\uC544\uC774\uD15C \uC774\uB984\uC740 1~50\uC790\uC5EC\uC57C \uD569\uB2C8\uB2E4." };
  }
  const validCategories = ["gifticon", "food", "subscription", "other"];
  if (!validCategories.includes(category)) {
    return { success: false, error: "\uC720\uD6A8\uD558\uC9C0 \uC54A\uC740 \uCE74\uD14C\uACE0\uB9AC\uC785\uB2C8\uB2E4." };
  }
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(expiryDate)) {
    return { success: false, error: "\uB9CC\uB8CC\uC77C\uC740 YYYY-MM-DD \uD615\uC2DD\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4." };
  }
  const id = v4_default();
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  const item = {
    id,
    name: name.trim(),
    category,
    expiryDate,
    brand,
    createdAt,
    isArchived: false
  };
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item
    })
  );
  return {
    success: true,
    item: toItemSummary(item)
  };
}
async function searchItems(query) {
  const { category, keyword } = query;
  let filterExpression = "isArchived = :archived";
  const expressionAttributeValues = {
    ":archived": false
  };
  if (category) {
    filterExpression += " AND category = :category";
    expressionAttributeValues[":category"] = category;
  }
  if (keyword) {
    filterExpression += " AND contains(#itemName, :keyword)";
    expressionAttributeValues[":keyword"] = keyword;
  }
  const command = new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: filterExpression,
    ExpressionAttributeValues: expressionAttributeValues,
    ...keyword && {
      ExpressionAttributeNames: { "#itemName": "name" }
    }
  });
  const result = await docClient.send(command);
  const items = result.Items ?? [];
  const summaries = items.map(toItemSummary).sort((a, b) => a.dday - b.dday).slice(0, 10);
  return {
    items: summaries,
    count: summaries.length
  };
}
async function deleteItemByName(name) {
  if (!name || name.trim().length === 0) {
    return { success: false, error: "\uC0AD\uC81C\uD560 \uC544\uC774\uD15C \uC774\uB984\uC744 \uC9C0\uC815\uD574\uC8FC\uC138\uC694." };
  }
  const command = new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: "contains(#itemName, :name) AND isArchived = :archived",
    ExpressionAttributeNames: { "#itemName": "name" },
    ExpressionAttributeValues: {
      ":name": name.trim(),
      ":archived": false
    }
  });
  const result = await docClient.send(command);
  const items = result.Items ?? [];
  if (items.length === 0) {
    return { success: false, error: `"${name}" \uC544\uC774\uD15C\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.` };
  }
  const targetItem = items[0];
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { id: targetItem.id },
      ConditionExpression: "attribute_exists(id)"
    })
  );
  return {
    success: true,
    deletedItem: toItemSummary(targetItem)
  };
}

// backend/lambda/chat/handler.ts
async function handler(event) {
  const { httpMethod } = event;
  return errorHandler(async () => {
    switch (httpMethod) {
      case "POST":
        return await handleChat(event);
      case "OPTIONS":
        return successResponse({});
      default:
        return errorResponse(405, "METHOD_NOT_ALLOWED", `Method ${httpMethod} not allowed`);
    }
  });
}
async function handleChat(event) {
  if (!event.body) {
    throw new ValidationError("\uC694\uCCAD \uBCF8\uBB38\uC774 \uBE44\uC5B4\uC788\uC2B5\uB2C8\uB2E4.", ["message \uD544\uB4DC\uB294 \uD544\uC218\uC785\uB2C8\uB2E4."]);
  }
  const body = JSON.parse(event.body);
  if (!body.message || body.message.trim().length === 0) {
    throw new ValidationError("\uBA54\uC2DC\uC9C0\uAC00 \uBE44\uC5B4\uC788\uC2B5\uB2C8\uB2E4.", ["message \uD544\uB4DC\uB294 \uD544\uC218\uC785\uB2C8\uB2E4."]);
  }
  const message = body.message.trim();
  const conversationHistory = body.conversationHistory ?? [];
  const intent = await parseIntent(message, conversationHistory);
  let response;
  switch (intent.type) {
    case "create":
      response = await handleCreateIntent(intent);
      break;
    case "list":
      response = await handleListIntent(intent);
      break;
    case "delete":
      response = await handleDeleteIntent(intent);
      break;
    case "unknown":
    default:
      response = handleUnknownIntent(intent);
      break;
  }
  return successResponse(response);
}
async function handleCreateIntent(intent) {
  const { data, missingFields, followUpQuestion } = intent;
  if (missingFields.length > 0) {
    const fieldNameMap = {
      name: "\uC544\uC774\uD15C \uC774\uB984",
      category: "\uCE74\uD14C\uACE0\uB9AC (\uAE30\uD504\uD2F0\uCF58/\uC2DD\uC7AC\uB8CC/\uC815\uAE30\uACB0\uC81C/\uAE30\uD0C0)",
      expiryDate: "\uB9CC\uB8CC\uC77C"
    };
    const missingFieldNames = missingFields.map((f) => fieldNameMap[f] ?? f).join(", ");
    return {
      message: followUpQuestion ?? `\uC544\uC774\uD15C \uB4F1\uB85D\uC744 \uC704\uD574 \uB2E4\uC74C \uC815\uBCF4\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4: ${missingFieldNames}`,
      action: { type: "create", data }
    };
  }
  const result = await createItemFromChat({
    name: data.name,
    category: data.category,
    expiryDate: data.expiryDate,
    brand: data.brand
  });
  if (!result.success) {
    return {
      message: `\uC544\uC774\uD15C \uB4F1\uB85D\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4: ${result.error}`
    };
  }
  return {
    message: `"${result.item.name}" \uC544\uC774\uD15C\uC744 \uB4F1\uB85D\uD588\uC2B5\uB2C8\uB2E4! (\uB9CC\uB8CC\uC77C: ${result.item.expiryDate}, D-${result.item.dday >= 0 ? result.item.dday : `+${Math.abs(result.item.dday)}`})`,
    action: { type: "create", data: result.item },
    items: [result.item]
  };
}
async function handleListIntent(intent) {
  const { data } = intent;
  const result = await searchItems({
    category: data.category,
    keyword: data.keyword
  });
  if (result.count === 0) {
    const filterDesc = data.category ? `${data.category} \uCE74\uD14C\uACE0\uB9AC\uC758 ` : data.keyword ? `"${data.keyword}" \uAD00\uB828 ` : "";
    return {
      message: `${filterDesc}\uB4F1\uB85D\uB41C \uC544\uC774\uD15C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.`,
      action: { type: "list" },
      items: []
    };
  }
  const itemList = result.items.map((item) => {
    const ddayStr = item.dday >= 0 ? `D-${item.dday}` : `D+${Math.abs(item.dday)}`;
    return `\u2022 ${item.name} (${ddayStr}, ${item.expiryDate})`;
  }).join("\n");
  return {
    message: `\uCD1D ${result.count}\uAC1C\uC758 \uC544\uC774\uD15C\uC744 \uCC3E\uC558\uC2B5\uB2C8\uB2E4:
${itemList}`,
    action: { type: "list" },
    items: result.items
  };
}
async function handleDeleteIntent(intent) {
  const { data } = intent;
  if (!data.itemName && !data.itemId) {
    return {
      message: "\uC0AD\uC81C\uD560 \uC544\uC774\uD15C\uC758 \uC774\uB984\uC744 \uC54C\uB824\uC8FC\uC138\uC694.",
      action: { type: "delete" }
    };
  }
  const targetName = data.itemName ?? data.itemId;
  const result = await deleteItemByName(targetName);
  if (!result.success) {
    return {
      message: result.error ?? "\uC544\uC774\uD15C \uC0AD\uC81C\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.",
      action: { type: "delete" }
    };
  }
  return {
    message: `"${result.deletedItem.name}" \uC544\uC774\uD15C\uC744 \uC0AD\uC81C\uD588\uC2B5\uB2C8\uB2E4.`,
    action: { type: "delete", data: result.deletedItem }
  };
}
function handleUnknownIntent(intent) {
  return {
    message: intent.message
  };
}
export {
  handler
};
