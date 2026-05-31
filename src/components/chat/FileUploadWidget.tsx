'use client';

import { useRef, useState } from 'react';
import { Upload, FileText, CheckCircle } from 'lucide-react';
import { formatFileSize } from '@/lib/utils';
import { motion } from 'framer-motion';

interface FileUploadWidgetProps {
  onUpload: (file: File) => void;
  allowedExtensions?: string;
  maxSizeMb?: number;
}

export default function FileUploadWidget({
  onUpload,
  allowedExtensions = '',
  maxSizeMb = 5,
}: FileUploadWidgetProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [uploaded, setUploaded] = useState(false);

  const extensions = allowedExtensions
    ? allowedExtensions.split(',').map((e) => e.trim())
    : [];

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');

    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`حجم فایل نباید بیشتر از ${maxSizeMb} مگابایت باشد`);
      return;
    }

    if (extensions.length > 0) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!extensions.includes(ext)) {
        setError(`فقط فایل‌های ${extensions.join('، ')} مجاز هستند`);
        return;
      }
    }

    setSelected(file);
  }

  function handleSubmit() {
    if (!selected) return;
    onUpload(selected);
    setUploaded(true);
  }

  if (uploaded) {
    return (
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm mr-10"
        style={{ backgroundColor: '#22c55e18', borderColor: '#22c55e', border: '1px solid' }}
      >
        <CheckCircle size={16} className="text-green-500" />
        <span className="text-green-700">پروژه با موفقیت ارسال شد!</span>
      </div>
    );
  }

  return (
    <div className="mr-10 space-y-2">
      <div
        className="border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer hover:bg-[var(--color-muted)] transition-colors"
        style={{ borderColor: 'var(--color-border)' }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleChange}
          accept={extensions.length > 0 ? extensions.join(',') : undefined}
        />
        <Upload size={24} className="mx-auto mb-2" style={{ color: 'var(--color-muted-foreground)' }} />
        <p className="text-sm font-medium">کلیک کنید یا فایل را بکشید اینجا</p>
        {extensions.length > 0 && (
          <p className="text-xs mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
            فرمت‌های مجاز: {extensions.join('، ')} — حداکثر {maxSizeMb} مگابایت
          </p>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {selected && !error && (
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--color-muted)' }}>
          <FileText size={16} style={{ color: '#6c63ff' }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selected.name}</p>
            <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
              {formatFileSize(selected.size)}
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleSubmit}
            className="px-4 py-1.5 rounded-xl text-white text-xs font-bold"
            style={{ backgroundColor: '#6c63ff' }}
          >
            ارسال
          </motion.button>
        </div>
      )}
    </div>
  );
}
