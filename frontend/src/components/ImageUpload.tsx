import { useRef, type ChangeEvent } from 'react';

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  disabled: boolean;
}

/** 허용 파일 형식 (Requirement 8.1, 8.9) */
const ACCEPT_TYPES = 'image/jpeg,image/png,image/webp';
/** 최대 파일 크기: 10MB (Requirement 8.9) */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * ImageUpload - 이미지 첨부 버튼
 * - file picker (JPEG/PNG/WEBP, 10MB max)
 * - 최소 44px 탭 대상 (Requirement 10.2)
 * - disabled while loading
 */
export function ImageUpload({ onImageSelect, disabled }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be selected again
    e.target.value = '';

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      alert('이미지 크기는 10MB 이하여야 합니다.');
      return;
    }

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('JPEG, PNG, WEBP 형식의 이미지만 지원합니다.');
      return;
    }

    onImageSelect(file);
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_TYPES}
        onChange={handleChange}
        className="hidden"
        aria-hidden="true"
      />
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-gray-500 hover:text-blue-500 hover:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
        aria-label="이미지 첨부"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-5 h-5"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M1.5 6a2.25 2.25 0 0 1 2.25-2.25h16.5A2.25 2.25 0 0 1 22.5 6v12a2.25 2.25 0 0 1-2.25 2.25H3.75A2.25 2.25 0 0 1 1.5 18V6ZM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0 0 21 18v-1.94l-2.69-2.689a1.5 1.5 0 0 0-2.12 0l-.88.879.97.97a.75.75 0 1 1-1.06 1.06l-5.16-5.159a1.5 1.5 0 0 0-2.12 0L3 16.061Zm10.125-7.81a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </>
  );
}
