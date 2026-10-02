// Stands in for a big dependency, such as a charting or date library. This
// work runs when the module is evaluated, which is when the heavy sheet is
// first preloaded or opened, not at app start.
const startedAt = Date.now();

// 170! is the largest factorial a number can hold; 171! overflows to Infinity.
const MAX_FACTORIAL = 170;

function factorial(n: number): number {
  return n <= 1 ? 1 : n * factorial(n - 1);
}

export const rows = Array.from({ length: 20_000 }, (_, index) =>
  factorial(index % (MAX_FACTORIAL + 1))
);

export const evaluatedAt = new Date();
export const evaluationMs = Date.now() - startedAt;
