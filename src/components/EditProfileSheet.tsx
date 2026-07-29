'use client';

import { useRef, useState } from 'react';
import { useSession } from '@/lib/session';
import { Avatar } from './ui';

/**
 * Name and picture. Deliberately short: Inifini has no public profiles to
 * browse, so there is nothing here to perform for.
 */
export default function EditProfileSheet({ onClose }: { onClose: () => void }) {
  const { me, updateProfile } = useSession();
  const [name, setName] = useState(me?.display_name ?? '');
  const [preview, setPreview] = useState<string | null>(me?.avatar_url ?? null);
  const [file, setFile] = useState<File | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { setErr('Choose an image file.'); return; }
    setErr(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const clearPicture = () => { setFile(null); setPreview(null); setErr(null); };

  const save = async () => {
    setSaving(true); setErr(null);
    const { error } = await updateProfile({
      displayName: name.trim() || me?.username,
      ...(file !== undefined ? { avatarFile: file } : {}),
    });
    setSaving(false);
    if (error) { setErr(error); return; }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[65] flex items-end" role="dialog" aria-modal="true" aria-label="Edit profile">
      <button className="absolute inset-0 bg-ink/50" onClick={onClose} aria-label="Close" />
      <div className="relative w-full rounded-t-2xl bg-paper px-5 pb-9 pt-3">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-rule" />
        <h2 className="font-serif text-[20px] font-bold">Edit profile</h2>

        <div className="mt-5 flex flex-col items-center">
          <button onClick={() => inputRef.current?.click()} className="relative" aria-label="Change picture">
            <Avatar name={me?.display_name || me?.username || 'You'} size={96} src={preview} />
            <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-paper bg-accent text-paper">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7h3l2-2h6l2 2h3v12H4z" /><circle cx="12" cy="12.5" r="3.2" />
              </svg>
            </span>
          </button>
          <input ref={inputRef} type="file" accept="image/*" onChange={pick} className="hidden" />

          <div className="mt-2 flex gap-4 text-[13px]">
            <button onClick={() => inputRef.current?.click()} className="font-medium text-accent">Change picture</button>
            {preview && <button onClick={clearPicture} className="text-muted">Remove</button>}
          </div>
        </div>

        <label htmlFor="display-name" className="mt-6 block text-[13px] font-medium">Name</label>
        <input
          id="display-name"
          value={name}
          onChange={(e) => { setName(e.target.value); setErr(null); }}
          maxLength={40}
          placeholder={me?.username}
          className="mt-1.5 w-full rounded-lg border border-rule bg-white px-4 py-3 outline-none focus:border-accent"
        />
        <p className="mt-1.5 text-[12px] text-muted">@{me?.username} stays the same, so friends can still find you.</p>

        {err && <p className="mt-3 text-[13px] text-accent">{err}</p>}

        <button
          onClick={save}
          disabled={saving}
          className="mt-5 w-full rounded-lg bg-ink py-3.5 font-semibold text-paper disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onClose} className="mt-2 w-full py-2.5 text-[14px] font-medium text-muted">Cancel</button>
      </div>
    </div>
  );
}
