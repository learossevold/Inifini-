import Image from 'next/image';

/** Inifini brand mark — the navy "iF" monogram. */
export default function Logo({ size = 30 }: { size?: number }) {
  return (
    <Image
      src="/icon-192.png"
      alt="Inifini"
      width={size}
      height={size}
      priority
      className="rounded-[22%]"
    />
  );
}
