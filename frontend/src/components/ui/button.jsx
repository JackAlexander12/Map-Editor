import React from 'react';

const base =
  "inline-flex items-center justify-center rounded-md border text-sm font-medium " +
  "h-9 px-3 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50";

const variants = {
  default: "bg-[#646d72] border-[#646d72] text-white hover:bg-[#7a8489] focus:ring-[#7a8489]",
  primary: "bg-[#646d72] border-[#646d72] text-white hover:bg-[#7a8489] focus:ring-[#7a8489]",
  danger:  "bg-[#2b2b2b] border-[#2b2b2b] text-white hover:bg-[#3a3a3a] focus:ring-[#3a3a3a]",
  ghost:   "bg-transparent border-transparent text-white hover:bg-[#e86d00] focus:ring-[#ea6300]",

  // 🟧 Active (Mujin orange)
  white:   "bg-[#ea6300] border-[#ea6300] text-white " +
           "hover:bg-[#d55a00] focus:ring-[#ea6300]",
};

export default function Button({ as: Comp = 'button', variant = 'default', active = false, className = '', ...props }) {
  const v = active ? 'white' : variant;
  return <Comp className={`${base} ${variants[v]} ${className}`} {...props} />;
}




