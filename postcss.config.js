import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';
import { purgeCSSPlugin } from '@fullhuman/postcss-purgecss';

export default {
  plugins: [
    autoprefixer(),
    cssnano({
      preset: 'default',
    }),
    purgeCSSPlugin({
      content: ['./src/client/**/*.html', './src/client/**/*.js'],
      safelist: {
        standard: [
          /^status-/,
          /^conn-/,
          /^toast/,
          /^sev-/,
          'active',
          'ripple',
          'me',
          'stranger',
          'system-msg',
          'msg-wrapper',
          'msg',
          'text',
          'no-js',
          'visible',
          'hidden',
        ],
        deep: [],
        greedy: [],
      },
      defaultExtractor: (content) => content.match(/[\w-/:]+(?<!:)/g) || [],
    }),
  ],
};
