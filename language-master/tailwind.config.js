import animate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', 'html.dark'],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Các lớp kiểu Tailwind 4 đang được dùng trong code (JL-26)
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        "2xs": "0 1px rgb(0 0 0 / 0.05)",
      },
      backdropBlur: {
        xs: "4px",
      },
      spacing: {
        13: "3.25rem",
      },
      ringWidth: {
        "1.5": "1.5px",
      },
    },
  },
  plugins: [animate],
}
