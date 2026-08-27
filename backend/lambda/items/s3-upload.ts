import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({});
const IMAGE_BUCKET = process.env.IMAGE_BUCKET ?? 'expiry-dashboard-images';

const VALID_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

type ValidContentType = typeof VALID_CONTENT_TYPES[number];

interface UploadResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

/**
 * Base64 인코딩된 이미지를 S3에 업로드
 * - 이미지 크기 검증 (5MB 이하)
 * - 콘텐츠 타입 검증 (JPEG, PNG, WEBP)
 * - S3에 업로드 후 URL 반환
 */
export async function uploadImage(
  itemId: string,
  imageBase64: string,
  contentType: string
): Promise<UploadResult> {
  // 콘텐츠 타입 검증
  if (!VALID_CONTENT_TYPES.includes(contentType as ValidContentType)) {
    return {
      success: false,
      error: `지원하지 않는 이미지 형식입니다. (지원: JPEG, PNG, WEBP)`,
    };
  }

  // Base64 디코드 및 크기 검증
  const imageBuffer = Buffer.from(imageBase64, 'base64');
  if (imageBuffer.length > MAX_IMAGE_SIZE_BYTES) {
    return {
      success: false,
      error: `이미지 크기가 5MB를 초과합니다. (현재: ${(imageBuffer.length / (1024 * 1024)).toFixed(1)}MB)`,
    };
  }

  // 파일 확장자 결정
  const extMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  const ext = extMap[contentType] ?? 'jpg';
  const key = `items/${itemId}/image.${ext}`;

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: IMAGE_BUCKET,
        Key: key,
        Body: imageBuffer,
        ContentType: contentType,
        ACL: 'public-read',
      })
    );

    const imageUrl = `https://${IMAGE_BUCKET}.s3.amazonaws.com/${key}`;
    return { success: true, imageUrl };
  } catch (error) {
    console.error('S3 upload failed:', error);
    return {
      success: false,
      error: '이미지 업로드에 실패했습니다.',
    };
  }
}
