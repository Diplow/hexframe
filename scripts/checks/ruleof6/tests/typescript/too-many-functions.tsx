// Test case: file with 7 functions (should trigger error)
export function Function1() {
  return "Function 1";
}

export function Function2() {
  return "Function 2";
}

export function Function3() {
  return "Function 3";
}

export function Function4() {
  return "Function 4";
}

export function Function5() {
  return "Function 5";
}

export function Function6() {
  return "Function 6";
}

export function Function7() {
  return "Function 7 - This should trigger a violation";
}

// This file should violate the 6-function limit