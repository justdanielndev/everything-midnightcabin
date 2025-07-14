'use client';

import { Button } from "@/components/ui/button";
import { Slack } from "lucide-react";

export function SlackLoginButton() {
  return (
    <Button 
      className="w-full h-12 text-sm font-medium bg-[#7d82b8] hover:bg-[#7d82b8]/80 text-white border-0 rounded-xl transition-all cursor-pointer shadow-lg hover:shadow-[#7d82b8]/25"
      onClick={() => window.location.href = '/api/auth/slack'}
    >
      <Slack className="mr-0.5 h-7 w-7" />
      Continue with Slack
    </Button>
  );
}