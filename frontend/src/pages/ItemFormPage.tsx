import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ItemForm from '../components/ItemForm';
import type { CreateItemRequest, UpdateItemRequest } from '../types';
import { useItems } from '../hooks/useItems';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export default function ItemFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const mode = id ? 'edit' : 'create';

  const { createItem, updateItem, loading } = useItems();
  const [initialData, setInitialData] = useState<
    Partial<{
      name: string;
      category: 'gifticon' | 'food' | 'subscription' | 'other';
      subcategory: string;
      expiryDate: string;
      brand: string;
      memo: string;
    }>
  >();
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(mode === 'edit');

  useEffect(() => {
    if (mode === 'edit' && id) {
      setLoadingDetail(true);
      fetch(`${API_BASE_URL}/items/${id}`)
        .then(async (res) => {
          if (!res.ok) {
            throw new Error('아이템을 불러올 수 없습니다.');
          }
          return res.json();
        })
        .then((data) => {
          setInitialData({
            name: data.name,
            category: data.category,
            subcategory: data.subcategory ?? '',
            expiryDate: data.expiryDate,
            brand: data.brand ?? '',
            memo: data.memo ?? '',
          });
        })
        .catch((err) => {
          setFetchError(
            err instanceof Error ? err.message : '데이터를 불러올 수 없습니다.',
          );
        })
        .finally(() => {
          setLoadingDetail(false);
        });
    }
  }, [mode, id]);

  async function handleSubmit(
    data: CreateItemRequest | UpdateItemRequest,
  ): Promise<void> {
    if (mode === 'create') {
      await createItem(data as CreateItemRequest);
    } else if (id) {
      await updateItem(id, data as UpdateItemRequest);
    }
    navigate('/');
  }

  function handleCancel() {
    navigate('/');
  }

  if (loadingDetail) {
    return (
      <div className="p-4 text-center text-gray-500">
        데이터를 불러오는 중...
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="p-4 text-center text-red-600">
        <p>{fetchError}</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-4 min-h-[44px] px-6 bg-gray-200 text-gray-700 rounded-lg text-[14px] font-medium"
        >
          돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-xl font-bold p-4 pb-0">
        {mode === 'create' ? '아이템 등록' : '아이템 수정'}
      </h1>
      <ItemForm
        mode={mode}
        initialData={initialData}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        loading={loading}
      />
    </div>
  );
}
