/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                discord: {
                    dark: '#313338',
                    light: '#2B2D31',
                    lighter: '#1E1F22',
                    sidebar: '#1E1F22',
                    channel: '#2B2D31',
                    chat: '#313338',
                    hover: '#3F4147',
                    active: '#404249',
                    text: '#DBDEE1',
                    muted: '#949BA4',
                    primary: '#5865F2',
                    primaryHover: '#4752C4',
                    green: '#23A559',
                    red: '#DA373C',
                }
            }
        },
    },
    plugins: [],
}
