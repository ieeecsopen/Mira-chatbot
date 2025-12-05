/**
 * Notifications Module for MIRA
 * Handles browser notifications for long-running tasks
 */

const NOTIFICATION_PREF_KEY = 'mira-notifications-enabled';
const MIRA_ICON = '/mira-icon.png'; // Fallback icon

export interface NotificationOptions {
    title: string;
    body?: string;
    icon?: string;
    tag?: string;
    onClick?: () => void;
}

/**
 * Check if the Notification API is supported
 */
export function isNotificationSupported(): boolean {
    return 'Notification' in window;
}

/**
 * Get the current notification permission state
 */
export function getPermissionState(): NotificationPermission | 'unsupported' {
    if (!isNotificationSupported()) return 'unsupported';
    return Notification.permission;
}

/**
 * Request notification permission from the user
 */
export async function requestPermission(): Promise<boolean> {
    if (!isNotificationSupported()) {
        console.warn('Notifications are not supported in this browser');
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission === 'denied') {
        console.warn('Notification permission was previously denied');
        return false;
    }

    try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    } catch (error) {
        console.error('Error requesting notification permission:', error);
        return false;
    }
}

/**
 * Check if the browser tab is currently focused
 */
export function isTabFocused(): boolean {
    return document.visibilityState === 'visible' && document.hasFocus();
}

/**
 * Check if notifications are enabled by user preference
 */
export function isNotificationEnabled(): boolean {
    try {
        const stored = localStorage.getItem(NOTIFICATION_PREF_KEY);
        // Default to true if not set
        return stored === null ? true : stored === 'true';
    } catch {
        return true;
    }
}

/**
 * Set notification preference
 */
export function setNotificationEnabled(enabled: boolean): void {
    try {
        localStorage.setItem(NOTIFICATION_PREF_KEY, String(enabled));
    } catch (error) {
        console.warn('Failed to save notification preference:', error);
    }
}

/**
 * Send a browser notification
 */
export function sendNotification(options: NotificationOptions): Notification | null {
    if (!isNotificationSupported()) {
        console.warn('Notifications not supported');
        return null;
    }

    if (Notification.permission !== 'granted') {
        console.warn('Notification permission not granted');
        return null;
    }

    if (!isNotificationEnabled()) {
        console.log('Notifications disabled by user preference');
        return null;
    }

    try {
        const notification = new Notification(options.title, {
            body: options.body,
            icon: options.icon || MIRA_ICON,
            tag: options.tag || 'mira-notification',
            badge: MIRA_ICON,
            silent: false,
        });

        // Handle click - focus the window
        notification.onclick = () => {
            window.focus();
            notification.close();
            options.onClick?.();
        };

        // Auto-close after 5 seconds
        setTimeout(() => notification.close(), 5000);

        return notification;
    } catch (error) {
        console.error('Error sending notification:', error);
        return null;
    }
}

/**
 * Send a notification only if the tab is not focused
 * This is the main function to use for background notifications
 */
export function notifyIfBackground(options: NotificationOptions): Notification | null {
    if (isTabFocused()) {
        console.log('Tab is focused, skipping notification');
        return null;
    }

    return sendNotification(options);
}

/**
 * Notification manager for tracking response times and sending appropriate notifications
 */
class NotificationManager {
    private responseStartTime: number | null = null;
    private minimumResponseTime: number = 3000; // 3 seconds minimum before notifying

    /**
     * Call when a response starts streaming
     */
    startTracking(): void {
        this.responseStartTime = Date.now();
    }

    /**
     * Call when a response completes
     * Will send a notification if:
     * - Tab is not focused
     * - Response took longer than minimum time
     * - Notifications are enabled
     */
    async onResponseComplete(preview?: string): Promise<void> {
        if (!this.responseStartTime) return;

        const elapsed = Date.now() - this.responseStartTime;
        this.responseStartTime = null;

        // Only notify for longer responses
        if (elapsed < this.minimumResponseTime) {
            console.log(`Response completed in ${elapsed}ms, skipping notification (< ${this.minimumResponseTime}ms)`);
            return;
        }

        // Request permission if not yet granted
        if (getPermissionState() === 'default') {
            const granted = await requestPermission();
            if (!granted) return;
        }

        // Truncate preview
        const truncatedPreview = preview
            ? preview.length > 100
                ? preview.substring(0, 97) + '...'
                : preview
            : 'Your AI response is ready';

        notifyIfBackground({
            title: '✨ Mira has responded',
            body: truncatedPreview,
            tag: 'mira-response-complete',
        });
    }

    /**
     * Set the minimum response time before notifications are sent
     */
    setMinimumResponseTime(ms: number): void {
        this.minimumResponseTime = ms;
    }
}

// Singleton instance
export const notificationManager = new NotificationManager();

// Export convenience functions
export const notifications = {
    requestPermission,
    send: sendNotification,
    notifyIfBackground,
    isEnabled: isNotificationEnabled,
    setEnabled: setNotificationEnabled,
    isSupported: isNotificationSupported,
    getPermission: getPermissionState,
    manager: notificationManager,
};

export default notifications;
