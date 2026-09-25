/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        midnight: { DEFAULT: '#0B132B', light: '#1C2541', accent: '#3A506B' },
        status: { proses: '#10b981', selesai: '#3b82f6' }
      },
      boxShadow: {
        'glossy': '0 10px 25px -5px rgba(11, 19, 43, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)'
      }
    },
  },
  plugins: [],
}