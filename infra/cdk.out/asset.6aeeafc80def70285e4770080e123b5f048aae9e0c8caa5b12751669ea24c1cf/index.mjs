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

// backend/lambda/items/create-item.ts
import { PutCommand } from "@aws-sdk/lib-dynamodb";

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

// backend/lambda/items/validator.ts
var VALID_CATEGORIES = ["gifticon", "food", "subscription", "other"];
var ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
function validateCreateItem(data) {
  const errors = [];
  if (!data.name || data.name.trim().length === 0) {
    errors.push("\uC774\uB984\uC740 \uD544\uC218 \uD56D\uBAA9\uC785\uB2C8\uB2E4.");
  } else if (data.name.trim().length > 50) {
    errors.push("\uC774\uB984\uC740 50\uC790 \uC774\uD558\uC5EC\uC57C \uD569\uB2C8\uB2E4.");
  }
  if (!data.category) {
    errors.push("\uCE74\uD14C\uACE0\uB9AC\uB294 \uD544\uC218 \uD56D\uBAA9\uC785\uB2C8\uB2E4.");
  } else if (!VALID_CATEGORIES.includes(data.category)) {
    errors.push("\uC720\uD6A8\uD558\uC9C0 \uC54A\uC740 \uCE74\uD14C\uACE0\uB9AC\uC785\uB2C8\uB2E4.");
  }
  if (!data.expiryDate) {
    errors.push("\uB9CC\uB8CC\uC77C\uC740 \uD544\uC218 \uD56D\uBAA9\uC785\uB2C8\uB2E4.");
  } else if (!ISO_DATE_REGEX.test(data.expiryDate)) {
    errors.push("\uB9CC\uB8CC\uC77C\uC740 YYYY-MM-DD \uD615\uC2DD\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.");
  } else {
    const date = new Date(data.expiryDate);
    if (isNaN(date.getTime())) {
      errors.push("\uC720\uD6A8\uD558\uC9C0 \uC54A\uC740 \uB0A0\uC9DC\uC785\uB2C8\uB2E4.");
    }
  }
  return { valid: errors.length === 0, errors };
}

// backend/lambda/items/s3-upload.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
var s3Client = new S3Client({});
var IMAGE_BUCKET = process.env.IMAGE_BUCKET ?? "expiry-dashboard-images";
var VALID_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"];
var MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
async function uploadImage(itemId, imageBase64, contentType) {
  if (!VALID_CONTENT_TYPES.includes(contentType)) {
    return {
      success: false,
      error: `\uC9C0\uC6D0\uD558\uC9C0 \uC54A\uB294 \uC774\uBBF8\uC9C0 \uD615\uC2DD\uC785\uB2C8\uB2E4. (\uC9C0\uC6D0: JPEG, PNG, WEBP)`
    };
  }
  const imageBuffer = Buffer.from(imageBase64, "base64");
  if (imageBuffer.length > MAX_IMAGE_SIZE_BYTES) {
    return {
      success: false,
      error: `\uC774\uBBF8\uC9C0 \uD06C\uAE30\uAC00 5MB\uB97C \uCD08\uACFC\uD569\uB2C8\uB2E4. (\uD604\uC7AC: ${(imageBuffer.length / (1024 * 1024)).toFixed(1)}MB)`
    };
  }
  const extMap = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp"
  };
  const ext = extMap[contentType] ?? "jpg";
  const key = `items/${itemId}/image.${ext}`;
  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: IMAGE_BUCKET,
        Key: key,
        Body: imageBuffer,
        ContentType: contentType,
        ACL: "public-read"
      })
    );
    const imageUrl = `https://${IMAGE_BUCKET}.s3.amazonaws.com/${key}`;
    return { success: true, imageUrl };
  } catch (error) {
    console.error("S3 upload failed:", error);
    return {
      success: false,
      error: "\uC774\uBBF8\uC9C0 \uC5C5\uB85C\uB4DC\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4."
    };
  }
}

