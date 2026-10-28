import type { Category } from "@/lib/audit/types";

/** Small, consistent line icons without an icon-library runtime. */
export function CategoryIcon({ category }: { category: Category }) {
  const paths: Record<Category, React.ReactNode> = {
    performance: (
      <>
        <path d="M4 17a9 9 0 1 1 16 0M12 12l4-4" />
        <circle cx="12" cy="12" r="1" />
      </>
    ),
    seo: (
      <>
        <circle cx="10" cy="10" r="6" />
        <path d="m15 15 5 5M7 10h6M10 7v6" />
      </>
    ),
    accessibility: (
      <>
        <circle cx="12" cy="4" r="2" />
        <path d="M4 8h16M12 7v6m0 0-4 7m4-7 4 7" />
      </>
    ),
    "best-practices": (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    security: (
      <>
        <path d="m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6l8-3Z" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
  };
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[category]}
    </svg>
  );
}
