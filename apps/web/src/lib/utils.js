import { clsx } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"
import typographyRoles from "./typography-roles.json"

const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: typographyRoles }] } },
})

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 


export const isIframe = window.self !== window.top;
