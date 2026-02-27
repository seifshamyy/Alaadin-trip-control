/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#1a1f3a",
                accent: "#c9922a",
                surface: "#f8f5f0",
            },
            fontFamily: {
                sans: ['Cairo', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
