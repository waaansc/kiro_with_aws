/**
 * 로컬 개발 서버
 * Lambda 핸들러를 Express로 감싸서 로컬에서 테스트 가능하게 합니다.
 * DynamoDB 대신 인메모리 저장소를 사용합니다.
 */
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '15mb' }));

// === 인메모리 저장소 ===
interface Item {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  expiryDate: string;
  brand?: string;
  memo?: string;
  imageUrl?: string;
  createdAt: string;
  isArchived: boolean;
}

let items: Item[] = [
  {
    id: uuidv4(),
    name: '스타벅스 아메리카노',
    category: 'gifticon',
    expiryDate: '2025-08-15',
    brand: '스타벅스',
    memo: '생일 선물',
    createdAt: new Date().toISOString(),
    isArchived: false,
  },
  {
    id: uuidv4(),
    name: '서울우유 1L',
    category: 'food',
    subcategory: '냉장',
    expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    isArchived: false,
  },
  {
    id: uuidv4(),
    name: '넷플릭스 구독',
    category: 'subscription',
    subcategory: '구독 서비스',
    expiryDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    brand: '넷플릭스',
    createdAt: new Date().toISOString(),
    isArchived: false,
  },
  {
    id: uuidv4(),
    name: '투썸플레이스 케이크',
    category: 'gifticon',
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    brand: '투썸플레이스',
    createdAt: new Date().toISOString(),
    isArchived: false,
  },
  {
    id: uuidv4(),
    name: '계란 10구',
    category: 'food',
    subcategory: '냉장',
    expiryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    isArchived: false,
  },
];

// === D-day 계산 ===
function calculateDday(expiryDate: string): number {
  const expiry = new Date(expiryDate);
  const now = new Date();
  expiry.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// === Items CRUD ===

// GET /api/items
app.get('/api/items', (req, res) => {
  const { category, archived } = req.query;
  const isArchived = archived === 'true';

  let filtered = items.filter((i) => i.isArchived === isArchived);
  if (category) {
    filtered = filtered.filter((i) => i.category === category);
  }

  const summaries = filtered.map((i) => ({
    id: i.id,
    name: i.name,
    category: i.category,
    expiryDate: i.expiryDate,
    dday: calculateDday(i.expiryDate),
    brand: i.brand,
    imageUrl: i.imageUrl,
  }));

  // 정렬: 비만료 먼저 (dday 오름차순), 만료는 뒤에
  summaries.sort((a, b) => {
    if (a.dday >= 0 && b.dday < 0) return -1;
    if (a.dday < 0 && b.dday >= 0) return 1;
    return a.dday - b.dday;
  });

  res.json({ items: summaries, count: summaries.length });
});

// GET /api/items/:id
app.get('/api/items/:id', (req, res) => {
  const item = items.find((i) => i.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'NOT_FOUND', message: '아이템을 찾을 수 없습니다.' });
  }
  res.json({ ...item, dday: calculateDday(item.expiryDate) });
});

// POST /api/items
app.post('/api/items', (req, res) => {
  const { name, category, subcategory, expiryDate, brand, memo } = req.body;

  // 유효성 검증
  const errors: string[] = [];
  if (!name || name.trim().length === 0) errors.push('이름은 필수 항목입니다.');
  else if (name.trim().length > 50) errors.push('이름은 50자 이하여야 합니다.');
  if (!category) errors.push('카테고리는 필수 항목입니다.');
  if (!expiryDate) errors.push('만료일은 필수 항목입니다.');

  if (errors.length > 0) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: '유효성 검증 실패', details: errors });
  }

  const newItem: Item = {
    id: uuidv4(),
    name: name.trim(),
    category,
    subcategory,
    expiryDate,
    brand,
    memo,
    createdAt: new Date().toISOString(),
    isArchived: false,
  };

  items.push(newItem);
  res.status(201).json(newItem);
});

// PUT /api/items/:id
app.put('/api/items/:id', (req, res) => {
  const idx = items.findIndex((i) => i.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'NOT_FOUND', message: '아이템을 찾을 수 없습니다.' });
  }

  const body = req.body;
  const item = items[idx];

  if (body.name !== undefined) item.name = body.name.trim();
  if (body.category !== undefined) item.category = body.category;
  if (body.subcategory !== undefined) item.subcategory = body.subcategory;
  if (body.expiryDate !== undefined) item.expiryDate = body.expiryDate;
  if (body.brand !== undefined) item.brand = body.brand;
  if (body.memo !== undefined) item.memo = body.memo;

  const isPast = calculateDday(item.expiryDate) < 0;

  res.json({
    ...item,
    message: '아이템이 성공적으로 수정되었습니다.',
    ...(isPast && { warning: '만료일이 과거 날짜입니다. 저장은 허용되었습니다.' }),
  });
});

// DELETE /api/items/:id
app.delete('/api/items/:id', (req, res) => {
  const idx = items.findIndex((i) => i.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'NOT_FOUND', message: '해당 아이템을 찾을 수 없습니다.' });
  }
  items.splice(idx, 1);
  res.json({ message: '아이템이 삭제되었습니다.' });
});

