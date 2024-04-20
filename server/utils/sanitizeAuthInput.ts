interface SanitizerOptions {
    /**
     * List of allowed HTML tags and attributes.
     * Example: ['a', 'img', { tag: 'div', attributes: ['class', 'id'] }]
     */
    allowList?: (string | { tag: string; attributes: string[] })[];

    /**
     * Boolean indicating whether to encode special HTML characters.
     * Default: true
     */
    encodeHTML?: boolean;
}

/**
 * Sanitize input data to prevent XSS attacks.
 * @param input The input data to sanitize.
 * @param options Options for customizing sanitization behavior.
 * @returns The sanitized input data.
 */
const sanitizeInput = (input: string, options: SanitizerOptions = {}): string => {
    // Default options
    const defaultOptions: SanitizerOptions = {
        allowList: [], // List of allowed HTML tags and attributes
        encodeHTML: true // Encode special HTML characters like <, >, &, etc.
    };

    // Merge default options with provided options
    const mergedOptions = { ...defaultOptions, ...options };

    // Regular expression to match HTML tags
    const htmlTagRegex = /<\/?[^>]+(>|$)/g;

    // Replace HTML tags with allowed tags if specified
    let sanitizedInput = input.replace(htmlTagRegex, (tag) => {
        if (mergedOptions.allowList?.includes(tag.toLowerCase())) { // Use optional chaining here
            return tag;
        } else {
            return ''; // Remove the tag if not in the allow list
        }
    });

    // Encode special HTML characters if specified
    if (mergedOptions.encodeHTML) {
        sanitizedInput = encodeHTML(sanitizedInput);
    }

    return sanitizedInput;
};

/**
 * Encode special HTML characters to prevent XSS attacks.
 * @param input The input data to encode.
 * @returns The encoded input data.
 */
const encodeHTML = (input: string): string => {
    return input.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
};

export { sanitizeInput };
