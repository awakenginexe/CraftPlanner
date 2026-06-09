/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#121417",
        panel: "#1b2027",
        line: "#303844",
        accent: "#45b29d"
      }
    }
  },
  plugins: []
};
