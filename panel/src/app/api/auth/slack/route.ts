import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.SLACK_CLIENT_ID;
  const redirectUri = process.env.SLACK_REDIRECT_URI;
  
  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: 'Slack configuration missing' }, { status: 500 });
  }
  
  const userScopes = 'identity.basic,identity.email,identity.team';
  const botScopes = 'app_mentions:read,chat:write,commands';
  const state = Math.random().toString(36).substring(2, 15);
  
  const authUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${botScopes}&user_scope=${userScopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  
  return NextResponse.redirect(authUrl);
}