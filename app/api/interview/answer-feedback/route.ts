import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    status: 'mock',
    feedback: {
      summary: '回答结构清晰度尚可，后续可补充更具体的行动和量化结果。',
      suggestions: ['补充场景背景', '明确你的个人动作', '用数据或结果收尾'],
    },
  });
}
