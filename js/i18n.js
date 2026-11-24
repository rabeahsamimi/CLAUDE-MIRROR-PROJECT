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
    'mirror.library': 'انتخاب از گالری',
    'mirror.hint': 'یک شیء را وسط کادر بگذار، از نزدیک و با نور خوب.',
    'mirror.privacyShort': 'عکس فقط برای همین درخواست به Google فرستاده می‌شود و هیچ‌جا ذخیره نمی‌شود.',
    'mirror.loading': 'دارم نگاه می‌کنم…',
    'mirror.newPhoto': 'عکس جدید',
    'mirror.retry': 'دوباره امتحان کن',
    'mirror.translation': 'ترجمهٔ فارسی',
    'mirror.vocab': 'واژه‌های کلیدی',
    'mirror.note': 'نکته',
    'mirror.levelBadge': 'سطح {level}',
    'mirror.notRecognized': 'نتوانستم شیء اصلی را تشخیص بدهم. از نزدیک‌تر و با نور بهتر دوباره عکس بگیر.',
    'mirror.busyRetrying': 'سرور Google شلوغ است؛ دوباره تلاش می‌کنم…',
    'mirror.tryingOtherModel': 'امتحان با یک مدل دیگر…',
    'mirror.errorBusy': 'سرورهای Google الان خیلی شلوغ هستند. مشکل از تو یا برنامه نیست. یکی دو دقیقه صبر کن و «دوباره امتحان کن» را بزن.',
    'mirror.errorQuota': 'سهمیهٔ رایگان Gemini فعلاً تمام شده. چند دقیقه بعد (یا فردا) دوباره امتحان کن.',
    'mirror.errorNetwork': 'اتصال به اینترنت برقرار نشد یا خیلی طول کشید. اینترنت را بررسی کن و دوباره امتحان کن.',
    'mirror.errorInvalid': 'کلید API دیگر کار نمی‌کند. در «تنظیمات» آن را بررسی کن.',
    'mirror.errorBlocked': 'Google به این عکس پاسخ نداد (فیلتر ایمنی). از چیز دیگری عکس بگیر.',
    'mirror.errorImage': 'این فایل عکس قابل خواندن نیست. عکس دیگری امتحان کن.',
    'mirror.errorBadResponse': 'پاسخ هوش مصنوعی ناقص بود. دوباره امتحان کن.',
    'mirror.errorUnknown': 'خطای غیرمنتظره: {detail}',

    'review.title': 'مرور',
    'review.empty': 'هنوز چیزی برای مرور نیست. بعد از اولین گفتگو، واژه‌ها و نقاط ضعفت اینجا می‌آیند.',

    'progress.title': 'پیشرفت',
    'progress.empty': 'پیشرفتت اینجا نمایش داده می‌شود: واژه‌های یادگرفته، اشتباه‌ها و روزهای پشت‌سرهم.',

    'settings.title': 'تنظیمات',
    'settings.keyLabel': 'کلید API رایگان Gemini',
    'settings.keyHelp': 'کلید فقط روی همین گوشی ذخیره می‌شود و هرگز داخل کد یا GitHub نمی‌رود.',
    'settings.keyPlaceholder': 'کلید را اینجا paste کن',
    'settings.show': 'نمایش',
    'settings.hide': 'پنهان',
    'settings.save': 'ذخیره',
    'settings.test': 'بررسی کلید',
    'settings.delete': 'حذف کلید',
    'settings.getKey': 'گرفتن کلید رایگان از Google AI Studio ↗',
    'settings.saved': 'کلید ذخیره شد.',
    'settings.deleted': 'کلید حذف شد.',
    'settings.empty': 'اول کلید را در کادر بالا وارد کن.',
    'settings.badFormat': 'کلید فاصله دارد یا خیلی کوتاه است. آن را دوباره از AI Studio کپی کن.',
    'settings.testing': 'در حال بررسی…',
    'settings.testOk': 'کلید کار می‌کند ✓ مدل انتخاب‌شده:',
    'settings.testInvalid': 'این کلید معتبر نیست. آن را دوباره از AI Studio کپی کن.',
    'settings.testBusy': 'سرورهای Google الان شلوغ هستند. یکی دو دقیقه بعد دوباره امتحان کن.',
    'settings.testQuota': 'سهمیهٔ رایگان فعلاً تمام شده. کمی بعد یا فردا دوباره امتحان کن.',
    'settings.testForbidden': 'دسترسی رد شد. شاید Gemini API برای این کلید فعال نیست.',
    'settings.testNetwork': 'اتصال برقرار نشد. اینترنت گوشی را بررسی کن.',
    'settings.testNoModel': 'کلید کار می‌کند، اما مدل مناسبی برای عکس پیدا نشد.',
    'settings.testError': 'خطای غیرمنتظره: {detail}',

    'speak.listen': 'بشنو',
    'speak.slow': 'آهسته',
    'speak.unsupported': 'این دستگاه خواندن متن با صدا را پشتیبانی نمی‌کند.',

    'voice.title': 'صدای پرتغالی',
    'voice.found': 'صدای فعلی: {name} ✓',
    'voice.notFound': 'صدای پرتغالیِ برزیلی روی این گوشی پیدا نشد. مراحل زیر را انجام بده.',
    'voice.test': 'امتحان صدا',
    'voice.sample': 'Olá! Tudo bem? Vamos aprender português juntos.',
    'voice.howTitle': 'نصب صدای طبیعی‌تر (پیشنهادی)',
    'voice.step1': 'برنامهٔ Settings (تنظیمات) iPhone را باز کن.',
    'voice.step2': 'Accessibility ← Spoken Content (در بعضی نسخه‌ها Read & Speak) ← Voices',
    'voice.step3': 'Portuguese ← Portuguese (Brazil) را انتخاب کن.',
    'voice.step4': 'کنار Luciana (Enhanced) یا Felipe (Enhanced) دکمهٔ دانلود را بزن (حدود ۱۰۰ مگابایت؛ با Wi‑Fi).',
    'voice.step5': 'بعد از دانلود، Espelho IA را کامل ببند و دوباره باز کن.',

    'practice.title': 'تمرین تلفظ',
    'practice.hint': 'اول گوش کن، بعد دکمهٔ میکروفون را بزن، همان را بلند بگو و دوباره دکمه را بزن.',
    'practice.prev': 'قبلی',
    'practice.next': 'بعدی',
    'practice.counter': '{n} از {total}',
    'practice.record': 'ضبط صدای من',
    'practice.stop': 'تمام شد ({seconds})',
    'practice.recording': 'در حال ضبط… بگو و بعد «تمام شد» را بزن.',
    'practice.checking': 'دارم گوش می‌دهم…',
    'practice.verdict.good': 'عالی! کاملاً قابل فهم بود ✓',
    'practice.verdict.close': 'خوب بود؛ فقط چند صدا را بهتر کن.',
    'practice.verdict.retry': 'یک بار دیگر امتحان کن؛ آهسته‌تر و واضح‌تر.',
    'practice.legend': 'سبز: شنیده شد · نارنجی: شنیده نشد',
    'practice.heard': 'شنیدم:',
    'practice.missedWords': 'این واژه‌ها درست شنیده نشدند: {words}. اول با «آهسته» گوش کن، بعد تکرار کن.',
    'practice.playback': 'صدای خودت:',
    'practice.approx': 'این بازخورد تقریبی است و جای معلم را نمی‌گیرد.',
    'practice.noSpeech': 'صدایی نشنیدم. گوشی را نزدیک‌تر بگیر و بلندتر بگو.',
    'practice.micDenied': 'اجازهٔ میکروفون داده نشد. در Safari روی «aA» (کنار آدرس) بزن ← Website Settings ← Microphone ← Allow. اگر برنامه را از Home Screen باز کرده‌ای: Settings iPhone ← Apps ← Safari ← Microphone ← Ask.',
    'practice.unsupported': 'ضبط صدا در این مرورگر کار نمی‌کند. Safari را به‌روز کن.',

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
    'mirror.library': 'Escolher da galeria',
    'mirror.hint': 'Coloque um objeto no centro, de perto e com boa luz.',
    'mirror.privacyShort': 'A foto vai para o Google só para este pedido e não fica salva em lugar nenhum.',
    'mirror.loading': 'Olhando…',
    'mirror.newPhoto': 'Nova foto',
    'mirror.retry': 'Tentar de novo',
    'mirror.translation': 'Tradução em persa',
    'mirror.vocab': 'Palavras-chave',
    'mirror.note': 'Dica',
    'mirror.levelBadge': 'Nível {level}',
    'mirror.notRecognized': 'Não consegui reconhecer o objeto principal. Tire outra foto, mais de perto e com mais luz.',
    'mirror.busyRetrying': 'O servidor do Google está ocupado; tentando de novo…',
    'mirror.tryingOtherModel': 'Tentando com outro modelo…',
    'mirror.errorBusy': 'Os servidores do Google estão sobrecarregados agora. Não é culpa sua nem do app. Espere um ou dois minutos e toque em «Tentar de novo».',
    'mirror.errorQuota': 'A cota gratuita do Gemini acabou por enquanto. Tente daqui a alguns minutos (ou amanhã).',
    'mirror.errorNetwork': 'Sem conexão ou a resposta demorou demais. Verifique a internet e tente de novo.',
    'mirror.errorInvalid': 'A chave de API não funciona mais. Confira em «Ajustes».',
    'mirror.errorBlocked': 'O Google não respondeu a esta foto (filtro de segurança). Fotografe outra coisa.',
    'mirror.errorImage': 'Não consegui ler esta imagem. Tente outra foto.',
    'mirror.errorBadResponse': 'A resposta da IA veio incompleta. Tente de novo.',
    'mirror.errorUnknown': 'Erro inesperado: {detail}',

    'review.title': 'Revisão',
    'review.empty': 'Ainda não há nada para revisar. Depois da primeira conversa, suas palavras e pontos fracos aparecem aqui.',

    'progress.title': 'Progresso',
    'progress.empty': 'Seu progresso aparece aqui: palavras aprendidas, erros e dias seguidos.',

    'settings.title': 'Ajustes',
    'settings.keyLabel': 'Chave de API gratuita do Gemini',
    'settings.keyHelp': 'A chave fica salva só neste celular e nunca vai para o código nem para o GitHub.',
    'settings.keyPlaceholder': 'Cole a chave aqui',
    'settings.show': 'Mostrar',
    'settings.hide': 'Ocultar',
    'settings.save': 'Salvar',
    'settings.test': 'Testar chave',
    'settings.delete': 'Apagar chave',
    'settings.getKey': 'Pegar uma chave gratuita no Google AI Studio ↗',
    'settings.saved': 'Chave salva.',
    'settings.deleted': 'Chave apagada.',
    'settings.empty': 'Primeiro, digite a chave no campo acima.',
    'settings.badFormat': 'A chave tem espaços ou é curta demais. Copie de novo no AI Studio.',
    'settings.testing': 'Testando…',
    'settings.testOk': 'A chave funciona ✓ Modelo escolhido:',
    'settings.testInvalid': 'Esta chave não é válida. Copie de novo no AI Studio.',
    'settings.testBusy': 'Os servidores do Google estão ocupados agora. Tente de novo em um ou dois minutos.',
    'settings.testQuota': 'A cota gratuita acabou por enquanto. Tente mais tarde ou amanhã.',
    'settings.testForbidden': 'Acesso negado. Talvez a Gemini API não esteja ativada para esta chave.',
    'settings.testNetwork': 'Sem conexão. Verifique a internet do celular.',
    'settings.testNoModel': 'A chave funciona, mas não encontrei um modelo que aceite fotos.',
    'settings.testError': 'Erro inesperado: {detail}',

    'speak.listen': 'Ouvir',
    'speak.slow': 'Devagar',
    'speak.unsupported': 'Este aparelho não consegue ler textos em voz alta.',

    'voice.title': 'Voz em português',
    'voice.found': 'Voz atual: {name} ✓',
    'voice.notFound': 'Não encontrei uma voz de português do Brasil neste celular. Siga os passos abaixo.',
    'voice.test': 'Testar voz',
    'voice.sample': 'Olá! Tudo bem? Vamos aprender português juntos.',
    'voice.howTitle': 'Instalar uma voz mais natural (recomendado)',
    'voice.step1': 'Abra os Ajustes do iPhone.',
    'voice.step2': 'Acessibilidade → Conteúdo Falado (em algumas versões, Ler e Falar) → Vozes',
    'voice.step3': 'Escolha Português → Português (Brasil).',
    'voice.step4': 'Toque em baixar ao lado de Luciana (Aprimorada) ou Felipe (Aprimorada) (cerca de 100 MB; use Wi‑Fi).',
    'voice.step5': 'Depois do download, feche o Espelho IA por completo e abra de novo.',

    'practice.title': 'Treino de pronúncia',
    'practice.hint': 'Primeiro ouça, depois toque no microfone, repita em voz alta e toque de novo.',
    'practice.prev': '‹ Anterior',
    'practice.next': 'Próximo ›',
    'practice.counter': '{n} de {total}',
    'practice.record': 'Gravar minha voz',
    'practice.stop': 'Pronto ({seconds})',
    'practice.recording': 'Gravando… fale e depois toque em «Pronto».',
    'practice.checking': 'Ouvindo…',
    'practice.verdict.good': 'Ótimo! Ficou bem claro ✓',
    'practice.verdict.close': 'Bom! Só alguns sons para melhorar.',
    'practice.verdict.retry': 'Tente mais uma vez, mais devagar e com calma.',
    'practice.legend': 'Verde: ouvido · Laranja: não ouvido',
    'practice.heard': 'Ouvi:',
    'practice.missedWords': 'Estas palavras não foram ouvidas com clareza: {words}. Ouça em «Devagar» e repita.',
    'practice.playback': 'Sua gravação:',
    'practice.approx': 'Este retorno é aproximado e não substitui um professor.',
    'practice.noSpeech': 'Não ouvi nada. Segure o celular mais perto e fale mais alto.',
    'practice.micDenied': 'O microfone não foi permitido. No Safari, toque em «aA» → Ajustes do Site → Microfone → Permitir. Se abriu pela Tela de Início: Ajustes do iPhone → Apps → Safari → Microfone → Perguntar.',
    'practice.unsupported': 'A gravação de voz não funciona neste navegador. Atualize o Safari.',

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
  document.querySelectorAll('[data-i18n-aria]').forEach((element) => {
    element.setAttribute('aria-label', t(element.dataset.i18nAria));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  });
}

export function getLanguage() {
  return currentLanguage;
}
