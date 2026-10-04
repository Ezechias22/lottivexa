import { Body, Controller, Get, Put } from '@nestjs/common';
import { IsHexColor, IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireFeature, RequirePermissions } from '../common/decorators/access.decorators';
import type { Principal } from '../common/guards/jwt-auth.guard';
import { SettingsService } from './settings.service';
import { SUPPORTED_COUNTRY_CODES } from '../tenants/country-currency-policy';

class SettingsDto {
  @IsIn(SUPPORTED_COUNTRY_CODES) countryCode!: string;
  @IsString() timezone!: string;
  @IsString() locale!: string;
  @IsString() dateFormat!: string;
}

const imageValue = /^(https:\/\/|data:image\/(?:png|jpeg|webp|svg\+xml);base64,)[A-Za-z0-9+/=._~:/?%-]+$/;
class BrandingDto {
  @IsString() businessName!: string;
  @IsOptional() @IsString() @MaxLength(7000000) @Matches(imageValue) logoUrl?: string;
  @IsOptional() @IsString() @MaxLength(7000000) @Matches(imageValue) faviconUrl?: string;
  @IsHexColor() primaryColor!: string;
  @IsHexColor() secondaryColor!: string;
}

@Controller('settings')
export class SettingsController {
  constructor(private service: SettingsService) {}
  @Get() @RequirePermissions('settings.view') get(@CurrentUser() u: Principal) { return this.service.get(u); }
  @Put() @RequirePermissions('settings.edit') settings(@CurrentUser() u: Principal, @Body() dto: SettingsDto) { return this.service.settings(u, dto); }
  @Put('branding') @RequireFeature('custom_branding') @RequirePermissions('settings.edit') branding(@CurrentUser() u: Principal, @Body() dto: BrandingDto) { return this.service.branding(u, dto); }
}
