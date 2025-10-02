// Test case: a function that should trigger the 100+ line error
export function VeryLongFunction() {
  // This function will be over 100 lines to trigger an error
  const step1 = "Initialize";
  console.log(step1);

  const step2 = "Process data";
  console.log(step2);

  const step3 = "Validate input";
  console.log(step3);

  const step4 = "Transform data";
  console.log(step4);

  const step5 = "Filter results";
  console.log(step5);

  const step6 = "Sort data";
  console.log(step6);

  const step7 = "Group by category";
  console.log(step7);

  const step8 = "Calculate totals";
  console.log(step8);

  const step9 = "Generate report";
  console.log(step9);

  const step10 = "Export data";
  console.log(step10);

  // Add more lines to exceed 100
  for (let i = 0; i < 10; i++) {
    console.log(`Iteration ${i}`);

    if (i % 2 === 0) {
      console.log('Even number');
    } else {
      console.log('Odd number');
    }

    const calculation = i * 2 + 5;
    console.log(`Calculation result: ${calculation}`);

    if (calculation > 15) {
      console.log('High calculation');
    }
  }

  // More processing
  const data = Array.from({length: 20}, (_, i) => ({
    id: i,
    value: Math.random() * 100,
    processed: false
  }));

  for (const item of data) {
    item.processed = true;
    item.value = Math.round(item.value);

    if (item.value > 50) {
      console.log(`High value item: ${item.id}`);
    }

    if (item.value < 10) {
      console.log(`Low value item: ${item.id}`);
    }
  }

  // Final processing
  const summary = {
    totalItems: data.length,
    processedItems: data.filter(item => item.processed).length,
    highValueItems: data.filter(item => item.value > 50).length,
    lowValueItems: data.filter(item => item.value < 10).length
  };

  console.log('Summary:', summary);

  // Validation
  if (summary.totalItems !== summary.processedItems) {
    throw new Error('Not all items were processed');
  }

  // Additional processing steps
  const categories = ['A', 'B', 'C'];
  const categorizedData = categories.map(category => ({
    category,
    items: data.filter(item => item.id % 3 === categories.indexOf(category))
  }));

  for (const categoryData of categorizedData) {
    console.log(`Category ${categoryData.category}: ${categoryData.items.length} items`);

    for (const item of categoryData.items) {
      console.log(`  Item ${item.id}: ${item.value}`);
    }
  }

  // Final validation and return
  const result = {
    data,
    summary,
    categorizedData,
    timestamp: new Date().toISOString()
  };

  console.log('Processing completed successfully');
  return result;
  // This function should be well over 100 lines and trigger an error
}