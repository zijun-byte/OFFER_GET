import { NextResponse } from 'next/server';
import { readAgentRunLogs } from '../../../../lib/ai/runLog';

export async function GET() {
  return NextResponse.json({ logs: await readAgentRunLogs() });
}
