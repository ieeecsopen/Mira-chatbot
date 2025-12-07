import { loadPyodide, type PyodideInterface } from 'pyodide';

let pyodideInstance: PyodideInterface | null = null;
let isLoading = false;
let initPromise: Promise<PyodideInterface> | null = null;

// Standard library packages to load by default
const DEFAULT_PACKAGES = ['numpy', 'pandas', 'matplotlib'];

export interface PythonExecutionResult {
    success: boolean;
    output: string[];
    error?: string;
    image?: string; // Base64 encoded image (for plots)
    executionTime: number;
}

/**
 * Initialize Pyodide lazily
 */
export async function initPyodide(): Promise<PyodideInterface> {
    if (pyodideInstance) return pyodideInstance;
    if (initPromise) return initPromise;

    isLoading = true;
    console.log('🐍 Initializing Python environment...');

    initPromise = (async () => {
        try {
            const pyodide = await loadPyodide({
                indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/',
            });

            // Load default packages
            await pyodide.loadPackage(DEFAULT_PACKAGES);

            // Setup matplotlib environment for web
            await pyodide.runPythonAsync(`
                import matplotlib
                matplotlib.use('Agg')
                import matplotlib.pyplot as plt
                import io
                import base64
            `);

            pyodideInstance = pyodide;
            console.log('🐍 Python environment ready');
            return pyodide;
        } catch (error) {
            console.error('Failed to initialize Pyodide:', error);
            isLoading = false;
            initPromise = null;
            throw error;
        } finally {
            isLoading = false;
        }
    })();

    return initPromise;
}

/**
 * Execute Python code in the sandbox
 */
export async function executePython(code: string): Promise<PythonExecutionResult> {
    const startTime = performance.now();
    let stdout: string[] = [];

    try {
        const pyodide = await initPyodide();

        // Capture stdout
        pyodide.setStdout({
            batched: (text) => stdout.push(text),
        });

        // Wrap code to handle plotting
        const wrappedCode = `
import sys
import io
import base64
import matplotlib.pyplot as plt

# Clear any previous plots
plt.clf()

# Redirect stdout/stderr (handled by pyodide.setStdout/setStderr, but good to be safe)
class IOSubst(io.StringIO):
    def flush(self):
        pass

# Execute user code
${code}

# Check if a plot was created using gcf() (Get Current Figure)
# and if it has any content (axes)
has_plot = False
if plt.get_fignums():
    has_plot = True

img_str = ""
if has_plot:
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    buf.seek(0)
    img_str = base64.b64encode(buf.read()).decode('utf-8')
    plt.close()

img_str
`;

        const result = await pyodide.runPythonAsync(wrappedCode);

        // Result is the last expression value (img_str)
        const image = result !== 'False' && result !== '' ? `data:image/png;base64,${result}` : undefined;

        // If the code ended with an expression that wasn't captured in stdout (and isn't the image), add it
        // Note: runPythonAsync returns the result of the last expression
        // But our wrapped code returns the image string. 
        // We rely on 'print()' in python for output, which writes to stdout.

        return {
            success: true,
            output: stdout,
            image,
            executionTime: performance.now() - startTime
        };

    } catch (error) {
        return {
            success: false,
            output: stdout,
            error: (error as Error).message,
            executionTime: performance.now() - startTime
        };
    }
}

export function isPythonReady(): boolean {
    return !!pyodideInstance;
}
