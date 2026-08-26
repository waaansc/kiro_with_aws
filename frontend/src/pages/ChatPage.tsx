import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../hooks/useChat';
import { ChatWindow } from '../components/ChatWindow';
import { MessageInput } from '../components/MessageInput';
import { ImageUpload } from '../components/ImageUpload';
import type { CreateItemRequest, ImageAnalysisResponse } from '../types';

/**
 * ChatPage - AI 챗봇 페이지
 * - ChatWindow: 메시지 버블 표시
 * - MessageInput: 텍스트 입력 + 전송
 * - ImageUpload: 이미지 첨부
 * - ExtractedInfoCard: 분석 결과 (ChatWindow 내 렌더링)
 *
 * Requirements: 7.1, 7.2, 8.6, 8.7, 8.8, 12.2, 12.3
 */
export default function ChatPage() {
  const navigate = useNavigate();
  const { messages, loading, sendMessage, sendImage, confirmAction } =
    useChat();

  const handleConfirm = useCallback(
    async (data: CreateItemRequest) => {
      try {
        await confirmAction(data);
      } catch {
        // Error already handled in useChat hook (message added)
      }
    },
    [confirmAction],
  );

  const handleEdit = useCallback(
    (extractedData: ImageAnalysisResponse['extractedData']) => {
      // Navigate to item form with pre-filled data via URL search params
      const params = new URLSearchParams();
      if (extractedData.name) params.set('name', extractedData.name);
      if (extractedData.category) params.set('category', extractedData.category);
      if (extractedData.expiryDate) params.set('expiryDate', extractedData.expiryDate);
      if (extractedData.brand) params.set('brand', extractedData.brand);
      if (extractedData.subcategory) params.set('subcategory', extractedData.subcategory);
      navigate(`/items/new?${params.toString()}`);
    },
    [navigate],
  );

  const handleDismiss = useCallback(() => {
    // Dismissing simply does nothing - the card stays but user chose to cancel
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-md mx-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-900">AI 챗봇</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          채팅으로 아이템을 등록하거나 조회하세요
        </p>
      </div>

      {/* Message area */}
      <ChatWindow
        messages={messages}
        loading={loading}
        onConfirm={handleConfirm}
        onEdit={handleEdit}
        onDismiss={handleDismiss}
      />

      {/* Input area */}
      <div className="px-4 py-3 border-t border-gray-200 bg-white">
        <div className="flex items-center gap-1">
          <ImageUpload onImageSelect={sendImage} disabled={loading} />
          <div className="flex-1">
            <MessageInput onSend={sendMessage} disabled={loading} />
          </div>
        </div>
      </div>
    </div>
  );
}
