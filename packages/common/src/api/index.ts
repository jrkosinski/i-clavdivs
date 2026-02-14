import axios from 'axios';

/**
 * Enum representing different logging levels for API operations.
 */
export enum LogLevel {
    DEBUG = 'debug',
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
}

/**
 * Type representing valid log level values.
 */
export type LogLevelType = LogLevel.DEBUG | LogLevel.INFO | LogLevel.WARN | LogLevel.ERROR;

/**
 * Base API client class providing HTTP methods with logging and error handling.
 * Wraps axios to provide consistent request/response handling across different API integrations.
 */
export class ApiClient {
    /**
     * Creates an instance of ApiClient.
     *
     * @param _baseUrl - Base URL for all API requests
     * @param _logPrefix - Prefix to use for all log messages
     */
    constructor(
        protected readonly _baseUrl: string,
        private readonly _logPrefix: string
    ) {}

    /**
     * Performs a GET request and returns the response data.
     *
     * @param url - API endpoint URL (relative to base URL or absolute)
     * @param params - Optional query parameters to append to URL
     * @param headers - Optional HTTP headers to include in request
     * @param rethrow - If true, re-throws caught errors; otherwise logs and swallows them
     * @returns Response data from the API
     */
    public async get(
        url: string,
        params?: Record<string, any>,
        headers?: Record<string, any>,
        rethrow: boolean = false
    ): Promise<any> {
        const response = await this.getRaw(url, params, headers, rethrow);
        return response?.data;
    }

    /**
     * Performs a GET request and returns the full axios response object.
     *
     * @param url - API endpoint URL (relative to base URL or absolute)
     * @param params - Optional query parameters to append to URL
     * @param headers - Optional HTTP headers to include in request
     * @param rethrow - If true, re-throws caught errors; otherwise logs and swallows them
     * @returns Full axios response object
     */
    public async getRaw(
        url: string,
        params?: Record<string, any>,
        headers?: Record<string, any>,
        rethrow: boolean = false
    ): Promise<any> {
        try {
            const queryString = this._createQueryString(params);
            this._log(LogLevel.INFO, `GET ${url}${queryString}`);

            url = url + queryString;
            const options = headers ? { headers: headers } : undefined;
            return await axios.get(this._formUrl(url), options);
        } catch (e: any) {
            this._log(
                LogLevel.ERROR,
                `Error in GET ${url}: ${e.message ?? e} ${JSON.stringify(e?.response?.data?.error ?? {})}`
            );
            if (rethrow) throw e;
        }
    }

    /**
     * Performs a PUT request and returns the response data.
     *
     * @param url - API endpoint URL (relative to base URL or absolute)
     * @param body - Request body data
     * @param headers - Optional HTTP headers to include in request
     * @param rethrow - If true, re-throws caught errors; otherwise logs and swallows them
     * @returns Response data from the API
     */
    public async put(
        url: string,
        body: Record<string, any>,
        headers?: Record<string, any>,
        rethrow: boolean = false
    ): Promise<any> {
        const response = await this.putRaw(url, body, headers, rethrow);
        return response?.data;
    }

    /**
     * Performs a PUT request and returns the full axios response object.
     *
     * @param url - API endpoint URL (relative to base URL or absolute)
     * @param body - Request body data
     * @param headers - Optional HTTP headers to include in request
     * @param rethrow - If true, re-throws caught errors; otherwise logs and swallows them
     * @returns Full axios response object
     */
    public async putRaw(
        url: string,
        body: Record<string, any>,
        headers?: Record<string, any>,
        rethrow: boolean = false
    ): Promise<any> {
        try {
            this._log(LogLevel.INFO, `PUT ${url} ${JSON.stringify(body)}`);

            return await axios.put(
                this._formUrl(url),
                body,
                headers ? { headers: headers } : undefined
            );
        } catch (e: any) {
            this._log(
                LogLevel.ERROR,
                `Error in PUT ${url}: ${e.message ?? e} ${JSON.stringify(e?.response?.data?.error ?? {})}`
            );
            if (rethrow) throw e;
        }
    }

    /**
     * Performs a POST request and returns the response data.
     *
     * @param url - API endpoint URL (relative to base URL or absolute)
     * @param body - Request body data
     * @param headers - Optional HTTP headers to include in request
     * @param rethrow - If true, re-throws caught errors; otherwise logs and swallows them
     * @returns Response data from the API
     */
    public async post(
        url: string,
        body: Record<string, any>,
        headers?: Record<string, any>,
        rethrow: boolean = false
    ): Promise<any> {
        const response = await this.postRaw(url, body, headers, rethrow);
        return response?.data;
    }

