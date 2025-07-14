import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-900 via-red-800 to-red-900">
      <div className="max-w-md w-full mx-auto p-8 bg-card/50 backdrop-blur-sm rounded-lg border border-border/20 shadow-2xl">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <AlertCircle className="h-16 w-16 text-red-500" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              Access Denied
            </h1>
            <p className="text-muted-foreground">
              You are not authorized to access this platform. 
              Please contact the event organizers if you believe this is an error.
            </p>
          </div>
          
          <div className="space-y-4">
            <Link href={process.env.NEXT_PUBLIC_BASE_URL || "/"}>
              <Button variant="outline" className="w-full">
                Back to Home
              </Button>
            </Link>
            
            <p className="text-sm text-muted-foreground">
              Only registered participants can access this platform.
              If you think you should have access, please reach out to the organizers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}