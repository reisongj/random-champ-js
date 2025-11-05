import { useState, ReactNode } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
}

export default function Tooltip({ content, children }: TooltipProps) {
  const [show, setShow] = useState(false);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className="absolute left-full ml-2 top-0 z-50 bg-slate-900 text-slate-50 px-3 py-2 rounded-md text-xs whitespace-pre-line border border-slate-700 max-w-xs shadow-lg">
          {content}
        </div>
      )}
    </div>
  );
}

