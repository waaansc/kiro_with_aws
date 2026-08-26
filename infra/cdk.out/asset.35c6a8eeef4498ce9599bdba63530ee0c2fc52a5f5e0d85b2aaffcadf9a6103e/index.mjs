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

// backend/lambda/image/image-processor.ts
var SUPPORTED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"];
var MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
function calculateBase64Size(base64) {
  const raw = base64.includes(",") ? base64.split(",")[1] : base64;
  const padding = (raw.match(/=+$/) || [""])[0].length;
  return Math.floor(raw.length * 3 / 4) - padding;
}
function validateImage(base64, contentType) {
  const errors = [];
  if (!base64 || base64.trim().length === 0) {
    errors.push("\uC774\uBBF8\uC9C0 \uB370\uC774\uD130\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4.");
    return { valid: false, errors };
  }
  if (!contentType) {
    errors.push("\uC774\uBBF8\uC9C0 \uD615\uC2DD(imageContentType)\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.");
  } else if (!SUPPORTED_CONTENT_TYPES.includes(contentType)) {
    errors.push(`\uC9C0\uC6D0\uD558\uC9C0 \uC54A\uB294 \uC774\uBBF8\uC9C0 \uD615\uC2DD\uC785\uB2C8\uB2E4. \uC9C0\uC6D0 \uD615\uC2DD: JPEG, PNG, WEBP`);
  }
  const sizeBytes = calculateBase64Size(base64);
  if (sizeBytes > MAX_IMAGE_SIZE_BYTES) {
    const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(1);
    errors.push(`\uC774\uBBF8\uC9C0 \uD06C\uAE30\uAC00 ${sizeMB}MB\uB85C \uC81C\uD55C(10MB)\uC744 \uCD08\uACFC\uD569\uB2C8\uB2E4.`);
  }
  return { valid: errors.length === 0, errors };
}

