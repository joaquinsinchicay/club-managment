// Vitest global setup — extiende expect con matchers de jest-dom para tests
// de componentes (useTestingLibrary). Si una suite no toca DOM, igual se carga
// pero es prácticamente gratis.
import "@testing-library/jest-dom/vitest";
