import { describe, it, expect } from 'vitest';
import { docClient, TABLE_NAME } from './dynamodb-client.js';

describe('dynamodb-client', () => {
  it('DocumentClient가 정상적으로 export된다', () => {
    expect(docClient).toBeDefined();
    expect(docClient.send).toBeTypeOf('function');
  });

  it('TABLE_NAME 기본값이 설정된다', () => {
    expect(TABLE_NAME).toBe('expiry-dashboard-items');
  });
});
