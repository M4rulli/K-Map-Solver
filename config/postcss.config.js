import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

export default {
  plugins: [
    tailwindcss({ config: './config/tailwind.config.ts' }),
    autoprefixer(),
  ],
}