    /**
     * Performs a POST request and returns the full axios response object.
     *
     * @param url - API endpoint URL (relative to base URL or absolute)
     * @param body - Request body data
     * @param headers - Optional HTTP headers to include in request
     * @param rethrow - If true, re-throws caught errors; otherwise logs and swallows them
     * @returns Full axios response object
     */
    public async postRaw(
        url: string,
        body: Record<string, any>,
        headers?: Record<string, any>,
        rethrow: boolean = false
    ): Promise<any> {
        try {
            this._log(LogLevel.INFO, `POST ${url} ${JSON.stringify(body)}`);

            return await axios.post(
                this._formUrl(url),
                body,
                headers ? { headers: headers } : undefined
            );
        } catch (e: any) {
            this._log(
                LogLevel.ERROR,
                `Error in POST ${url}: ${e.message ?? e} ${JSON.stringify(e?.response?.data?.error ?? {})}`
            );
            if (rethrow) throw e;
        }
    }

    /**
     * Performs a DELETE request and returns the response data.
     *
     * @param url - API endpoint URL (relative to base URL or absolute)
     * @param body - Request body data
     * @param headers - Optional HTTP headers to include in request
     * @param rethrow - If true, re-throws caught errors; otherwise logs and swallows them
     * @returns Response data from the API
     */
    public async delete(
        url: string,
        body: Record<string, any>,
        headers?: Record<string, any>,
        rethrow: boolean = false
    ): Promise<any> {
        const response = await this.deleteRaw(url, body, headers, rethrow);
        return response?.data;
    }

    /**
     * Performs a DELETE request and returns the full axios response object.
     * Note: Currently uses POST method internally (appears to be a bug).
     *
     * @param url - API endpoint URL (relative to base URL or absolute)
     * @param body - Request body data
     * @param headers - Optional HTTP headers to include in request
     * @param rethrow - If true, re-throws caught errors; otherwise logs and swallows them
     * @returns Full axios response object
     */
    public async deleteRaw(
        url: string,
        body: Record<string, any>,
        headers?: Record<string, any>,
        rethrow: boolean = false
    ): Promise<any> {
        try {
            this._log(LogLevel.INFO, `DELETE ${url} ${JSON.stringify(body)}`);

            return await axios.delete(this._formUrl(url), {
                data: body,
                ...(headers && { headers }),
            });
        } catch (e: any) {
            this._log(
                LogLevel.ERROR,
                `Error in DELETE ${url}: ${e.message ?? e} ${JSON.stringify(e?.response?.data?.error ?? {})}`
            );
            if (rethrow) throw e;
        }
    }

    /**
     * Logs a message with the specified log level.
     *
     * @param level - Log level for the message
     * @param message - Message to log
     */
    protected _log(level: LogLevelType, message: string) {
        //TODO: beef up this logging
        console.log(`[${this._logPrefix}] ${level}: ${message}`);
    }

    /**
     * Creates a URL query string from parameters object.
     * Encodes keys and values for safe URL usage.
     *
     * @param params - Object containing query parameters
     * @returns Formatted query string with leading '?' or empty string
     */
    protected _createQueryString(params: any): string {
        const queryParts: string[] = [];
        for (const key in params) {
            if (params.hasOwnProperty(key)) {
                queryParts.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
            }
        }
        let output = queryParts.join('&');
        if (output.length > 0) {
            output = '?' + output;
        }
        return output;
    }

    /**
     * Forms a complete URL by combining base URL with endpoint.
     * Handles absolute URLs and ensures proper path joining with slashes.
     *
     * @param endpoint - API endpoint path (relative or absolute)
     * @returns Complete URL ready for request
     */
    protected _formUrl(endpoint: string): string {
        endpoint = endpoint.trim();
        if (endpoint.startsWith('http')) {
            return endpoint;
        }
        if (this._baseUrl.endsWith('/')) {
            if (endpoint.startsWith('/')) {
                endpoint = endpoint.substring(1);
            }
        } else {
            if (!endpoint.startsWith('/')) {
                endpoint = '/' + endpoint;
            }
        }
        return `${this._baseUrl}${endpoint}`;
    }
}
