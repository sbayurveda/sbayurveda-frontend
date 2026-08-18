// Indian phone number input accepts a plain 10-digit number, or one of three
// recognized prefixes (0, +91, 0091) — each caps the input at a different
// total length so a mistaken extra keystroke gets rejected outright instead
// of silently shifting which digit gets dropped.
export function capPhoneInput(raw) {
  const hasPlus = raw.trim().startsWith("+");
  const digitsOnly = raw.replace(/\D/g, "");
  let maxDigits = 10;
  if (hasPlus && digitsOnly.startsWith("91")) maxDigits = 12; // +91 + 10 digits
  else if (!hasPlus && digitsOnly.startsWith("0091")) maxDigits = 14; // 0091 + 10 digits
  else if (!hasPlus && digitsOnly.startsWith("0")) maxDigits = 11; // 0 + 10 digits
  const capped = digitsOnly.slice(0, maxDigits);
  return hasPlus ? `+${capped}` : capped;
}

// Strips whichever recognized prefix was used down to the real 10-digit
// number, for validation and for whatever we actually send to the order.
export function cleanPhone(raw) {
  return raw.replace(/\D/g, "").slice(-10);
}
