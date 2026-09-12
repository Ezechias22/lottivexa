import { SetMetadata } from '@nestjs/common';
export const PUBLIC_KEY = 'public';
export const IS_PUBLIC = () => SetMetadata(PUBLIC_KEY, true);
export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions:string[]) => SetMetadata(PERMISSIONS_KEY, permissions);
export const PLATFORM_ONLY_KEY = 'platformOnly';
export const PlatformOnly = () => SetMetadata(PLATFORM_ONLY_KEY, true);
export const FEATURE_KEY = 'planFeature';
export const RequireFeature = (feature:string) => SetMetadata(FEATURE_KEY, feature);