// backend/lambda/image/bedrock-vision.ts
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
var ANALYSIS_PROMPT = `\uB2F9\uC2E0\uC740 \uC774\uBBF8\uC9C0 \uBD84\uC11D \uC804\uBB38\uAC00\uC785\uB2C8\uB2E4. \uCCA8\uBD80\uB41C \uC774\uBBF8\uC9C0\uB97C \uBD84\uC11D\uD558\uC5EC \uB2E4\uC74C \uC791\uC5C5\uC744 \uC218\uD589\uD574\uC8FC\uC138\uC694:

1. \uC774\uBBF8\uC9C0 \uC720\uD615\uC744 \uBD84\uB958\uD574\uC8FC\uC138\uC694:
   - "gifticon": \uAE30\uD504\uD2F0\uCF58, \uCFE0\uD3F0, \uC0C1\uD488\uAD8C \uC774\uBBF8\uC9C0
   - "food_label": \uC2DD\uC7AC\uB8CC, \uC2DD\uD488 \uB77C\uBCA8, \uC720\uD1B5\uAE30\uD55C\uC774 \uC788\uB294 \uC81C\uD488
   - "subscription": \uC815\uAE30\uACB0\uC81C, \uAD6C\uB3C5 \uC11C\uBE44\uC2A4 \uC2A4\uD06C\uB9B0\uC0F7
   - "unknown": \uC704 \uC138 \uAC00\uC9C0\uC5D0 \uD574\uB2F9\uD558\uC9C0 \uC54A\uB294 \uC774\uBBF8\uC9C0

2. \uC774\uBBF8\uC9C0 \uC720\uD615\uC5D0 \uB530\uB77C \uAD00\uB828 \uC815\uBCF4\uB97C \uCD94\uCD9C\uD574\uC8FC\uC138\uC694:
   - \uAE30\uD504\uD2F0\uCF58: brand(\uBE0C\uB79C\uB4DC\uBA85), name(\uC0C1\uD488\uBA85), expiryDate(\uB9CC\uB8CC\uC77C, YYYY-MM-DD \uD615\uC2DD)
   - \uC2DD\uC7AC\uB8CC \uB77C\uBCA8: name(\uC81C\uD488\uBA85), expiryDate(\uC18C\uBE44\uAE30\uD55C/\uC720\uD1B5\uAE30\uD55C, YYYY-MM-DD \uD615\uC2DD)
   - \uC815\uAE30\uACB0\uC81C: serviceName(\uC11C\uBE44\uC2A4\uBA85), paymentDate(\uACB0\uC81C\uC77C, YYYY-MM-DD \uD615\uC2DD), name(\uAD6C\uB3C5 \uC774\uB984)

3. \uBC18\uB4DC\uC2DC \uC544\uB798 JSON \uD615\uC2DD\uC73C\uB85C\uB9CC \uC751\uB2F5\uD574\uC8FC\uC138\uC694 (\uB2E4\uB978 \uD14D\uC2A4\uD2B8 \uC5C6\uC774):
{
  "imageType": "gifticon" | "food_label" | "subscription" | "unknown",
  "brand": "\uCD94\uCD9C\uB41C \uBE0C\uB79C\uB4DC\uBA85 \uB610\uB294 null",
  "name": "\uCD94\uCD9C\uB41C \uC0C1\uD488\uBA85/\uC81C\uD488\uBA85/\uC11C\uBE44\uC2A4\uBA85 \uB610\uB294 null",
  "expiryDate": "YYYY-MM-DD \uD615\uC2DD\uC758 \uB0A0\uC9DC \uB610\uB294 null",
  "serviceName": "\uC11C\uBE44\uC2A4\uBA85 \uB610\uB294 null",
  "paymentDate": "YYYY-MM-DD \uD615\uC2DD\uC758 \uACB0\uC81C\uC77C \uB610\uB294 null"
}

\uCD94\uCD9C\uD560 \uC218 \uC5C6\uB294 \uD544\uB4DC\uB294 null\uB85C \uC124\uC815\uD574\uC8FC\uC138\uC694.`;
var bedrockClient = null;
function getBedrockClient() {
  if (!bedrockClient) {
    bedrockClient = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || "ap-northeast-2"
    });
  }
  return bedrockClient;
}
async function analyzeImageWithBedrock(imageBase64, contentType) {
  const client = getBedrockClient();
  const rawBase64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
  const imageBytes = Uint8Array.from(atob(rawBase64), (c) => c.charCodeAt(0));
  const formatMap = {
    "image/jpeg": "jpeg",
    "image/png": "png",
    "image/webp": "webp"
  };
  const format = formatMap[contentType] ?? "jpeg";
  const modelId = process.env.BEDROCK_MODEL_ID || "us.openai.gpt-5.6-terra";
  const command = new ConverseCommand({
    modelId,
    messages: [
      {
        role: "user",
        content: [
          {
            image: {
              format,
              source: {
                bytes: imageBytes
              }
            }
          },
          {
            text: ANALYSIS_PROMPT
          }
        ]
      }
    ],
    inferenceConfig: {
      maxTokens: 1024
    }
  });
  const response = await client.send(command);
  const outputMessage = response.output?.message;
  let rawText = "";
  if (outputMessage?.content && outputMessage.content.length > 0) {
    const textBlock = outputMessage.content.find((block) => "text" in block);
    if (textBlock && "text" in textBlock) {
      rawText = textBlock.text;
    }
  }
  const parsed = parseBedrockResponse(rawText);
  return {
    imageType: parsed.imageType,
    extractedData: {
      name: parsed.name || void 0,
      brand: parsed.brand || void 0,
      expiryDate: parsed.expiryDate || void 0,
      serviceName: parsed.serviceName || void 0,
      paymentDate: parsed.paymentDate || void 0
    },
    rawResponse: rawText
  };
}
function parseBedrockResponse(text) {
  const defaultResult = {
    imageType: "unknown",
    name: null,
    brand: null,
    expiryDate: null,
    serviceName: null,
    paymentDate: null
  };
  try {
    let jsonStr = text;
    const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonBlockMatch) {
      jsonStr = jsonBlockMatch[1].trim();
    } else {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
    }
    const parsed = JSON.parse(jsonStr);
    const validTypes = ["gifticon", "food_label", "subscription", "unknown"];
    const imageType = validTypes.includes(parsed.imageType) ? parsed.imageType : "unknown";
    return {
      imageType,
      name: typeof parsed.name === "string" ? parsed.name : null,
      brand: typeof parsed.brand === "string" ? parsed.brand : null,
      expiryDate: typeof parsed.expiryDate === "string" ? parsed.expiryDate : null,
      serviceName: typeof parsed.serviceName === "string" ? parsed.serviceName : null,
      paymentDate: typeof parsed.paymentDate === "string" ? parsed.paymentDate : null
    };
  } catch {
    return defaultResult;
  }
}

