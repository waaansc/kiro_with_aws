import { describe, it, expect, vi } from 'vitest';
import { errorHandler } from './error-handler.js';
import { ValidationError, NotFoundError } from './errors.js';

describe('errorHandler', () => {
  it('성공 시 handler 결과를 그대로 반환한다', async () => {
    const result = await errorHandler(async () => ({
      statusCode: 200,
      headers: {},
      body: JSON.stringify({ message: 'ok' }),
    }));

    expect(result.statusCode).toBe(200);
  });

  it('ValidationError 발생 시 400을 반환한다', async () => {
    const result = await errorHandler(async () => {
      throw new ValidationError('유효성 검증 실패', ['이름은 필수 항목입니다.']);
    });

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(body.message).toBe('유효성 검증 실패');
    expect(body.details).toContain('이름은 필수 항목입니다.');
  });

  it('NotFoundError 발생 시 404를 반환한다', async () => {
    const result = await errorHandler(async () => {
      throw new NotFoundError('아이템을 찾을 수 없습니다.');
    });

    expect(result.statusCode).toBe(404);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('NOT_FOUND');
    expect(body.message).toBe('아이템을 찾을 수 없습니다.');
  });

  it('ThrottlingException 발생 시 429를 반환한다', async () => {
    const throttlingError = new Error('Rate exceeded');
    throttlingError.name = 'ThrottlingException';

    const result = await errorHandler(async () => {
      throw throttlingError;
    });

    expect(result.statusCode).toBe(429);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('RATE_LIMITED');
  });

  it('알 수 없는 에러 발생 시 500을 반환하고 로깅한다', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await errorHandler(async () => {
      throw new Error('unexpected error');
    });

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('INTERNAL_ERROR');
    expect(body.message).toBe('서버 오류가 발생했습니다.');
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
