import next from "eslint-config-next";

const config = [
  ...next,
  { ignores: ["legacy/**", ".next/**", "node_modules/**", "public/**", "tests/screens/**"] },
];

export default config;
