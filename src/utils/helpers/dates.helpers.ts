import { addSeconds, subSeconds, isBefore, formatISO, parseISO, format } from 'date-fns';


export const addSecondsToTime = (date: Date | number, seconds: number): Date => {
    return addSeconds(date, seconds);
}

export const subSecondsToTime = (date: Date | number, seconds: number): Date => {
    return subSeconds(date, seconds);
}

export const isDateBeforeDate = (date: Date | number, dateToCompare: Date | number): boolean => {
    return isBefore(date, dateToCompare);
}

export const formatISOString = (date: Date | number, options?: { format?: 'extended' | 'basic', representation?: 'complete' | 'date' | 'time' }): string => {
    return options ? formatISO(date, options) : formatISO(date);
}

export const parseISOString = (date: string, options?: { additionalDigits?: 0 | 1 | 2 }): Date => {
    return options ? parseISO(date, options) : parseISO(date);
}

export const formatDate = (date: Date | number, _format: string, options?: {
    locale?: Locale;
    weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    firstWeekContainsDate?: number;
    useAdditionalWeekYearTokens?: boolean;
    useAdditionalDayOfYearTokens?: boolean;
}): string => {
    return options ? format(date, _format, options) : format(date, _format);
}