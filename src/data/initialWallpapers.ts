import { Wallpaper } from '../types';
import { WALLPAPERS_DATA } from './wallpapersData';

/**
 * Static Wallpapers Repository Data
 * Embedded static typed array of 4K & Mobile wallpapers served directly from /public/wallpapers/
 * and compatible with Cloudflare Pages global static CDN delivery.
 */
export const INITIAL_WALLPAPERS: Wallpaper[] = Array.isArray(WALLPAPERS_DATA) ? WALLPAPERS_DATA : [];


