module.exports = {
  '*.{js,jsx,ts,tsx}': ['npx eslint --fix', 'npx prettier --write'],
  '*.{json,md}': ['npx prettier --write'],
};
