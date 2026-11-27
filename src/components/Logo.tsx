import Image from "next/image";
import Link from "next/link";

/** HiProTech wordmark (public/hiprotech-logo.png, 1928×300). */
export function Logo({ href = "/", height = 28, className = "" }: { href?: string; height?: number; className?: string }) {
  return (
    <Link href={href} className={`inline-flex shrink-0 items-center ${className}`} aria-label="HiProTech home">
      <Image
        src="/hiprotech-logo.png"
        alt="HiProTech"
        width={1928}
        height={300}
        preload
        style={{ height, width: "auto" }}
      />
    </Link>
  );
}
