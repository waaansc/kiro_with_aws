import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

/**
 * DynamoDB DocumentClient 초기화
 * - 환경변수 TABLE_NAME으로 테이블명 설정
 * - DocumentClient를 통해 마샬링/언마샬링 자동 처리
 */

const client = new DynamoDBClient({});

export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

export const TABLE_NAME = process.env.TABLE_NAME ?? 'expiry-dashboard-items';
