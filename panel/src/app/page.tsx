import { SlackLoginButton } from "@/components/slack-login-button";
import { AlertCircle } from "lucide-react";
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const cookieStore = await cookies();
  const slackUserId = cookieStore.get('slack_user_id')?.value;
  
  if (slackUserId) {
    redirect('/dashboard');
  }
  
  const params = await searchParams;
  const error = params.error;
  
  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'access_denied':
        return 'You cancelled the login process. Please try again.';
      case 'invalid_scope_requested':
        return 'The requested permissions are invalid. Please contact support.';
      case 'missing_code':
        return 'Authentication failed. Please try again.';
      case 'token_exchange_failed':
        return 'Failed to exchange authorization code. Please try again.';
      case 'user_info_failed':
        return 'Could not retrieve user information. Please try again.';
      case 'auth_failed':
        return 'Authentication failed. Please try again.';
      default:
        return 'An error occurred during login. Please try again.';
    }
  };
  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900"></div>
      
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.02)_1px,transparent_0)] bg-[length:50px_50px]"></div>
      
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-2xl border border-zinc-700/50 mr-4">
                <img
                  src="/mcab.svg"
                  alt="Midnight Cabin Logo"
                  className="w-12 h-12 p-1.5"
                />
              </div>
              <h1 className="text-3xl font-bold text-white cursor-default">
                Midnight Cabin
              </h1>
            </div>
          </div>
          
          <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-8 shadow-2xl">
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold text-white cursor-default">
                  Welcome Back!
                </h2>
                <p className="text-zinc-400 text-sm cursor-default">
                  Please sign in with your Hack Club Slack account to continue.
                </p>
              </div>
              
              {error && (
                <div className="flex items-center space-x-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-400">{getErrorMessage(error)}</p>
                </div>
              )}
              
              <SlackLoginButton />
              
              <div className="text-center">
                <p className="text-xs text-zinc-500 cursor-default">
                  Note: You can only log in if you were invited to the event!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
