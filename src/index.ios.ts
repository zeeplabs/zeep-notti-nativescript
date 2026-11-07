import { createIosNative } from './native/native.ios';
import { createNotti } from './notti';

export type { InitializeOptions, NottiApi, NottiUserApi } from './notti';

export const Notti = createNotti(createIosNative());
