import { Loader2 } from "lucide-react";

const PageLoader = () => {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        {/* App Logo/Branding */}
        <div className="text-2xl font-bold text-primary tracking-tight">
          Talo Yoga
        </div>
        
        {/* Loading Spinner */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading page...</span>
        </div>
        
        {/* Subtle loading animation */}
        <div className="flex gap-1 mt-2">
          <div className="w-2 h-2 bg-primary/30 rounded-full animate-pulse" style={{ animationDelay: "0ms" }}></div>
          <div className="w-2 h-2 bg-primary/30 rounded-full animate-pulse" style={{ animationDelay: "200ms" }}></div>
          <div className="w-2 h-2 bg-primary/30 rounded-full animate-pulse" style={{ animationDelay: "400ms" }}></div>
        </div>
      </div>
    </div>
  );
};

export default PageLoader;