// POST /api/items/archive-expired
app.post('/api/items/archive-expired', (_req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let count = 0;

  items.forEach((item) => {
    if (!item.isArchived) {
      const expiry = new Date(item.expiryDate);
      expiry.setHours(0, 0, 0, 0);
      if (expiry < today) {
        item.isArchived = true;
        count++;
      }
    }
  });

  res.json({ message: `${count}개의 만료된 아이템이 아카이브되었습니다.`, archivedCount: count });
});

// PATCH /api/items/:id/restore
app.patch('/api/items/:id/restore', (req, res) => {
  const item = items.find((i) => i.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'NOT_FOUND', message: '아이템을 찾을 수 없습니다.' });
  }
  item.isArchived = false;
  res.json({ message: '아이템이 복원되었습니다.', item });
});

// === Chat API (간단 시뮬레이션) ===
app.post('/api/chat', (req, res) => {
  const { message } = req.body;
  if (!message || message.trim().length === 0) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: '메시지가 비어있습니다.' });
  }

  const msg = message.toLowerCase();

  // 간단한 키워드 기반 의도 분석 (Bedrock 없이)
  if (msg.includes('등록') || msg.includes('추가')) {
    res.json({
      message: '아이템을 등록하시려면 이름, 카테고리(기프티콘/식재료/정기결제/기타), 만료일을 알려주세요.\n예: "스타벅스 아메리카노 기프티콘 2025-12-31"',
      action: { type: 'create' },
    });
  } else if (msg.includes('목록') || msg.includes('조회') || msg.includes('보여')) {
    const activeItems = items.filter((i) => !i.isArchived);
    const summaries = activeItems.slice(0, 10).map((i) => ({
      id: i.id,
      name: i.name,
      category: i.category,
      expiryDate: i.expiryDate,
      dday: calculateDday(i.expiryDate),
      brand: i.brand,
    }));
    const list = summaries.map((i) => `• ${i.name} (D${i.dday >= 0 ? '-' : '+'}${Math.abs(i.dday)})`).join('\n');
    res.json({
      message: `총 ${summaries.length}개의 아이템:\n${list}`,
      action: { type: 'list' },
      items: summaries,
    });
  } else if (msg.includes('삭제')) {
    res.json({
      message: '삭제할 아이템의 이름을 알려주세요.',
      action: { type: 'delete' },
    });
  } else {
    res.json({
      message: '다음과 같은 명령을 시도해보세요:\n- "아이템 목록 보여줘"\n- "스타벅스 기프티콘 등록해줘"\n- "스타벅스 쿠폰 삭제해줘"',
    });
  }
});

// === Image Analysis (간단 시뮬레이션) ===
app.post('/api/chat/image', (req, res) => {
  const { imageBase64, imageContentType } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: '이미지 데이터가 필요합니다.' });
  }

  // Bedrock 없이 모의 응답 반환
  res.json({
    success: true,
    imageType: 'gifticon',
    extractedData: {
      name: '아이스 아메리카노',
      brand: '스타벅스',
      expiryDate: '2025-09-30',
      category: 'gifticon',
      subcategory: '카페',
    },
    confidence: 0.85,
    message: '이미지 분석이 완료되었습니다. 추출된 정보를 확인해주세요.',
  });
});

// === Location API (간단 시뮬레이션) ===
app.get('/api/locations/:brand', (req, res) => {
  const brand = decodeURIComponent(req.params.brand);
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: '위치 정보가 필요합니다.',
      details: ['lat, lng 파라미터가 필요합니다.'],
    });
  }

  // 모의 매장 데이터
  const mockStores = [
    { name: `${brand} 강남점`, address: '서울 강남구 테헤란로 123', lat: 37.4979, lng: 127.0276, distance: 0.8, phone: '02-1234-5678' },
    { name: `${brand} 역삼점`, address: '서울 강남구 역삼로 456', lat: 37.5013, lng: 127.0396, distance: 1.5, phone: '02-2345-6789' },
    { name: `${brand} 선릉점`, address: '서울 강남구 선릉로 789', lat: 37.5047, lng: 127.0490, distance: 2.3 },
  ];

  res.json({ stores: mockStores, count: mockStores.length });
});

// === 서버 시작 ===
app.listen(PORT, () => {
  console.log(`\n🚀 로컬 백엔드 서버 실행 중: http://localhost:${PORT}`);
  console.log(`\n📋 사용 가능한 엔드포인트:`);
  console.log(`   GET    http://localhost:${PORT}/api/items`);
  console.log(`   GET    http://localhost:${PORT}/api/items/:id`);
  console.log(`   POST   http://localhost:${PORT}/api/items`);
  console.log(`   PUT    http://localhost:${PORT}/api/items/:id`);
  console.log(`   DELETE  http://localhost:${PORT}/api/items/:id`);
  console.log(`   POST   http://localhost:${PORT}/api/items/archive-expired`);
  console.log(`   PATCH  http://localhost:${PORT}/api/items/:id/restore`);
  console.log(`   POST   http://localhost:${PORT}/api/chat`);
  console.log(`   POST   http://localhost:${PORT}/api/chat/image`);
  console.log(`   GET    http://localhost:${PORT}/api/locations/:brand`);
  console.log(`\n📦 샘플 데이터 ${items.length}개 로드됨`);
  console.log(`\n💡 프론트엔드와 연결하려면 frontend/.env.local에 다음을 추가하세요:`);
  console.log(`   VITE_API_BASE_URL=http://localhost:${PORT}/api\n`);
});
