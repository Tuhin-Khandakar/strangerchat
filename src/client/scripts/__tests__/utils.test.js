/**
 * @jest-environment jsdom
 */
import { sanitizeInput, showToast, showConfirm, announce, ICONS } from '../utils';

describe('utils.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('ICONS', () => {
    test('should contain all required icons', () => {
      expect(ICONS).toHaveProperty('check');
      expect(ICONS).toHaveProperty('clock');
      expect(ICONS).toHaveProperty('error');
    });

    test('should have valid SVG strings', () => {
      Object.values(ICONS).forEach((icon) => {
        expect(icon).toContain('<svg');
        expect(icon).toContain('</svg>');
        expect(icon).toContain('aria-hidden="true"');
      });
    });
  });

  describe('sanitizeInput', () => {
    test('should escape HTML characters', () => {
      const input = '<script>alert("xss")</script>';
      const expected = '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;';
      expect(sanitizeInput(input)).toBe(expected);
    });

    test('should trim whitespace', () => {
      const input = '   hello world   ';
      expect(sanitizeInput(input)).toBe('hello world');
    });

    test('should remove control characters', () => {
      const input = 'hello\u0000world';
      expect(sanitizeInput(input)).toBe('helloworld');
    });

    test('should return empty string for null/undefined', () => {
      expect(sanitizeInput(null)).toBe('');
      expect(sanitizeInput(undefined)).toBe('');
    });

    test('should escape all special characters', () => {
      const input = '& < > " \' /';
      const result = sanitizeInput(input);
      expect(result).not.toContain('&');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
      expect(result).toContain('&amp;');
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
    });

    test('should remove zero-width characters', () => {
      const input = 'hello\u200Bworld\u200C\u200D';
      expect(sanitizeInput(input)).toBe('helloworld');
    });

    test('should preserve newlines and tabs', () => {
      const input = 'hello\nworld\ttab';
      const result = sanitizeInput(input);
      expect(result).toContain('\n');
      expect(result).toContain('\t');
    });

    test('should handle empty strings', () => {
      expect(sanitizeInput('')).toBe('');
    });

    test('should handle unicode characters', () => {
      const input = 'Hello 世界 🌍';
      const result = sanitizeInput(input);
      expect(result).toContain('世界');
      expect(result).toContain('🌍');
    });
  });

  describe('announce', () => {
    beforeEach(() => {
      const announcer = document.createElement('div');
      announcer.id = 'announcer';
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      document.body.appendChild(announcer);
    });

    test('should announce message with polite priority by default', () => {
      announce('Test message');
      jest.advanceTimersByTime(100);
      const announcer = document.getElementById('announcer');
      expect(announcer.textContent).toBe('Test message');
      expect(announcer.getAttribute('aria-live')).toBe('polite');
    });

    test('should announce message with assertive priority', () => {
      announce('Urgent message', 'assertive');
      jest.advanceTimersByTime(100);
      const announcer = document.getElementById('announcer');
      expect(announcer.textContent).toBe('Urgent message');
      expect(announcer.getAttribute('aria-live')).toBe('assertive');
    });

    test('should clear previous message before announcing', () => {
      const announcer = document.getElementById('announcer');
      announcer.textContent = 'Old message';
      announce('New message');
      expect(announcer.textContent).toBe('');
      jest.advanceTimersByTime(100);
      expect(announcer.textContent).toBe('New message');
    });

    test('should handle missing announcer element gracefully', () => {
      document.getElementById('announcer').remove();
      expect(() => announce('Test')).not.toThrow();
    });
  });

  describe('showToast', () => {
    test('should create toast container if not exists', () => {
      showToast('test message');
      const container = document.querySelector('.toast-container');
      expect(container).not.toBeNull();
      expect(container.getAttribute('role')).toBe('status');
      expect(container.getAttribute('aria-live')).toBe('polite');
    });

    test('should reuse existing toast container', () => {
      showToast('message 1');
      showToast('message 2');
      const containers = document.querySelectorAll('.toast-container');
      expect(containers.length).toBe(1);
    });

    test('should add success toast with correct icon', () => {
      showToast('Success message', 'success');
      const toast = document.querySelector('.toast.success');
      expect(toast).not.toBeNull();
      expect(toast.textContent).toContain('✅');
      expect(toast.textContent).toContain('Success message');
    });

    test('should add error toast with alert role', () => {
      showToast('Error message', 'error');
      const toast = document.querySelector('.toast.error');
      expect(toast).not.toBeNull();
      expect(toast.getAttribute('role')).toBe('alert');
      expect(toast.textContent).toContain('⚠️');
    });

    test('should add info toast', () => {
      showToast('Info message', 'info');
      const toast = document.querySelector('.toast.info');
      expect(toast).not.toBeNull();
      expect(toast.textContent).toContain('ℹ️');
    });

    test('should add warning toast', () => {
      showToast('Warning message', 'warning');
      const toast = document.querySelector('.toast.warning');
      expect(toast).not.toBeNull();
      expect(toast.textContent).toContain('🔔');
    });

    test('should auto-remove toast after timeout', () => {
      showToast('test message');
      const toast = document.querySelector('.toast');
      expect(toast).not.toBeNull();

      jest.advanceTimersByTime(4000);
      expect(toast.style.opacity).toBe('0');

      jest.advanceTimersByTime(300);
      expect(document.querySelector('.toast')).toBeNull();
    });

    test('should handle multiple toasts', () => {
      showToast('message 1', 'success');
      showToast('message 2', 'error');
      showToast('message 3', 'info');
      const toasts = document.querySelectorAll('.toast');
      expect(toasts.length).toBe(3);
    });
  });

  describe('showConfirm', () => {
    test('should render modal with correct title and message', () => {
      showConfirm('Confirm title', 'Confirm message', 'OK', () => {});
      expect(document.querySelector('#modal-title').textContent).toBe('Confirm title');
      expect(document.querySelector('#modal-desc').textContent).toBe('Confirm message');
    });

    test('should have proper ARIA attributes', () => {
      showConfirm('Title', 'Message', 'Confirm', () => {});
      const modal = document.querySelector('.modal');
      expect(modal.getAttribute('role')).toBe('dialog');
      expect(modal.getAttribute('aria-modal')).toBe('true');
      expect(modal.getAttribute('aria-labelledby')).toBe('modal-title');
      expect(modal.getAttribute('aria-describedby')).toBe('modal-desc');
    });

    test('should call onConfirm when confirm button is clicked', () => {
      const onConfirm = jest.fn();
      showConfirm('Title', 'Message', 'Confirm', onConfirm);
      const confirmBtn = document.querySelector('.modal-btn.confirm');
      confirmBtn.click();
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    test('should remove overlay when cancel is clicked', () => {
      showConfirm('Title', 'Message', 'Confirm', () => {});
      const cancelBtn = document.querySelector('.modal-btn.cancel');
      cancelBtn.click();
      jest.advanceTimersByTime(200);
      expect(document.querySelector('.modal-overlay')).toBeNull();
    });

    test('should close on Escape key', () => {
      showConfirm('Title', 'Message', 'Confirm', () => {});
      const overlay = document.querySelector('.modal-overlay');
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      overlay.dispatchEvent(event);
      jest.advanceTimersByTime(200);
      expect(document.querySelector('.modal-overlay')).toBeNull();
    });

    test('should close when clicking overlay background', () => {
      showConfirm('Title', 'Message', 'Confirm', () => {});
      const overlay = document.querySelector('.modal-overlay');
      overlay.click();
      jest.advanceTimersByTime(200);
      expect(document.querySelector('.modal-overlay')).toBeNull();
    });

    test('should not close when clicking modal content', () => {
      showConfirm('Title', 'Message', 'Confirm', () => {});
      const modal = document.querySelector('.modal');
      modal.click();
      jest.advanceTimersByTime(200);
      expect(document.querySelector('.modal-overlay')).not.toBeNull();
    });

    test('should trap focus within modal', () => {
      const previousElement = document.createElement('button');
      document.body.appendChild(previousElement);
      previousElement.focus();

      showConfirm('Title', 'Message', 'Confirm', () => {});

      jest.advanceTimersByTime(50);
      const confirmBtn = document.querySelector('.modal-btn.confirm');
      expect(document.activeElement).toBe(confirmBtn);
    });

    test('should restore focus to previous element on close', () => {
      const previousElement = document.createElement('button');
      document.body.appendChild(previousElement);
      previousElement.focus();

      showConfirm('Title', 'Message', 'Confirm', () => {});
      const cancelBtn = document.querySelector('.modal-btn.cancel');
      cancelBtn.click();

      jest.advanceTimersByTime(200);
      expect(document.activeElement).toBe(previousElement);
    });

    test('should handle Tab key for focus trapping', () => {
      showConfirm('Title', 'Message', 'Confirm', () => {});
      const cancelBtn = document.querySelector('.modal-btn.cancel');
      const confirmBtn = document.querySelector('.modal-btn.confirm');

      // Tab from confirm to cancel (wrap around)
      confirmBtn.focus();
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
      document.dispatchEvent(tabEvent);

      // Should stay within modal
      expect([cancelBtn, confirmBtn]).toContain(document.activeElement);
    });

    test('should handle Shift+Tab for reverse focus trapping', () => {
      showConfirm('Title', 'Message', 'Confirm', () => {});
      const cancelBtn = document.querySelector('.modal-btn.cancel');
      const confirmBtn = document.querySelector('.modal-btn.confirm');

      // Shift+Tab from cancel to confirm (wrap around)
      cancelBtn.focus();
      const shiftTabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
      });
      document.dispatchEvent(shiftTabEvent);

      // Should stay within modal
      expect([cancelBtn, confirmBtn]).toContain(document.activeElement);
    });
  });
});
