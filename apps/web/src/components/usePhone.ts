import React from "react";

/** Phones: narrower than Tailwind's `sm` (640 px), where cards are bottom sheets and the header a bar. */
const PHONE = "(max-width: 639px)";

/** Whether the screen is phone-sized, following resizes and rotation. */
export function usePhone(): boolean {
  const [phone, setPhone] = React.useState(
    () => window.matchMedia(PHONE).matches,
  );
  React.useEffect(() => {
    const m = window.matchMedia(PHONE);
    const onChange = () => setPhone(m.matches);
    m.addEventListener("change", onChange);
    return () => m.removeEventListener("change", onChange);
  }, []);
  return phone;
}
