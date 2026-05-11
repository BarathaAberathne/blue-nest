import coreWebVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...coreWebVitals,
  {
    rules: {
      // Initialization useEffect patterns (reading URL params, localStorage, auth state
      // once on mount) are safe — no cascade is possible with an empty dependency array.
      // The rule is designed for effects that loop, not for mount-only init effects.
      "react-hooks/set-state-in-effect": "off",
      // We are not using the React Compiler; suppress its plugin warnings.
      "react-compiler/react-compiler": "off",
      // Date.now() inside useMemo is intentional (computing a min-datetime for a form
      // input). The value is memoized and won't cause render instability.
      "react-hooks/purity": "off",
    },
  },
];

export default config;
