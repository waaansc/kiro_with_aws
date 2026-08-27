const MAX_SIZE = 1200;
const QUALITY = 0.8;

/**
 * 이미지 파일을 리사이즈하여 base64로 반환
 * - 긴 변 기준 최대 1200px로 축소
 * - JPEG 80% 품질로 압축
 * - 원본이 작으면 그대로 유지
 */
export async function resizeImage(file: File): Promise<{ base64: string; contentType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // 리사이즈 필요 여부 확인
      if (width > MAX_SIZE || height > MAX_SIZE) {
        if (width > height) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        } else {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas not supported'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // JPEG로 압축 (WEBP보다 호환성 좋음)
      const dataUrl = canvas.toDataURL('image/jpeg', QUALITY);
      const base64 = dataUrl.split(',')[1];

      resolve({ base64, contentType: 'image/jpeg' });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지를 읽을 수 없습니다.'));
    };

    img.src = url;
  });
}
