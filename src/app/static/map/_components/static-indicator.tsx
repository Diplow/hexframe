import { Info } from "lucide-react";

export function StaticIndicator() {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="flex items-center gap-2 rounded-lg bg-link-100 px-4 py-2 shadow-lg border border-link-200">
        <Info className="h-5 w-5 text-link-600" />
        <div className="text-sm">
          <p className="font-medium text-link-900">Static Mode</p>
          <p className="text-link-700">No JavaScript required</p>
        </div>
      </div>
    </div>
  );
}