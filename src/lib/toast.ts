import { toast } from 'sonner';

// Toast utility functions for consistent notifications across the app

export const showSuccess = (message: string, description?: string) => {
    toast.success(message, {
        description,
        duration: 3000,
    });
};

export const showError = (message: string, description?: string) => {
    toast.error(message, {
        description,
        duration: 5000,
    });
};

export const showInfo = (message: string, description?: string) => {
    toast.info(message, {
        description,
        duration: 4000,
    });
};

export const showWarning = (message: string, description?: string) => {
    toast.warning(message, {
        description,
        duration: 4000,
    });
};

export const showLoading = (message: string) => {
    return toast.loading(message);
};

export const dismissToast = (toastId: string | number) => {
    toast.dismiss(toastId);
};

export const showPromise = <T,>(
    promise: Promise<T>,
    messages: {
        loading: string;
        success: string | ((data: T) => string);
        error: string | ((error: Error) => string);
    }
) => {
    return toast.promise(promise, messages);
};

// Re-export toast for direct access
export { toast };