// backend/lambda/image/data-extractor.ts
function mapImageTypeToCategory(imageType) {
  switch (imageType) {
    case "gifticon":
      return "gifticon";
    case "food_label":
      return "food";
    case "subscription":
      return "subscription";
    default:
      return void 0;
  }
}
function determineSubcategory(imageType) {
  switch (imageType) {
    case "gifticon":
      return "\uAE30\uD0C0";
    // 기본 서브카테고리, 세부 분류는 사용자가 수정 가능
    case "food_label":
      return "\uC0C1\uC628";
    // 기본 서브카테고리
    case "subscription":
      return "\uAD6C\uB3C5 \uC11C\uBE44\uC2A4";
    default:
      return void 0;
  }
}
function calculateConfidence(result) {
  if (result.imageType === "unknown") {
    return 0;
  }
  const { extractedData } = result;
  let extractedCount = 0;
  let totalFields = 0;
  switch (result.imageType) {
    case "gifticon":
      totalFields = 3;
      if (extractedData.brand) extractedCount++;
      if (extractedData.name) extractedCount++;
      if (extractedData.expiryDate) extractedCount++;
      break;
    case "food_label":
      totalFields = 2;
      if (extractedData.name) extractedCount++;
      if (extractedData.expiryDate) extractedCount++;
      break;
    case "subscription":
      totalFields = 2;
      if (extractedData.serviceName || extractedData.name) extractedCount++;
      if (extractedData.paymentDate) extractedCount++;
      break;
  }
  if (totalFields === 0) return 0;
  const ratio = extractedCount / totalFields;
  return Math.round((0.3 + ratio * 0.7) * 100) / 100;
}
function buildImageAnalysisResponse(result) {
  const confidence = calculateConfidence(result);
  const category = mapImageTypeToCategory(result.imageType);
  const subcategory = determineSubcategory(result.imageType);
  const name = result.extractedData.name || result.extractedData.serviceName || void 0;
  const expiryDate = result.extractedData.expiryDate || result.extractedData.paymentDate || void 0;
  const extractedData = {
    name,
    brand: result.extractedData.brand,
    expiryDate,
    category,
    subcategory
  };
  if (result.imageType === "unknown") {
    return {
      success: false,
      imageType: "unknown",
      extractedData: {},
      confidence: 0,
      message: "\uC774\uBBF8\uC9C0\uC5D0\uC11C \uAD00\uB828 \uC815\uBCF4\uB97C \uCD94\uCD9C\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uC218\uB3D9\uC73C\uB85C \uC785\uB825\uD574\uC8FC\uC138\uC694."
    };
  }
  const hasAnyData = name || result.extractedData.brand || expiryDate;
  if (!hasAnyData) {
    return {
      success: false,
      imageType: result.imageType,
      extractedData: { category, subcategory },
      confidence: 0.3,
      message: "\uC774\uBBF8\uC9C0 \uC720\uD615\uC740 \uBD84\uB958\uB418\uC5C8\uC9C0\uB9CC \uC138\uBD80 \uC815\uBCF4\uB97C \uCD94\uCD9C\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uB204\uB77D\uB41C \uD56D\uBAA9\uC744 \uC218\uB3D9\uC73C\uB85C \uC785\uB825\uD574\uC8FC\uC138\uC694."
    };
  }
  const missingFields = [];
  if (!name) missingFields.push("\uC774\uB984");
  if (!expiryDate) missingFields.push("\uB9CC\uB8CC\uC77C");
  let message;
  if (missingFields.length > 0) {
    message = `\uC774\uBBF8\uC9C0 \uBD84\uC11D\uC774 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uB2E4\uC74C \uD56D\uBAA9\uC744 \uC218\uB3D9\uC73C\uB85C \uC785\uB825\uD574\uC8FC\uC138\uC694: ${missingFields.join(", ")}`;
  } else {
    message = "\uC774\uBBF8\uC9C0 \uBD84\uC11D\uC774 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uCD94\uCD9C\uB41C \uC815\uBCF4\uB97C \uD655\uC778\uD574\uC8FC\uC138\uC694.";
  }
  return {
    success: true,
    imageType: result.imageType,
    extractedData,
    confidence,
    message
  };
}

// backend/lambda/image/handler.ts
async function handler(event) {
  const { httpMethod } = event;
  switch (httpMethod) {
    case "POST":
      return errorHandler(() => analyzeImage(event));
    case "OPTIONS":
      return successResponse({});
    default:
      return errorResponse(405, "METHOD_NOT_ALLOWED", `Method ${httpMethod} not allowed`);
  }
}
async function analyzeImage(event) {
  if (!event.body) {
    throw new ValidationError("\uC694\uCCAD \uBCF8\uBB38\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.");
  }
  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    throw new ValidationError("\uC720\uD6A8\uD558\uC9C0 \uC54A\uC740 JSON \uD615\uC2DD\uC785\uB2C8\uB2E4.");
  }
  const { imageBase64, imageContentType } = body;
  const validation = validateImage(imageBase64, imageContentType);
  if (!validation.valid) {
    throw new ValidationError("\uC774\uBBF8\uC9C0 \uAC80\uC99D \uC2E4\uD328", validation.errors);
  }
  try {
    const bedrockResult = await analyzeImageWithBedrock(imageBase64, imageContentType);
    const response = buildImageAnalysisResponse(bedrockResult);
    return successResponse(response);
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "ThrottlingException") {
        throw error;
      }
      if (error.name === "ModelTimeoutException" || error.name === "ServiceUnavailableException") {
        return errorResponse(
          502,
          "AI_SERVICE_ERROR",
          "AI \uC11C\uBE44\uC2A4\uAC00 \uC77C\uC2DC\uC801\uC73C\uB85C \uC751\uB2F5\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694."
        );
      }
      if (error.name === "ValidationException") {
        return errorResponse(
          400,
          "AI_VALIDATION_ERROR",
          "\uC774\uBBF8\uC9C0\uB97C \uBD84\uC11D\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uB2E4\uB978 \uC774\uBBF8\uC9C0\uB97C \uC0AC\uC6A9\uD574\uC8FC\uC138\uC694."
        );
      }
    }
    console.error("Bedrock Vision API error:", error);
    return errorResponse(
      500,
      "ANALYSIS_FAILED",
      "\uC774\uBBF8\uC9C0 \uBD84\uC11D \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694."
    );
  }
}
export {
  handler
};
