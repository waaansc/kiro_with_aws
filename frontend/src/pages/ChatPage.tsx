import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../hooks/useChat';
import { ChatWindow } from '../components/ChatWindow';
import { MessageInput } from '../components/MessageInput';
import { ImageUpload } from '../components/ImageUpload';
import type { CreateItemRequest, ImageAnalysisResponse } from '../types';

export default function ChatPage() {
  const navigate = useNavigate();
  const {
    messages, loading, sendMessage, sendImage, confirmAction,
    sessions, activeSessionId, createNewSession, switchSession, deleteSession,
  } = useChat();

  const [showSessions, setShowSessions] = useState(false);

  const handleConfirm = useCallback(async (data: CreateItemRequest) => {
    try { await confirmAction(data); } catch {}
  }, [confirmAction]);

  const handleEdit = useCallback((extractedData: ImageAnalysisResponse['extractedData']) => {
    const params = new URLSearchParams();
    if (extractedData.name) params.set('name', extractedData.name);
    if (extractedData.category) params.set('category', extractedData.category);
    if (extractedData.expiryDate) params.set('expiryDate', extractedData.expiryDate);
    if (extractedData.brand) params.set('brand', extractedData.brand);
    navigate(`/items/new?${params.toString()}`);
  }, [navigate]);

  const handleDismiss = useCallback(() => {}, []);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] max-w-lg mx-auto">
      {/* Header */}
      <div className="px-5 pt-8 pb-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">채팅</h1>
          <p className="text-xs text-gray-400 mt-1">채팅으로 아이템을 등록하거나 조회하세요</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={createNewSession}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-900 hover:opacity-60"
            aria-label="새 대화"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={() => setShowSessions(!showSessions)}
            className={`min-w-[44px] min-h-[44px] flex items-center justify-center hover:opacity-60 ${showSessions ? 'text-gray-900' : 'text-gray-400'}`}
            aria-label="대화 목록"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </button>
        </div>
      </div>

      {/* 본문: 세션 목록 OR 대화 */}
      {showSessions ? (
        <div className="flex-1 overflow-y-auto px-5">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`flex items-center justify-between py-4 border-b border-gray-100 ${
                session.id === activeSessionId ? 'bg-gray-50 -mx-5 px-5' : ''
              }`}
            >
              <button
                onClick={() => { switchSession(session.id); setShowSessions(false); }}
                className="flex-1 text-left min-h-[44px]"
              >
                <p className={`text-sm ${session.id === activeSessionId ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                  {formatDate(session.createdAt)}
                </p>
                <p className="text-xs text-gray-400">{session.messageCount}개 메시지</p>
              </button>
              {sessions.length > 1 && (
                <button
                  onClick={() => deleteSession(session.id)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-300 hover:text-red-500"
                  aria-label="삭제"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <>
          <ChatWindow
            messages={messages}
            loading={loading}
            onConfirm={handleConfirm}
            onEdit={handleEdit}
            onDismiss={handleDismiss}
          />
          <div className="px-5 py-3 border-t border-gray-100 bg-white shrink-0">
            <div className="flex items-center gap-2">
              <ImageUpload onImageSelect={sendImage} disabled={loading} />
              <div className="flex-1">
                <MessageInput onSend={sendMessage} disabled={loading} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
