const path = require('path');

module.exports = {
  '*.{js,jsx,ts,tsx}': (filenames) => [
    `eslint --fix ${filenames.map(f => path.relative(process.cwd(), f)).join(' ')}`,
    `prettier --write ${filenames.map(f => path.relative(process.cwd(), f)).join(' ')}`
  ],
  '*.{json,md}': (filenames) => [
    `prettier --write ${filenames.map(f => path.relative(process.cwd(), f)).join(' ')}`
  ]
};