import { useEffect, useState } from 'react'
import { useI18n } from './i18n'
import { languageNames } from './i18n/messages'
import { haptic, isTelegram, openExternal, telegramUser } from './telegram'

const appName = import.meta.env.VITE_APP_NAME || 'Mini App'
const checkoutUrl = import.meta.env.VITE_CHECKOUT_URL

type InstallPromptEvent = Event & { prompt(): Promise<void> }

export default function App() {
  const { lang, t, setLang } = useI18n()
  const [count, setCount] = useState(0)
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)

  // Chrome/Android fire this when the PWA is installable; we show our own button instead of the mini-infobar.
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as InstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  const install = async () => {
    await installPrompt?.prompt()
    setInstallPrompt(null)
  }

  // Telegram requires Telegram Stars for digital goods sold inside a Mini App,
  // so the external checkout is offered on the web only.
  const showCheckout = Boolean(checkoutUrl) && !isTelegram

  return (
    <main className="app">
      <header>
        <h1>{appName}</h1>
        <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label={t.language}>
          {Object.entries(languageNames).map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
      </header>

      <section className="card">
        <h2>
          {t.greeting}
          {telegramUser?.first_name ? `, ${telegramUser.first_name}` : ''} 👋
        </h2>
        <p>{t.tagline}</p>
      </section>

      {/* Placeholder feature — replace this card with the real app. */}
      <section className="card">
        <p className="muted">{t.counter}</p>
        <p className="count">{count}</p>
        <button
          onClick={() => {
            haptic()
            setCount((c) => c + 1)
          }}
        >
          {t.tap}
        </button>
      </section>

      <footer>
        {installPrompt && (
          <button className="secondary" onClick={install}>
            {t.install}
          </button>
        )}
        {showCheckout && (
          <button className="secondary" onClick={() => openExternal(checkoutUrl)}>
            {t.upgrade}
          </button>
        )}
        <p className="muted">
          {t.openedIn}: {isTelegram ? 'Telegram' : 'Web'}
        </p>
      </footer>
    </main>
  )
}
