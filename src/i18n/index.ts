import { useState } from 'react'
import { messages, type Messages } from './messages'
import { telegramUser } from '../telegram'

const STORAGE_KEY = 'lang'

function readSaved(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

// Priority: user's saved choice → Telegram account language → browser language → English.
function detectLanguage(): string {
  const candidates = [readSaved(), telegramUser?.language_code, ...navigator.languages]
  for (const tag of candidates) {
    const base = tag?.toLowerCase().split('-')[0]
    if (base && base in messages) return base
  }
  return 'en'
}

export function useI18n(): { lang: string; t: Messages; setLang: (lang: string) => void } {
  const [lang, setLangState] = useState(detectLanguage)

  const setLang = (next: string) => {
    setLangState(next)
    document.documentElement.lang = next
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Storage can be blocked (private mode, some webviews); the choice just won't persist.
    }
  }

  return { lang, t: messages[lang], setLang }
}
