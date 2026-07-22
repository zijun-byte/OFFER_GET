import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    status: 'mock',
    questions: [
      '请用 1 分钟介绍一段与你目标岗位最相关的经历。',
      '这段经历中你遇到的最大难点是什么，你如何推进解决？',
    ],
  });
}
