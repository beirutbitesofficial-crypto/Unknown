import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeLebanesePhone(phone: string) {
  const value = phone.replace(/[\s()-]/g, "");
  if (value.startsWith("+961")) return value;
  if (value.startsWith("00961")) return `+961${value.slice(5)}`;
  if (value.startsWith("0")) return `+961${value.slice(1)}`;
  return value;
}
