import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { successResponse, errorResponse } from '../shared/response.js';
import { errorHandler } from '../shared/error-handler.js';
import { ValidationError } from '../shared/errors.js';
import { searchByKeyword } from './kakao-maps-client.js';
import { filterByRadius, sortByDistance } from './distance-calculator.js';
import type { LocationSearchResponse } from '../shared/types.js';

const DEFAULT_RADIUS_KM = 5;
const MAX_RADIUS_KM = 20;

/**
 * Location Lambda 핸들러
 * GET /api/locations/:brand - 브랜드 매장 위치 검색
 * Kakao Maps API를 활용하여 사용자 위치 기반 매장을 검색한다.
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const { httpMethod } = event;

  if (httpMethod === 'OPTIONS') {
    return successResponse({});
  }

  if (httpMethod !== 'GET') {
    return errorResponse(405, 'METHOD_NOT_ALLOWED', `Method ${httpMethod} not allowed`);
  }

  return errorHandler(async () => {
    // 1. 경로에서 brand 추출
    const brand = extractBrand(event);

    // 2. 쿼리 파라미터에서 lat, lng, radius 추출 및 검증
    const { lat, lng, radius } = extractAndValidateParams(event);

    // 3. Kakao Maps API를 통해 매장 검색
    const radiusMeters = radius * 1000;
    let stores = await searchByKeyword(brand, lat, lng, radiusMeters);

    // 4. 반경 필터링 (Haversine 거리 기반 이중 검증)
    stores = filterByRadius(stores, lat, lng, radius);

    // 5. 거리순 정렬
    stores = sortByDistance(stores);

    // 6. 응답 반환
    const response: LocationSearchResponse = {
      stores,
      count: stores.length,
    };

    return successResponse(response);
  });
}

/**
 * 경로 파라미터에서 brand를 추출
 */
function extractBrand(event: APIGatewayProxyEvent): string {
  const brand = event.pathParameters?.brand;

  if (!brand || brand.trim().length === 0) {
    throw new ValidationError('브랜드명은 필수 항목입니다.', ['brand 경로 파라미터가 누락되었습니다.']);
  }

  return decodeURIComponent(brand.trim());
}

/**
 * 쿼리 파라미터 추출 및 검증
 */
function extractAndValidateParams(event: APIGatewayProxyEvent): {
  lat: number;
  lng: number;
  radius: number;
} {
  const queryParams = event.queryStringParameters || {};
  const errors: string[] = [];

  // lat 검증
  const latStr = queryParams.lat;
  if (!latStr) {
    errors.push('lat (위도) 파라미터는 필수입니다.');
  }

  // lng 검증
  const lngStr = queryParams.lng;
  if (!lngStr) {
    errors.push('lng (경도) 파라미터는 필수입니다.');
  }

  if (errors.length > 0) {
    throw new ValidationError('필수 파라미터가 누락되었습니다.', errors);
  }

  const lat = parseFloat(latStr!);
  const lng = parseFloat(lngStr!);

  if (isNaN(lat) || lat < -90 || lat > 90) {
    errors.push('lat은 -90 ~ 90 범위의 유효한 숫자여야 합니다.');
  }

  if (isNaN(lng) || lng < -180 || lng > 180) {
    errors.push('lng은 -180 ~ 180 범위의 유효한 숫자여야 합니다.');
  }

  if (errors.length > 0) {
    throw new ValidationError('파라미터 값이 유효하지 않습니다.', errors);
  }

  // radius (선택, 기본값 5km)
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
