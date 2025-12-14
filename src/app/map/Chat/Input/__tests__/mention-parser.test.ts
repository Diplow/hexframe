import { describe, it, expect } from 'vitest';
import { parseMentions, type ParsedMentionResult, type Mention } from '~/app/map/Chat/Input/mention-parser';

describe('parseMentions', () => {
  describe('basic parsing', () => {
    it('should parse a single @mention at start', () => {
      const result = parseMentions('@plan do something');

      expect(result.mentions).toHaveLength(1);
      expect(result.mentions[0]).toEqual({
        shortcutName: 'plan',
        startIndex: 0,
        endIndex: 5,
      });
      expect(result.instruction).toBe('do something');
    });

    it('should return empty array for text without mentions', () => {
      const result = parseMentions('just regular text');

      expect(result.mentions).toEqual([]);
      expect(result.instruction).toBe('just regular text');
    });

    it('should handle @mention with no trailing text', () => {
      const result = parseMentions('@plan');

      expect(result.mentions).toHaveLength(1);
      expect(result.mentions[0]?.shortcutName).toBe('plan');
      expect(result.instruction).toBe('');
    });

    it('should parse @mention in middle of text', () => {
      const result = parseMentions('run @plan with debug mode');

      expect(result.mentions).toHaveLength(1);
      expect(result.mentions[0]).toEqual({
        shortcutName: 'plan',
        startIndex: 4,
        endIndex: 9,
      });
      expect(result.instruction).toBe('run  with debug mode');
    });

    it('should handle empty input', () => {
      const result = parseMentions('');

      expect(result.mentions).toEqual([]);
      expect(result.instruction).toBe('');
    });
  });

  describe('shortcut name handling', () => {
    it('should be case-insensitive and normalize to lowercase', () => {
      const result = parseMentions('@PLAN do something');

      expect(result.mentions[0]?.shortcutName).toBe('plan');
    });

    it('should handle mixed case shortcut names', () => {
      const result = parseMentions('@MyProject run tests');

      expect(result.mentions[0]?.shortcutName).toBe('myproject');
    });

    it('should allow underscores in shortcut names', () => {
      const result = parseMentions('@my_project execute');

      expect(result.mentions[0]?.shortcutName).toBe('my_project');
    });

    it('should allow numbers in shortcut names', () => {
      const result = parseMentions('@project123 run');

      expect(result.mentions[0]?.shortcutName).toBe('project123');
    });

    it('should handle shortcut names with leading numbers', () => {
      const result = parseMentions('@123project run');

      expect(result.mentions[0]?.shortcutName).toBe('123project');
    });
  });

  describe('edge cases', () => {
    it('should handle multiple @mentions', () => {
      const result = parseMentions('@plan and @review together');

      expect(result.mentions).toHaveLength(2);
      expect(result.mentions[0]?.shortcutName).toBe('plan');
      expect(result.mentions[1]?.shortcutName).toBe('review');
    });

    it('should handle @ without alphanumeric chars (not a valid mention)', () => {
      const result = parseMentions('@ alone');

      expect(result.mentions).toEqual([]);
      expect(result.instruction).toBe('@ alone');
    });

    it('should handle @! as not a valid mention', () => {
      const result = parseMentions('@! something');

      expect(result.mentions).toEqual([]);
    });

    it('should handle @. as not a valid mention', () => {
      const result = parseMentions('@. something');

      expect(result.mentions).toEqual([]);
    });

    it('should handle mention at end of text', () => {
      const result = parseMentions('run @plan');

      expect(result.mentions).toHaveLength(1);
      expect(result.mentions[0]?.shortcutName).toBe('plan');
    });

    it('should handle consecutive mentions', () => {
      const result = parseMentions('@plan@review');

      expect(result.mentions).toHaveLength(2);
    });

    it('should handle whitespace-only instruction', () => {
      const result = parseMentions('@plan   ');

      expect(result.mentions).toHaveLength(1);
      expect(result.instruction.trim()).toBe('');
    });

    it('should not parse email addresses as mentions', () => {
      const result = parseMentions('email test@example.com');

      // Email addresses should not be parsed as @mentions
      // The @ is preceded by non-whitespace, so it's not a mention
      expect(result.mentions).toEqual([]);
    });

    it('should handle newlines in instruction', () => {
      const result = parseMentions('@plan\ndo multiple\nthings');

      expect(result.mentions).toHaveLength(1);
      expect(result.instruction).toContain('do multiple');
    });
  });

  describe('special characters around mentions', () => {
    it('should stop mention at special character', () => {
      const result = parseMentions('@plan, do it');

      expect(result.mentions[0]?.shortcutName).toBe('plan');
      expect(result.instruction).toContain('do it');
    });

    it('should handle mention followed by period', () => {
      const result = parseMentions('@plan. Run it.');

      expect(result.mentions[0]?.shortcutName).toBe('plan');
    });

    it('should handle mention in parentheses', () => {
      const result = parseMentions('run (@plan) now');

      expect(result.mentions[0]?.shortcutName).toBe('plan');
    });

    it('should handle mention with colon', () => {
      const result = parseMentions('@plan: do something');

      expect(result.mentions[0]?.shortcutName).toBe('plan');
      expect(result.instruction).toContain('do something');
    });
  });
});

describe('Mention type', () => {
  it('should have the correct shape', () => {
    const mention: Mention = {
      shortcutName: 'test',
      startIndex: 0,
      endIndex: 5,
    };

    expect(mention.shortcutName).toBe('test');
    expect(typeof mention.startIndex).toBe('number');
    expect(typeof mention.endIndex).toBe('number');
  });
});

describe('ParsedMentionResult type', () => {
  it('should have the correct shape', () => {
    const result: ParsedMentionResult = {
      mentions: [{ shortcutName: 'test', startIndex: 0, endIndex: 5 }],
      instruction: 'do something',
    };

    expect(Array.isArray(result.mentions)).toBe(true);
    expect(typeof result.instruction).toBe('string');
  });
});
