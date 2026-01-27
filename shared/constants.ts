
export const BLOCKED_TAGS = new Set([
    // Authentication/Login
    'login', 'log in', 'log-in', 'signin', 'sign in', 'sign-in', 'signup', 'sign up', 'sign-up',
    'authentication', 'auth', 'password', 'register', 'registration', 'oauth', 'sso',

    // Navigation/UI
    'navigation', 'menu', 'footer', 'header', 'sidebar', 'nav', 'breadcrumb',
    'cookie', 'cookies', 'consent', 'privacy', 'terms', 'sitemap', 'ui', 'ux',
    'user interface', 'interface', 'button', 'form', 'modal', 'popup', 'banner',

    // Platforms & Products (not content topics)
    'facebook', 'meta', 'instagram', 'twitter', 'x', 'linkedin', 'tiktok', 'youtube',
    'google', 'google drive', 'gmail', 'apple', 'icloud', 'microsoft', 'office',
    'outlook', 'teams', 'pinterest', 'reddit', 'whatsapp', 'messenger', 'slack',
    'discord', 'zoom', 'dropbox', 'notion', 'figma', 'github', 'gitlab',

    // Social media generic
    'social media', 'social network', 'social', 'share', 'like', 'follow', 'post',

    // Errors/Empty
    'error', 'not found', '404', '403', '500', 'access denied', 'no content', 'empty',
    'page not found', 'unavailable', 'blocked', 'forbidden', 'unauthorized',

    // Generic junk
    'website', 'web page', 'webpage', 'page', 'site', 'web', 'app', 'application',
    'download', 'install', 'home', 'homepage', 'main', 'index', 'default',
    'about', 'contact', 'help', 'support', 'faq', 'blog', 'news', 'article',
]);
