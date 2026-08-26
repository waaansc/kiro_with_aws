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

// backend/lambda/location/kakao-maps-client.ts
var KAKAO_API_BASE_URL = "https://dapi.kakao.com/v2/local/search/keyword.json";
function getApiKey() {
  const apiKey = process.env.KAKAO_API_KEY;
  if (!apiKey) {
    throw new Error("KAKAO_API_KEY \uD658\uACBD\uBCC0\uC218\uAC00 \uC124\uC815\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4.");
  }
  return apiKey;
}
async function searchByKeyword(keyword, lat, lng, radiusMeters) {
  const apiKey = getApiKey();
  const params = new URLSearchParams({
    query: keyword,
    x: lng.toString(),
    // Kakao API에서 x는 경도
    y: lat.toString(),
    // Kakao API에서 y는 위도
    radius: Math.min(radiusMeters, 2e4).toString(),
    sort: "distance"
  });
  const url = `${KAKAO_API_BASE_URL}?${params.toString()}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `KakaoAK ${apiKey}`
    }
  });
  if (!response.ok) {
    const statusCode = response.status;
    if (statusCode === 401) {
      throw new Error("Kakao API \uC778\uC99D \uC2E4\uD328: API \uD0A4\uB97C \uD655\uC778\uD574\uC8FC\uC138\uC694.");
    }
    throw new Error(`Kakao Maps API \uC694\uCCAD \uC2E4\uD328 (HTTP ${statusCode})`);
  }
  const data = await response.json();
  return data.documents.map((doc) => parseDocument(doc, lat, lng));
}
function parseDocument(doc, _centerLat, _centerLng) {
  const storeLat = parseFloat(doc.y);
  const storeLng = parseFloat(doc.x);
  const distanceMeters = doc.distance ? parseInt(doc.distance, 10) : 0;
  return {
    name: doc.place_name,
    address: doc.road_address_name || doc.address_name,
    lat: storeLat,
    lng: storeLng,
    distance: distanceMeters / 1e3,
    // 미터 → km 변환
    ...doc.phone && { phone: doc.phone }
  };
}

// backend/lambda/location/distance-calculator.ts
var EARTH_RADIUS_KM = 6371;
function haversineDistance(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}
function filterByRadius(stores, centerLat, centerLng, radiusKm) {
  return stores.map((store) => ({
    ...store,
    distance: haversineDistance(centerLat, centerLng, store.lat, store.lng)
  })).filter((store) => store.distance <= radiusKm);
}
function sortByDistance(stores) {
  return [...stores].sort((a, b) => a.distance - b.distance);
}

// backend/lambda/location/handler.ts
var DEFAULT_RADIUS_KM = 5;
var MAX_RADIUS_KM = 20;
async function handler(event) {
  const { httpMethod } = event;
  if (httpMethod === "OPTIONS") {
    return successResponse({});
  }
  if (httpMethod !== "GET") {
    return errorResponse(405, "METHOD_NOT_ALLOWED", `Method ${httpMethod} not allowed`);
  }
  return errorHandler(async () => {
    const brand = extractBrand(event);
    const { lat, lng, radius } = extractAndValidateParams(event);
    const radiusMeters = radius * 1e3;
    let stores = await searchByKeyword(brand, lat, lng, radiusMeters);
    stores = filterByRadius(stores, lat, lng, radius);
    stores = sortByDistance(stores);
    const response = {
      stores,
      count: stores.length
    };
    return successResponse(response);
  });
}
function extractBrand(event) {
  const brand = event.pathParameters?.brand;
  if (!brand || brand.trim().length === 0) {
    throw new ValidationError("\uBE0C\uB79C\uB4DC\uBA85\uC740 \uD544\uC218 \uD56D\uBAA9\uC785\uB2C8\uB2E4.", ["brand \uACBD\uB85C \uD30C\uB77C\uBBF8\uD130\uAC00 \uB204\uB77D\uB418\uC5C8\uC2B5\uB2C8\uB2E4."]);
  }
  return decodeURIComponent(brand.trim());
}
function extractAndValidateParams(event) {
  const queryParams = event.queryStringParameters || {};
  const errors = [];
  const latStr = queryParams.lat;
  if (!latStr) {
    errors.push("lat (\uC704\uB3C4) \uD30C\uB77C\uBBF8\uD130\uB294 \uD544\uC218\uC785\uB2C8\uB2E4.");
  }
  const lngStr = queryParams.lng;
  if (!lngStr) {
    errors.push("lng (\uACBD\uB3C4) \uD30C\uB77C\uBBF8\uD130\uB294 \uD544\uC218\uC785\uB2C8\uB2E4.");
  }
  if (errors.length > 0) {
    throw new ValidationError("\uD544\uC218 \uD30C\uB77C\uBBF8\uD130\uAC00 \uB204\uB77D\uB418\uC5C8\uC2B5\uB2C8\uB2E4.", errors);
  }
  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);
  if (isNaN(lat) || lat < -90 || lat > 90) {
    errors.push("lat\uC740 -90 ~ 90 \uBC94\uC704\uC758 \uC720\uD6A8\uD55C \uC22B\uC790\uC5EC\uC57C \uD569\uB2C8\uB2E4.");
  }
  if (isNaN(lng) || lng < -180 || lng > 180) {
    errors.push("lng\uC740 -180 ~ 180 \uBC94\uC704\uC758 \uC720\uD6A8\uD55C \uC22B\uC790\uC5EC\uC57C \uD569\uB2C8\uB2E4.");
  }
  if (errors.length > 0) {
    throw new ValidationError("\uD30C\uB77C\uBBF8\uD130 \uAC12\uC774 \uC720\uD6A8\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.", errors);
  }
  const radiusStr = queryParams.radius;
  let radius = DEFAULT_RADIUS_KM;
  if (radiusStr) {
    radius = parseFloat(radiusStr);
    if (isNaN(radius) || radius <= 0) {
      radius = DEFAULT_RADIUS_KM;
    } else if (radius > MAX_RADIUS_KM) {
      radius = MAX_RADIUS_KM;
    }
  }
  return { lat, lng, radius };
}
export {
  handler
};
