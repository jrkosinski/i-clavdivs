/**
 * @title ServiceMethodOutput
 * @description
 */
export type ServiceMethodOutput<T> = {
    code?: number;
    message?: string;
    data?: T;
};