// backend/lambda/items/create-item.ts
async function createItem(event) {
  const body = event.body ? JSON.parse(event.body) : {};
  const request = body;
  const validation = validateCreateItem(request);
  if (!validation.valid) {
    throw new ValidationError("\uC720\uD6A8\uC131 \uAC80\uC99D \uC2E4\uD328", validation.errors);
  }
  const id = v4_default();
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  let imageUrl;
  if (request.imageBase64 && request.imageContentType) {
    const uploadResult = await uploadImage(id, request.imageBase64, request.imageContentType);
    if (uploadResult.success) {
      imageUrl = uploadResult.imageUrl;
    } else {
      console.warn("Image upload failed:", uploadResult.error);
    }
  }
  const item = {
    id,
    name: request.name.trim(),
    category: request.category,
    subcategory: request.subcategory,
    expiryDate: request.expiryDate,
    brand: request.brand,
    memo: request.memo,
    imageUrl,
    createdAt,
    isArchived: false
  };
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item
    })
  );
  const response = {
    id: item.id,
    name: item.name,
    category: item.category,
    subcategory: item.subcategory,
    expiryDate: item.expiryDate,
    brand: item.brand,
    memo: item.memo,
    imageUrl: item.imageUrl,
    createdAt: item.createdAt,
    isArchived: item.isArchived
  };
  return successResponse(response, 201);
}

// backend/lambda/items/get-items.ts
import { QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
function calculateDday(expiryDate, today) {
  const expiry = new Date(expiryDate);
  const now = today ? new Date(today) : /* @__PURE__ */ new Date();
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
function sortByExpiry(items) {
  return [...items].sort((a, b) => {
    if (a.dday >= 0 && b.dday < 0) return -1;
    if (a.dday < 0 && b.dday >= 0) return 1;
    return a.dday - b.dday;
  });
}
async function getItems(event) {
  const queryParams = event.queryStringParameters ?? {};
  const category = queryParams.category;
  const archived = queryParams.archived === "true";
  let items;
  if (category) {
    items = await queryByCategory(category, archived);
  } else {
    items = await scanByArchiveStatus(archived);
  }
  const summaries = items.map(toItemSummary);
  const sorted = sortByExpiry(summaries);
  const response = {
    items: sorted,
    count: sorted.length
  };
  return successResponse(response);
}
async function queryByCategory(category, archived) {
  const command = new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: "category-expiryDate-index",
    KeyConditionExpression: "category = :category",
    FilterExpression: "isArchived = :archived",
    ExpressionAttributeValues: {
      ":category": category,
      ":archived": archived
    }
  });
  const result = await docClient.send(command);
  return result.Items ?? [];
}
async function scanByArchiveStatus(archived) {
  const command = new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: "isArchived = :archived",
    ExpressionAttributeValues: {
      ":archived": archived
    }
  });
  const result = await docClient.send(command);
  return result.Items ?? [];
}

// backend/lambda/items/get-item-detail.ts
import { GetCommand } from "@aws-sdk/lib-dynamodb";
async function getItemDetail(event) {
  const itemId = extractItemId(event.path);
  if (!itemId) {
    throw new NotFoundError("\uC544\uC774\uD15C ID\uAC00 \uC9C0\uC815\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4.");
  }
  const command = new GetCommand({
    TableName: TABLE_NAME,
    Key: { id: itemId }
  });
  const result = await docClient.send(command);
  if (!result.Item) {
    throw new NotFoundError(`\uC544\uC774\uD15C\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4: ${itemId}`);
  }
  const item = result.Item;
  const dday = calculateDday(item.expiryDate);
  const response = {
    id: item.id,
    name: item.name,
    category: item.category,
    subcategory: item.subcategory,
    expiryDate: item.expiryDate,
    brand: item.brand,
    memo: item.memo,
    imageUrl: item.imageUrl,
    createdAt: item.createdAt,
    isArchived: item.isArchived,
    dday
  };
  return successResponse(response);
}
function extractItemId(path) {
  const segments = path.split("/").filter(Boolean);
  if (segments.length >= 3 && segments[1] === "items") {
    return segments[2];
  }
  return null;
}

