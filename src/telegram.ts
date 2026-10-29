// Thin wrapper around the Telegram Mini App SDK loaded in index.html.
// Everything degrades to plain-web behaviour when the app is opened in a normal browser.

type TelegramWebApp = {
  initData: string
  initDataUnsafe: { user?: { first_name?: string; language_code?: string } }
  colorScheme: 'light' | 'dark'
  ready(): void
  expand(): void
  openLink(url: string): void
  HapticFeedback?: { impactOccurred(style: 'light' | 'medium' | 'heavy'): void }
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp }
  }
}

const webApp = window.Telegram?.WebApp

// initData is only filled in when Telegram actually launched the app.
export const isTelegram = Boolean(webApp?.initData)

export const telegramUser = isTelegram ? webApp?.initDataUnsafe.user : undefined

export function initTelegram() {
  if (!isTelegram || !webApp) return
  webApp.ready()
  webApp.expand()
  document.documentElement.dataset.theme = webApp.colorScheme
}

export function openExternal(url: string) {
  if (isTelegram && webApp) webApp.openLink(url)
  else window.open(url, '_blank', 'noopener')
}

export function haptic() {
  webApp?.HapticFeedback?.impactOccurred('light')
}
