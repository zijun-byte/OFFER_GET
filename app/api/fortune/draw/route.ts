import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    status: 'mock',
    card: {
      name: 'The Builder',
      reading: '先把一个核心流程跑通，再扩展更多模块。',
    },
  });
}
