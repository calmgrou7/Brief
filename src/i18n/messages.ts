// Add a language: copy the `en` block, translate it, and add it to `messages`.
const en = {
  greeting: 'Hello',
  tagline: 'A simple app that works in your browser and inside Telegram.',
  counter: 'Tap count',
  tap: 'Tap',
  install: 'Install app',
  upgrade: 'Get Pro',
  language: 'Language',
  openedIn: 'Opened in',
}

export type Messages = typeof en

export const messages: Record<string, Messages> = {
  en,
  ko: {
    greeting: '안녕하세요',
    tagline: '브라우저와 텔레그램 어디서나 쓸 수 있는 간단한 앱입니다.',
    counter: '탭 횟수',
    tap: '탭',
    install: '앱 설치',
    upgrade: 'Pro 구매',
    language: '언어',
    openedIn: '실행 환경',
  },
  es: {
    greeting: 'Hola',
    tagline: 'Una app sencilla que funciona en tu navegador y dentro de Telegram.',
    counter: 'Toques',
    tap: 'Tocar',
    install: 'Instalar app',
    upgrade: 'Obtener Pro',
    language: 'Idioma',
    openedIn: 'Abierto en',
  },
  pt: {
    greeting: 'Olá',
    tagline: 'Um app simples que funciona no navegador e dentro do Telegram.',
    counter: 'Toques',
    tap: 'Tocar',
    install: 'Instalar app',
    upgrade: 'Obter Pro',
    language: 'Idioma',
    openedIn: 'Aberto em',
  },
  ru: {
    greeting: 'Привет',
    tagline: 'Простое приложение для браузера и Telegram.',
    counter: 'Нажатий',
    tap: 'Нажать',
    install: 'Установить',
    upgrade: 'Получить Pro',
    language: 'Язык',
    openedIn: 'Открыто в',
  },
  id: {
    greeting: 'Halo',
    tagline: 'Aplikasi sederhana yang berjalan di browser dan di dalam Telegram.',
    counter: 'Jumlah ketukan',
    tap: 'Ketuk',
    install: 'Pasang aplikasi',
    upgrade: 'Dapatkan Pro',
    language: 'Bahasa',
    openedIn: 'Dibuka di',
  },
}

export const languageNames: Record<string, string> = {
  en: 'English',
  ko: '한국어',
  es: 'Español',
  pt: 'Português',
  ru: 'Русский',
  id: 'Bahasa Indonesia',
}