// backend/lambda/items/delete-item.ts
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
async function deleteItem(event) {
  const itemId = extractItemId2(event.path);
  if (!itemId) {
    throw new NotFoundError("\uC544\uC774\uD15C ID\uAC00 \uC9C0\uC815\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4.");
  }
  const command = new DeleteCommand({
    TableName: TABLE_NAME,
    Key: { id: itemId },
    ConditionExpression: "attribute_exists(id)"
  });
  try {
    await docClient.send(command);
  } catch (error) {
    if (error instanceof Error && error.name === "ConditionalCheckFailedException") {
      throw new NotFoundError("\uD574\uB2F9 \uC544\uC774\uD15C\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
    }
    throw error;
  }
  return successResponse({ message: "\uC544\uC774\uD15C\uC774 \uC0AD\uC81C\uB418\uC5C8\uC2B5\uB2C8\uB2E4." });
}
function extractItemId2(path) {
  const segments = path.split("/").filter(Boolean);
  if (segments.length >= 3 && segments[1] === "items") {
    return segments[2];
  }
  return null;
}

// backend/lambda/items/update-item.ts
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
var VALID_CATEGORIES2 = ["gifticon", "food", "subscription", "other"];
var ISO_DATE_REGEX2 = /^\d{4}-\d{2}-\d{2}$/;
async function updateItem(event) {
  const itemId = extractItemId3(event.path);
  if (!itemId) {
    throw new NotFoundError("\uC544\uC774\uD15C ID\uAC00 \uC9C0\uC815\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4.");
  }
  const body = event.body ? JSON.parse(event.body) : {};
  const request = body;
  const validation = validateUpdateItem(request);
  if (!validation.valid) {
    throw new ValidationError("\uC720\uD6A8\uC131 \uAC80\uC99D \uC2E4\uD328", validation.errors);
  }
  const updatableFields = buildUpdatableFields(request);
  if (Object.keys(updatableFields).length === 0) {
    throw new ValidationError("\uC218\uC815\uD560 \uD544\uB4DC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.", ["\uCD5C\uC18C \uD558\uB098\uC758 \uD544\uB4DC\uB97C \uD3EC\uD568\uD574\uC57C \uD569\uB2C8\uB2E4."]);
  }
  const { updateExpression, expressionAttributeNames, expressionAttributeValues } = buildUpdateExpression(updatableFields);
  try {
    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { id: itemId },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ConditionExpression: "attribute_exists(id)",
      ReturnValues: "ALL_NEW"
    });
    const result = await docClient.send(command);
    const updatedItem = result.Attributes;
    const warning = checkExpiryDateWarning(request.expiryDate);
    const response = {
      ...updatedItem,
      message: "\uC544\uC774\uD15C\uC774 \uC131\uACF5\uC801\uC73C\uB85C \uC218\uC815\uB418\uC5C8\uC2B5\uB2C8\uB2E4."
    };
    if (warning) {
      response.warning = warning;
    }
    return successResponse(response);
  } catch (error) {
    if (error instanceof Error && error.name === "ConditionalCheckFailedException") {
      throw new NotFoundError(`\uC544\uC774\uD15C\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4: ${itemId}`);
    }
    throw error;
  }
}
function extractItemId3(path) {
  const segments = path.split("/").filter(Boolean);
  if (segments.length >= 3 && segments[1] === "items") {
    return segments[2];
  }
  return null;
}
function validateUpdateItem(data) {
  const errors = [];
  if ("name" in data) {
    if (data.name === null || data.name === void 0) {
      errors.push("\uC774\uB984\uC740 \uD544\uC218 \uD56D\uBAA9\uC774\uBA70 null\uB85C \uC124\uC815\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
    } else if (typeof data.name === "string" && data.name.trim().length === 0) {
      errors.push("\uC774\uB984\uC740 \uD544\uC218 \uD56D\uBAA9\uC774\uBA70 \uBE48 \uAC12\uC73C\uB85C \uC124\uC815\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
    } else if (typeof data.name === "string" && data.name.trim().length > 50) {
      errors.push("\uC774\uB984\uC740 50\uC790 \uC774\uD558\uC5EC\uC57C \uD569\uB2C8\uB2E4.");
    }
  }
  if ("category" in data) {
    if (data.category === null || data.category === void 0) {
      errors.push("\uCE74\uD14C\uACE0\uB9AC\uB294 \uD544\uC218 \uD56D\uBAA9\uC774\uBA70 null\uB85C \uC124\uC815\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
    } else if (!VALID_CATEGORIES2.includes(data.category)) {
      errors.push("\uC720\uD6A8\uD558\uC9C0 \uC54A\uC740 \uCE74\uD14C\uACE0\uB9AC\uC785\uB2C8\uB2E4.");
    }
  }
  if ("expiryDate" in data) {
    if (data.expiryDate === null || data.expiryDate === void 0) {
      errors.push("\uB9CC\uB8CC\uC77C\uC740 \uD544\uC218 \uD56D\uBAA9\uC774\uBA70 null\uB85C \uC124\uC815\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
    } else if (typeof data.expiryDate === "string" && data.expiryDate.trim().length === 0) {
      errors.push("\uB9CC\uB8CC\uC77C\uC740 \uD544\uC218 \uD56D\uBAA9\uC774\uBA70 \uBE48 \uAC12\uC73C\uB85C \uC124\uC815\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
    } else if (typeof data.expiryDate === "string" && !ISO_DATE_REGEX2.test(data.expiryDate)) {
      errors.push("\uB9CC\uB8CC\uC77C\uC740 YYYY-MM-DD \uD615\uC2DD\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.");
    } else if (typeof data.expiryDate === "string" && ISO_DATE_REGEX2.test(data.expiryDate)) {
      const date = new Date(data.expiryDate);
      if (isNaN(date.getTime())) {
        errors.push("\uC720\uD6A8\uD558\uC9C0 \uC54A\uC740 \uB0A0\uC9DC\uC785\uB2C8\uB2E4.");
      }
    }
  }
  return { valid: errors.length === 0, errors };
}
function buildUpdatableFields(request) {
  const fields = {};
  if (request.name !== void 0 && request.name !== null) {
    fields.name = request.name.trim();
  }
  if (request.category !== void 0 && request.category !== null) {
    fields.category = request.category;
  }
  if (request.subcategory !== void 0) {
    fields.subcategory = request.subcategory;
  }
  if (request.expiryDate !== void 0 && request.expiryDate !== null) {
    fields.expiryDate = request.expiryDate;
  }
  if (request.brand !== void 0) {
    fields.brand = request.brand;
  }
  if (request.memo !== void 0) {
    fields.memo = request.memo;
  }
  return fields;
}
function buildUpdateExpression(fields) {
  const setExpressions = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};
  Object.entries(fields).forEach(([key, value]) => {
    const nameKey = `#${key}`;
    const valueKey = `:${key}`;
    setExpressions.push(`${nameKey} = ${valueKey}`);
    expressionAttributeNames[nameKey] = key;
    expressionAttributeValues[valueKey] = value;
  });
  return {
    updateExpression: `SET ${setExpressions.join(", ")}`,
    expressionAttributeNames,
    expressionAttributeValues
  };
}
function checkExpiryDateWarning(expiryDate) {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate);
  const today = /* @__PURE__ */ new Date();
  expiry.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  if (expiry.getTime() < today.getTime()) {
    return "\uB9CC\uB8CC\uC77C\uC774 \uACFC\uAC70 \uB0A0\uC9DC\uC785\uB2C8\uB2E4. \uC800\uC7A5\uC740 \uD5C8\uC6A9\uB418\uC5C8\uC2B5\uB2C8\uB2E4.";
  }
  return null;
}

// backend/lambda/items/archive-item.ts
import { ScanCommand as ScanCommand2, UpdateCommand as UpdateCommand2 } from "@aws-sdk/lib-dynamodb";
async function archiveExpired() {
  const scanCommand = new ScanCommand2({
    TableName: TABLE_NAME,
    FilterExpression: "isArchived = :archived",
    ExpressionAttributeValues: {
      ":archived": false
    }
  });
  const result = await docClient.send(scanCommand);
  const items = result.Items ?? [];
  const today = /* @__PURE__ */ new Date();
  today.setHours(0, 0, 0, 0);
  const expiredItems = items.filter((item) => {
    const expiryDate = new Date(item.expiryDate);
    expiryDate.setHours(0, 0, 0, 0);
    return expiryDate < today;
  });
  let archivedCount = 0;
  for (const item of expiredItems) {
    const updateCommand = new UpdateCommand2({
      TableName: TABLE_NAME,
      Key: { id: item.id },
      UpdateExpression: "SET isArchived = :archived",
      ExpressionAttributeValues: {
        ":archived": true
      }
    });
    await docClient.send(updateCommand);
    archivedCount++;
  }
  return successResponse({
    message: `${archivedCount}\uAC1C\uC758 \uB9CC\uB8CC\uB41C \uC544\uC774\uD15C\uC774 \uC544\uCE74\uC774\uBE0C\uB418\uC5C8\uC2B5\uB2C8\uB2E4.`,
    archivedCount
  });
}
async function restoreItem(event) {
  const itemId = extractItemId4(event.path);
  if (!itemId) {
    throw new NotFoundError("\uC544\uC774\uD15C ID\uAC00 \uC9C0\uC815\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4.");
  }
  const updateCommand = new UpdateCommand2({
    TableName: TABLE_NAME,
    Key: { id: itemId },
    UpdateExpression: "SET isArchived = :archived",
    ConditionExpression: "attribute_exists(id)",
    ExpressionAttributeValues: {
      ":archived": false
    },
    ReturnValues: "ALL_NEW"
  });
  try {
    const result = await docClient.send(updateCommand);
    const restoredItem = result.Attributes;
    return successResponse({
      message: "\uC544\uC774\uD15C\uC774 \uBCF5\uC6D0\uB418\uC5C8\uC2B5\uB2C8\uB2E4.",
      item: restoredItem
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ConditionalCheckFailedException") {
      throw new NotFoundError(`\uC544\uC774\uD15C\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4: ${itemId}`);
    }
    throw error;
  }
}
function extractItemId4(path) {
  const segments = path.split("/").filter(Boolean);
  if (segments.length >= 4 && segments[1] === "items" && segments[3] === "restore") {
    return segments[2];
  }
  return null;
}

// backend/lambda/items/handler.ts
async function handler(event) {
  const { httpMethod } = event;
  return errorHandler(async () => {
    switch (httpMethod) {
      case "POST":
        return handlePost(event);
      case "GET":
        return handleGet(event);
      case "PUT":
        return updateItem(event);
      case "DELETE":
        return deleteItem(event);
      case "PATCH":
        return handlePatch(event);
      case "OPTIONS":
        return successResponse({});
      default:
        return errorResponse(405, "METHOD_NOT_ALLOWED", `Method ${httpMethod} not allowed`);
    }
  });
}
function handlePost(event) {
  if (event.path.endsWith("/archive-expired")) {
    return archiveExpired();
  }
  return createItem(event);
}
function handleGet(event) {
  if (hasItemId(event.path)) {
    return getItemDetail(event);
  }
  return getItems(event);
}
function handlePatch(event) {
  if (event.path.endsWith("/restore")) {
    return restoreItem(event);
  }
  return Promise.resolve(errorResponse(400, "BAD_REQUEST", "\uC9C0\uC6D0\uD558\uC9C0 \uC54A\uB294 PATCH \uACBD\uB85C\uC785\uB2C8\uB2E4."));
}
function hasItemId(path) {
  const segments = path.split("/").filter(Boolean);
  return segments.length >= 3 && segments[1] === "items" && segments[2] !== "";
}
export {
  handler
};
