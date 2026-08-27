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

export function ChatWindow({
  messages,
  loading,
  onConfirm,
  onEdit,
  onDismiss,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
      {messages.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-300 text-sm">
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
              className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {msg.content}
            </div>
          </div>

          {msg.imageAnalysis && msg.imageAnalysis.success && (
            <div className="mt-3">
              <ExtractedInfoCard
                data={msg.imageAnalysis.extractedData}
                imageBase64={msg.imageBase64}
                imageContentType={msg.imageContentType}
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
          <div className="bg-gray-100 rounded-lg px-4 py-3">
            <div className="flex space-x-1.5">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
