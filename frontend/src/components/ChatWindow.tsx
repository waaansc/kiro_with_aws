import { useEffect, useRef } from 'react';
import type { UseChatMessage } from '../hooks/useChat';
import type { CreateItemRequest, ImageAnalysisResponse } from '../types';
import { ExtractedInfoCard } from './ExtractedInfoCard';

interface ChatWindowProps {
  messages: UseChatMessage[];
  loading: boolean;
  onConfirm: (data: CreateItemRequest) => void;
  onEdit: (data: ImageAnalysisResponse['extractedData']) => void;
  onDismiss: (messageId: string) => void;
}

/**
 * ChatWindow - 스크롤 가능한 메시지 목록
 * - 사용자 메시지: 오른쪽 정렬
 * - 어시스턴트 메시지: 왼쪽 정렬
 * - 자동 스크롤 to bottom
 * - 이미지 분석 결과 시 ExtractedInfoCard 표시
 */
export function ChatWindow({
  messages,
  loading,
  onConfirm,
  onEdit,
  onDismiss,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change or loading state changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
      {messages.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">
            메시지를 입력하거나 이미지를 첨부해보세요.
          </p>
        </div>
      )}

      {messages.map((msg) => (
        <div key={msg.id}>
          <div
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white rounded-br-md'
                  : 'bg-gray-100 text-gray-900 rounded-bl-md'
              }`}
            >
              {msg.content}
            </div>
          </div>

          {/* 이미지 분석 결과 카드 표시 (Requirement 8.6) */}
          {msg.imageAnalysis && msg.imageAnalysis.success && (
            <div className="mt-2">
              <ExtractedInfoCard
                data={msg.imageAnalysis.extractedData}
                onConfirm={onConfirm}
                onEdit={() => onEdit(msg.imageAnalysis!.extractedData)}
                onDismiss={() => onDismiss(msg.id)}
              />
            </div>
          )}
        </div>
      ))}

      {loading && (
        <div className="flex justify-start">
          <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-2.5">
            <div className="flex space-x-1.5">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              <span
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: '0.15s' }}
              />
              <span
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: '0.3s' }}
              />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
