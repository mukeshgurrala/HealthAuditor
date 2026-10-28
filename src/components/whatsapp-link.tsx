/** Set NEXT_PUBLIC_WHATSAPP_NUMBER to receive enquiries; otherwise share the tool. */
export function WhatsAppLink() {
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "");
  const configured = phone && /^[1-9]\d{6,14}$/.test(phone);
  const href = configured
    ? `https://wa.me/${phone}?text=${encodeURIComponent("Hi! I'd like to know more about HealthAuditor.")}`
    : `https://wa.me/?text=${encodeURIComponent("Check your website's health with HealthAuditor — a practical tool for performance, SEO, accessibility and security audits.")}`;
  return (
    <a
      className="tactile whatsapp-button"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <path d="M21 11.5a9 9 0 0 1-13.4 7.8L3 21l1.7-4.6A9 9 0 1 1 21 11.5Z" />
        <path d="M8 7c0 5 4 9 9 9l1-3-3-1-1 1c-1.4-.6-2.4-1.6-3-3l1-1-1-3-3 1Z" />
      </svg>
      {configured ? "WhatsApp" : "Share on WhatsApp"}
      <span aria-hidden="true">↗</span>
    </a>
  );
}
