export interface CreateItemFormData {
  title: string;
  description: string;
  url: string;
}

export interface CreateItemFormErrors {
  title?: string;
  description?: string;
  url?: string;
  general?: string;
}

export interface ValidationResult {
  success: boolean;
  data: CreateItemFormData;
  errors: CreateItemFormErrors;
}

export function validateCreateItemInput(
  data: Partial<CreateItemFormData>,
): ValidationResult {
  const errors: CreateItemFormErrors = {};
  const cleanData: CreateItemFormData = {
    title: (data.title ?? "").trim(),
    description: (data.description ?? "").trim(),
    url: (data.url ?? "").trim(),
  };

  // Title validation
  if (!cleanData.title) {
    errors.title = "Title is required";
  } else if (cleanData.title.length > 200) {
    errors.title = "Title must be less than 200 characters";
  }

  // Description validation
  if (cleanData.description.length > 20000) {
    errors.description = "Description must be less than 20000 characters";
  }

  // URL validation
  if (cleanData.url && !isValidUrl(cleanData.url)) {
    errors.url = "Please enter a valid URL";
  }

  return {
    success: Object.keys(errors).length === 0,
    data: cleanData,
    errors,
  };
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}