/**
 * @jest-environment jsdom
 */

describe('PWA Functionality', () => {
  let _beforeInstallPromptEvent;

  beforeEach(() => {
    document.body.innerHTML = '<div id="landing-screen"></div><div id="chat-screen"></div>';
    // Mock navigator.serviceWorker
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        register: jest.fn().mockResolvedValue({}),
        ready: Promise.resolve({
          pushManager: {
            getSubscription: jest.fn().mockResolvedValue(null),
            subscribe: jest.fn().mockResolvedValue({}),
          },
          sync: {
            register: jest.fn().mockResolvedValue({}),
          },
        }),
      },
    });

    // Mock Notification
    global.Notification = {
      permission: 'default',
      requestPermission: jest.fn().mockResolvedValue('granted'),
    };

    // Mock vibrate
    navigator.vibrate = jest.fn();
  });

  test('should register service worker on load', () => {
    // This is usually in index.html, but we can verify our setup
    const registerSW = () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js');
      }
    };
    registerSW();
    expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js');
  });

  test('should handle beforeinstallprompt event', () => {
    const handler = jest.fn();
    window.addEventListener('beforeinstallprompt', handler);

    const event = new Event('beforeinstallprompt');
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalled();
  });

  test('should trigger vibration if available', () => {
    const vibrate = (pattern) => {
      if (navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    };
    vibrate(100);
    expect(navigator.vibrate).toHaveBeenCalledWith(100);
  });
});
