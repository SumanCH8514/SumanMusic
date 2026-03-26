import { ENV } from '../config/env';


const noop = () => {};

const logger = {
    info: ENV.IS_DEV ? console.log.bind(console, '[INFO]') : noop,
    warn: ENV.IS_DEV ? console.warn.bind(console, '[WARN]') : noop,
    error: console.error.bind(console, '[ERROR]'),
    
    track: (event, data) => {
        if (ENV.IS_DEV) {
            console.log(`[TRACK] ${event}`, data);
        }
    }
};

export default logger;
