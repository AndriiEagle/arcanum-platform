import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Предотвращение цикличных зависимостей
      'import/no-cycle': ['error', { ignoreExternal: true }],
      // Предотвращение использования переменных до их объявления
      'no-use-before-define': ['error'],
      // Предотвращение неправильного использования hoisting
      '@typescript-eslint/no-use-before-define': ['error'],
      // Обязательные зависимости в useEffect
      'react-hooks/exhaustive-deps': 'error',
    },
  },
];

export default eslintConfig;
