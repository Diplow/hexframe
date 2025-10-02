// Simple test case: a function that should trigger the 50+ line warning
export function SimpleLongFunction() {
  // Line 3
  const data = [];

  // Line 5
  for (let i = 0; i < 100; i++) {
    data.push(i);
  }

  // Line 9
  if (data.length > 50) {
    console.log('Data is long');
  }

  // Line 13
  const processed = data.map(item => {
    return item * 2;
  });

  // Line 17
  const filtered = processed.filter(item => {
    return item > 10;
  });

  // Line 21
  const result = filtered.reduce((acc, item) => {
    return acc + item;
  }, 0);

  // Line 25
  if (result > 1000) {
    console.log('Result is large');
  }

  // Line 29
  const finalData = {
    original: data,
    processed: processed,
    filtered: filtered,
    result: result
  };

  // Line 37
  console.log('Processing complete');
  console.log('Data length:', data.length);
  console.log('Processed length:', processed.length);
  console.log('Filtered length:', filtered.length);
  console.log('Final result:', result);

  // Line 43
  if (finalData.result > 500) {
    console.log('High value result');
  }

  // Line 47
  const summary = `Processed ${data.length} items, result: ${result}`;

  // Line 49
  return {
    summary,
    data: finalData,
    success: true
  };
  // This function should be ~53 lines and trigger a warning
}