console.log("IT'S ALIVE!");

// Find the site root using this JavaScript file's location.
const BASE_URL = new URL('.', import.meta.url);

const pages = [
    { url: '', title: 'Home' },
    { url: 'projects/', title: 'Projects' },
    { url: 'contact/', title: 'Contact' },
    { url: 'resume/', title: 'Resume' },
    { url: 'https://github.com/ppuckdee', title: 'GitHub' },
];

// Treat /projects/ and /projects/index.html as the same page.
function pagePath(pathname) {
    return pathname.replace(/\/index\.html$/, '/');
}

// Build the navigation.
const nav = document.createElement('nav');
nav.setAttribute('aria-label', 'Main navigation');
document.body.prepend(nav);

for (const page of pages) {
    const link = document.createElement('a');
    link.href = new URL(page.url, BASE_URL).href;
    link.textContent = page.title;

    if (link.origin === location.origin) {
        if (pagePath(link.pathname) === pagePath(location.pathname)) {
            link.classList.add('current');
            link.setAttribute('aria-current', 'page');
        }
    } else {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
    }

    nav.append(link);
}

// Add the theme selector.
document.body.insertAdjacentHTML('afterbegin', `
    <label class="color-scheme">
        Theme:
        <select name="color-scheme">
            <option value="light dark">Automatic</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
        </select>
    </label>
`);

const select = document.querySelector('.color-scheme select');
const colorSchemes = ['light dark', 'light', 'dark'];

function setColorScheme(value) {
    const scheme = colorSchemes.includes(value) ? value : 'light dark';
    document.documentElement.style.setProperty('color-scheme', scheme);
    select.value = scheme;
}

// Restore the saved preference when the page loads.
try {
    setColorScheme(localStorage.getItem('colorScheme'));
} catch {
    setColorScheme('light dark');
}

// Apply and save each new selection.
select.addEventListener('input', (event) => {
    setColorScheme(event.target.value);

    try {
        localStorage.setItem('colorScheme', event.target.value);
    } catch {
        // Theme switching still works if browser storage is blocked.
    }
});