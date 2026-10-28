import React from 'react';
import { useStore } from '../context/StoreContext';
import { ModuleKey } from '../types';
import { ShieldAlert, ArrowLeft, Lock, Store } from 'lucide-react';

interface AccessRestrictedViewProps {
  moduleName?: string;
  requiredAction?: string;
}

export const AccessRestrictedView: React.FC<AccessRestrictedViewProps> = ({
  moduleName,
  requiredAction = 'view',
}) => {
  const { currentUser, setActiveModule } = useStore();

  const formattedModuleName = moduleName
    ? moduleName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Requested';

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 mx-auto flex items-center justify-center text-red-600 shadow-2xs">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Access Restricted
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            You don't have permission to access this page.
          </p>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-left space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Active Account:</span>
            <span className="font-bold text-slate-800">{currentUser.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Assigned Role:</span>
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
              {currentUser.role}
            </span>
          </div>
          {moduleName && (
            <div className="flex items-center justify-between pt-1 border-t border-slate-200">
              <span className="text-slate-500 font-medium">Required Authorization:</span>
              <span className="font-mono text-[11px] font-semibold text-red-700">
                {formattedModuleName} · {requiredAction.toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <p className="text-[11px] text-slate-400">
          Only authorized staff roles can access this operational section. If you require access, please contact your Super Admin.
        </p>

        <div className="pt-2">
          <button
            onClick={() => setActiveModule('dashboard')}
            className="w-full py-3 px-4 bg-[#0c4a26] hover:bg-[#093a1d] text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};
