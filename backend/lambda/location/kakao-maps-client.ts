import type { Store } from '../shared/types.js';

/**
 * Kakao Maps REST API 키워드 검색 클라이언트
 * - API 문서: https://developers.kakao.com/docs/latest/ko/local/dev-guide#search-by-keyword
 */

const KAKAO_API_BASE_URL = 'https://dapi.kakao.com/v2/local/search/keyword.json';

/** Kakao API 응답의 개별 장소 문서 */
interface KakaoPlaceDocument {
  place_name: string;
  address_name: string;
  road_address_name?: string;
  x: string; // 경도 (longitude)
  y: string; // 위도 (latitude)
  distance?: string; // 미터 단위
  phone?: string;
}

/** Kakao API 응답 */
interface KakaoSearchResponse {
  meta: {
    total_count: number;
    pageable_count: number;
    is_end: boolean;
  };
  documents: KakaoPlaceDocument[];
}

/**
 * Kakao Maps API 키를 환경변수에서 가져옴
 */
function getApiKey(): string {
  const apiKey = process.env.KAKAO_API_KEY;
  if (!apiKey) {
    throw new Error('KAKAO_API_KEY 환경변수가 설정되지 않았습니다.');
  }
  return apiKey;
}

/**
 * Kakao Maps API 키워드 검색으로 매장을 검색
 * @param keyword - 검색 키워드 (브랜드명)
 * @param lat - 사용자 위도
 * @param lng - 사용자 경도
 * @param radiusMeters - 검색 반경 (미터, 최대 20000)
 * @returns 매장 목록
 */
export async function searchByKeyword(
  keyword: string,
  lat: number,
  lng: number,
  radiusMeters: number
): Promise<Store[]> {
  const apiKey = getApiKey();

  const params = new URLSearchParams({
    query: keyword,
    x: lng.toString(), // Kakao API에서 x는 경도
    y: lat.toString(), // Kakao API에서 y는 위도
    radius: Math.min(radiusMeters, 20000).toString(),
    sort: 'distance',
  });

  const url = `${KAKAO_API_BASE_URL}?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `KakaoAK ${apiKey}`,
    },
  });

  if (!response.ok) {
    const statusCode = response.status;
    if (statusCode === 401) {
      throw new Error('Kakao API 인증 실패: API 키를 확인해주세요.');
    }
    throw new Error(`Kakao Maps API 요청 실패 (HTTP ${statusCode})`);
  }

  const data = (await response.json()) as KakaoSearchResponse;

  return data.documents.map((doc) => parseDocument(doc, lat, lng));
}

/**
 * Kakao API 응답 문서를 Store 형식으로 변환
 */
function parseDocument(doc: KakaoPlaceDocument, _centerLat: number, _centerLng: number): Store {
  const storeLat = parseFloat(doc.y);
  const storeLng = parseFloat(doc.x);
  const distanceMeters = doc.distance ? parseInt(doc.distance, 10) : 0;

  return {
    name: doc.place_name,
    address: doc.road_address_name || doc.address_name,
    lat: storeLat,
    lng: storeLng,
    distance: distanceMeters / 1000, // 미터 → km 변환
    ...(doc.phone && { phone: doc.phone }),
  };
}
