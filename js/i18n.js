// i18n.js — all interface text, in Persian (fa) and Brazilian Portuguese (pt).
// "i18n" is short for "internationalization" (i + 18 letters + n).
//
// How it works:
//   In index.html, an element like <span data-i18n="nav.mirror"></span>
//   gets its text from STRINGS[currentLanguage]["nav.mirror"].
//   Persian is written right-to-left (dir="rtl"), Portuguese left-to-right (dir="ltr").

export const STRINGS = {
  fa: {
    'app.name': 'Espelho IA',
    'app.tagline': 'دنیای اطرافت، کلاس پرتغالی توست.',

    'nav.mirror': 'آینه',
    'nav.review': 'مرور',
    'nav.progress': 'پیشرفت',
    'nav.settings': 'تنظیمات',

    'welcome.title': 'به Espelho IA خوش آمدی',
    'welcome.body': 'دوربین را به هر چیزی بگیر. هوش مصنوعی آن را می‌شناسد، به پرتغالیِ برزیلی توصیفش می‌کند، درباره‌اش از تو سؤال می‌پرسد و اشتباه‌هایت را با مهربانی اصلاح می‌کند.',
    'welcome.privacy': 'عکس‌ها هیچ‌جا ذخیره نمی‌شوند. هر عکس فقط برای همان یک درخواست به Google Gemini فرستاده می‌شود. پیشرفت تو فقط روی همین گوشی می‌ماند.',
    'welcome.start': 'شروع',

    'mirror.title': 'آینه',
    'mirror.needKey': 'برای شروع، اول کلید رایگان Gemini را در «تنظیمات» وارد کن.',
    'mirror.goSettings': 'رفتن به تنظیمات',
    'mirror.capture': 'عکس بگیر',
    'mirror.soon': 'دوربین و توصیف هوش مصنوعی در مرحلهٔ ۳ ساخته می‌شوند.',

    'review.title': 'مرور',
    'review.empty': 'هنوز چیزی برای مرور نیست. بعد از اولین گفتگو، واژه‌ها و نقاط ضعفت اینجا می‌آیند.',

    'progress.title': 'پیشرفت',
    'progress.empty': 'پیشرفتت اینجا نمایش داده می‌شود: واژه‌های یادگرفته، اشتباه‌ها و روزهای پشت‌سرهم.',

    'settings.title': 'تنظیمات',
    'settings.keyLabel': 'کلید API رایگان Gemini',
    'settings.keyHelp': 'کلید فقط روی همین گوشی ذخیره می‌شود و هرگز داخل کد یا GitHub نمی‌رود.',
    'settings.keyPlaceholder': 'AIza…',
    'settings.show': 'نمایش',
    'settings.hide': 'پنهان',
    'settings.save': 'ذخیره',
    'settings.test': 'بررسی کلید',
    'settings.delete': 'حذف کلید',
    'settings.getKey': 'گرفتن کلید رایگان از Google AI Studio ↗',
    'settings.saved': 'کلید ذخیره شد.',
    'settings.deleted': 'کلید حذف شد.',
    'settings.empty': 'اول کلید را در کادر بالا وارد کن.',
    'settings.badFormat': 'این شبیه کلید Gemini نیست. کلیدها معمولاً با AIza شروع می‌شوند و فاصله ندارند.',
    'settings.testing': 'در حال بررسی…',
    'settings.testOk': 'کلید کار می‌کند ✓ مدل انتخاب‌شده:',
    'settings.testInvalid': 'این کلید معتبر نیست. آن را دوباره از AI Studio کپی کن.',
    'settings.testQuota': 'سهمیهٔ رایگان فعلاً تمام شده. کمی بعد یا فردا دوباره امتحان کن.',
    'settings.testForbidden': 'دسترسی رد شد. شاید Gemini API برای این کلید فعال نیست.',
    'settings.testNetwork': 'اتصال برقرار نشد. اینترنت گوشی را بررسی کن.',
    'settings.testNoModel': 'کلید کار می‌کند، اما مدل مناسبی برای عکس پیدا نشد.',
    'settings.testError': 'خطای غیرمنتظره: {detail}',

    'settings.levelLabel': 'سطح پرتغالی تو',
    'level.A1': 'A1 — مبتدی',
    'level.A2': 'A2 — پایه',
    'level.B1': 'B1 — متوسط',

    'settings.langLabel': 'زبان برنامه',
    'settings.langHelp': 'پیشنهاد: وقتی راحت‌تر شدی، زبان برنامه را پرتغالی کن تا بیشتر در معرض زبان باشی.',

    'settings.themeLabel': 'ظاهر',
    'theme.auto': 'خودکار',
    'theme.light': 'روشن',
    'theme.dark': 'تیره',

    'privacy.title': 'حریم خصوصی',
    'privacy.photos': 'عکس‌ها ذخیره نمی‌شوند؛ هر عکس فقط برای همان یک درخواست به Google Gemini می‌رود.',
    'privacy.progress': 'واژه‌ها، اشتباه‌ها و پیشرفتت فقط روی همین گوشی ذخیره می‌شوند.',
    'privacy.key': 'کلید API فقط روی همین گوشی است و به هیچ سرور دیگری فرستاده نمی‌شود.',
    'privacy.freeTier': 'مهم: در سطح رایگان، Google ممکن است از عکس‌ها و متن‌ها برای بهبود محصولاتش استفاده کند و افراد بازبین آن‌ها را ببینند. از مدارک، چهره‌ها یا چیزهای خصوصی عکس نگیر.',

    'app.version': 'نسخه {version}',
  },

  pt: {
    'app.name': 'Espelho IA',
    'app.tagline': 'O mundo ao seu redor é a sua sala de aula.',

    'nav.mirror': 'Espelho',
    'nav.review': 'Revisão',
    'nav.progress': 'Progresso',
    'nav.settings': 'Ajustes',

    'welcome.title': 'Boas-vindas ao Espelho IA',
    'welcome.body': 'Aponte a câmera para qualquer coisa. A IA reconhece o objeto, descreve em português do Brasil, faz perguntas sobre ele e corrige seus erros com gentileza.',
    'welcome.privacy': 'As fotos não ficam salvas em lugar nenhum. Cada foto vai para o Google Gemini só para aquele pedido. Seu progresso fica apenas neste celular.',
    'welcome.start': 'Começar',

    'mirror.title': 'Espelho',
    'mirror.needKey': 'Para começar, coloque sua chave gratuita do Gemini em «Ajustes».',
    'mirror.goSettings': 'Ir para Ajustes',
    'mirror.capture': 'Tirar foto',
    'mirror.soon': 'A câmera e a descrição com IA chegam na etapa 3.',

    'review.title': 'Revisão',
    'review.empty': 'Ainda não há nada para revisar. Depois da primeira conversa, suas palavras e pontos fracos aparecem aqui.',

    'progress.title': 'Progresso',
    'progress.empty': 'Seu progresso aparece aqui: palavras aprendidas, erros e dias seguidos.',

    'settings.title': 'Ajustes',
    'settings.keyLabel': 'Chave de API gratuita do Gemini',
    'settings.keyHelp': 'A chave fica salva só neste celular e nunca vai para o código nem para o GitHub.',
    'settings.keyPlaceholder': 'AIza…',
    'settings.show': 'Mostrar',
    'settings.hide': 'Ocultar',
    'settings.save': 'Salvar',
    'settings.test': 'Testar chave',
    'settings.delete': 'Apagar chave',
    'settings.getKey': 'Pegar uma chave gratuita no Google AI Studio ↗',
    'settings.saved': 'Chave salva.',
    'settings.deleted': 'Chave apagada.',
    'settings.empty': 'Primeiro, digite a chave no campo acima.',
    'settings.badFormat': 'Isso não parece uma chave do Gemini. As chaves costumam começar com AIza e não têm espaços.',
    'settings.testing': 'Testando…',
    'settings.testOk': 'A chave funciona ✓ Modelo escolhido:',
    'settings.testInvalid': 'Esta chave não é válida. Copie de novo no AI Studio.',
    'settings.testQuota': 'A cota gratuita acabou por enquanto. Tente mais tarde ou amanhã.',
    'settings.testForbidden': 'Acesso negado. Talvez a Gemini API não esteja ativada para esta chave.',
    'settings.testNetwork': 'Sem conexão. Verifique a internet do celular.',
    'settings.testNoModel': 'A chave funciona, mas não encontrei um modelo que aceite fotos.',
    'settings.testError': 'Erro inesperado: {detail}',

    'settings.levelLabel': 'Seu nível de português',
    'level.A1': 'A1 — iniciante',
    'level.A2': 'A2 — básico',
    'level.B1': 'B1 — intermediário',

    'settings.langLabel': 'Idioma do app',
    'settings.langHelp': 'Dica: usar o app em português aumenta o seu contato com a língua.',

    'settings.themeLabel': 'Aparência',
    'theme.auto': 'Automática',
    'theme.light': 'Clara',
    'theme.dark': 'Escura',

    'privacy.title': 'Privacidade',
    'privacy.photos': 'As fotos não são salvas; cada foto vai para o Google Gemini só para aquele pedido.',
    'privacy.progress': 'Palavras, erros e progresso ficam salvos só neste celular.',
    'privacy.key': 'A chave de API fica só neste celular e não é enviada para nenhum outro servidor.',
    'privacy.freeTier': 'Importante: no plano gratuito, o Google pode usar fotos e textos para melhorar seus produtos, e revisores humanos podem vê-los. Não fotografe documentos, rostos ou coisas privadas.',

    'app.version': 'Versão {version}',
  },
};

// The language used right now. Changed by applyLanguage().
let currentLanguage = 'fa';

// t() = "translate": returns the text for a key, filling {placeholders}.
// Example: t('settings.testOk', { model: 'gemini-3.5-flash-lite' })
export function t(key, vars = {}) {
  const table = STRINGS[currentLanguage] || STRINGS.fa;
  const text = table[key] ?? STRINGS.fa[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}

// Switches the whole page to a language: text, direction (rtl/ltr) and lang attribute.
export function applyLanguage(language) {
  currentLanguage = STRINGS[language] ? language : 'fa';
  const html = document.documentElement;
  html.lang = currentLanguage === 'fa' ? 'fa' : 'pt-BR';
  html.dir = currentLanguage === 'fa' ? 'rtl' : 'ltr';

  // textContent (not innerHTML) is used on purpose: it can never run hidden code.
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  });
}

export function getLanguage() {
  return currentLanguage;
}
