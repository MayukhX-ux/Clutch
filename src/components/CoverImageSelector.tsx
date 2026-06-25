import React from 'react';
import { X, Image as ImageIcon } from 'lucide-react';

interface CoverImageSelectorProps {
  onSelect: (cover: string | null) => void;
  onClose: () => void;
}

export const COVER_PRESETS = [
  { name: 'Sunset Glow', value: 'linear-gradient(135deg, #f59e0b, #ef4444, #ec4899)' },
  { name: 'Emerald Forest', value: 'linear-gradient(135deg, #10b981, #059669, #064e3b)' },
  { name: 'Nordic Frost', value: 'linear-gradient(135deg, #a5f3fc, #0ea5e9, #1e3a8a)' },
  { name: 'Cosmic Lavender', value: 'linear-gradient(135deg, #c084fc, #818cf8, #4f46e5)' },
  { name: 'Cyberpunk Neon', value: 'linear-gradient(135deg, #f472b6, #a855f7, #3b82f6)' },
  { name: 'Warm Terrazzo', value: 'linear-gradient(135deg, #ffedd5, #fed7aa, #fdba74)' },
  { name: 'Minimal Charcoal', value: 'linear-gradient(135deg, #1f2937, #111827, #030712)' },
  { name: 'Aurora Borealis', value: 'linear-gradient(135deg, #34d399, #3b82f6, #8b5cf6)' },
  { name: 'Desert Dune', value: 'linear-gradient(135deg, #fde047, #eab308, #ca8a04)' },
];

export default function CoverImageSelector({ onSelect, onClose }: CoverImageSelectorProps) {
  return (
    <div className="absolute top-12 right-0 z-40 w-80 bg-[#ffffff] dark:bg-[#191919] border border-[#e9e9e7] dark:border-[#2c2c2c] rounded-[4px] shadow-2xl p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#e9e9e7] dark:border-[#2c2c2c]">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#37352f] dark:text-[#ebebea] uppercase tracking-wider">
          <ImageIcon className="w-4 h-4 text-[#37352f] dark:text-[#ebebea]" />
          <span>Choose Cover Preset</span>
        </div>
        <button
          id="cover-selector-close"
          onClick={onClose}
          className="p-1 hover:bg-[#efefee] dark:hover:bg-[#2f2f2f] rounded text-[#91918e] hover:text-[#37352f] dark:hover:text-[#ebebea] transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Grid of presets */}
      <div className="grid grid-cols-3 gap-2">
        {COVER_PRESETS.map((preset) => (
          <button
            key={preset.name}
            id={`cover-preset-${preset.name.toLowerCase().replace(/ /g, '-')}`}
            onClick={() => {
              onSelect(preset.value);
              onClose();
            }}
            className="group relative h-14 rounded overflow-hidden border border-[#e9e9e7] dark:border-[#2c2c2c] hover:border-[#37352f] dark:hover:border-[#ebebea] transition-all flex flex-col items-stretch text-left shadow-sm"
          >
            <div
              className="flex-1 transition-transform group-hover:scale-105 duration-300"
              style={{ background: preset.value }}
            />
            <div className="bg-[#fbfbfa] dark:bg-[#202020] px-1.5 py-1 text-[9px] font-medium text-[#5f5e5b] dark:text-[#9b9a97] truncate text-center">
              {preset.name}
            </div>
          </button>
        ))}
      </div>

      {/* Reset options */}
      <div className="mt-4 pt-3 border-t border-[#e9e9e7] dark:border-[#2c2c2c] flex items-center justify-end gap-2">
        <button
          id="cover-preset-remove"
          onClick={() => {
            onSelect(null);
            onClose();
          }}
          className="px-3 py-1.5 text-xs font-semibold border border-[#e9e9e7] dark:border-[#2c2c2c] bg-[#efefee] dark:bg-[#2f2f2f] hover:bg-[#e5e5e4] dark:hover:bg-[#3f3f3e] rounded text-[#37352f] dark:text-[#ebebea] transition-colors"
        >
          Remove cover
        </button>
      </div>
    </div>
  );
}
