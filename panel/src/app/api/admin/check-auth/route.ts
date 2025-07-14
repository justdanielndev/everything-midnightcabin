import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const slackUserId = cookieStore.get('slack_user_id')?.value;
    
    if (!slackUserId) {
      return NextResponse.json({ isAdmin: false }, { status: 401 });
    }

    const dataRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/data.json`);
    if (!dataRes.ok) {
      return NextResponse.json({ isAdmin: false }, { status: 500 });
    }

    const data = await dataRes.json();
    const adminIds = data['admin-slack-ids'] || [];
    
    const isAdmin = adminIds.includes(slackUserId);
    
    return NextResponse.json({ isAdmin });
  } catch (error) {
    console.error('Error checking admin auth:', error);
    return NextResponse.json({ isAdmin: false }, { status: 500 });
  }
}