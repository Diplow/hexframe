// Complex multi-line imports that stress-test the regex parser

import {
  // Comments inside import
  Component,
  useState, // inline comment
  useEffect,
  /* block comment */ useCallback,
  type ComponentProps,
  type /* comment */ ReactNode
} from 'react';

import {
  Button,
  Input,
  Select,
  type ButtonProps,
  type InputProps as CustomInputProps,
  type SelectProps
} from '@/components/ui';

// Import with weird spacing and formatting
import {

  helper,


  utility,
  type   HelperType

} from './utils';

// Extremely long import that might break line-based parsing
import { verylongfunctionname, anotherlongname, yetanotherlongname, extremelylongfunctionname, superlongutilityfunction, massivelylonghelperfunction, incrediblyverbosefunctionname } from './very-long-module-name-that-exceeds-normal-limits';

// Mixed import types in complex formatting
import React, {
  type FC,
  type PropsWithChildren,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type MouseEvent,
  type ChangeEvent
} from 'react';

export function ComplexImportComponent() {
  return <div>Testing complex imports</div>;
}