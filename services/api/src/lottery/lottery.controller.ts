import { Body, Controller, Get, Param, Patch, Post, Put, Query } from "@nestjs/common";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumberString,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min,
} from "class-validator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/access.decorators";
import type { Principal } from "../common/guards/jwt-auth.guard";
import { LotteryService } from "./lottery.service";

class GameDto {
  @Matches(/^[A-Z0-9_-]{2,40}$/) code!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsInt() @Min(0) cutoffSeconds!: number;
  @IsInt() @Min(1) @Max(20) resultDigits!: number;
}
class BetTypeDto {
  @Matches(/^[A-Z0-9_-]{2,40}$/) code!: string;
  @IsString() name!: string;
  @IsInt() @Min(1) selectionCount!: number;
  @IsInt() @Min(0) numberMin!: number;
  @IsInt() numberMax!: number;
  @IsBoolean() allowRepeats!: boolean;
}
class DrawDto {
  @IsString() gameId!: string;
  @IsString() drawNumber!: string;
  @IsDateString() drawDate!: string;
  @IsDateString() opensAt!: string;
  @IsDateString() closesAt!: string;
  @IsDateString() resultAt!: string;
}
class TransitionDto {
  @Matches(/^(SCHEDULED|OPEN|CLOSED|RESULT_PENDING|RESULT_PUBLISHED|CANCELLED)$/)
  status!: any;
  @IsOptional() @IsObject() result?: Record<string, unknown>;
}
class OddsDto {
  @IsString() gameId!: string;
  @IsString() betTypeId!: string;
  @IsString() multiplier!: string;
  @IsDateString() startsAt!: string;
  @IsOptional() @IsDateString() endsAt?: string;
  @IsOptional() @IsInt() @Min(1) @Max(3) resultPosition?: number;
}
class BoletPayoutDto {
  @IsString() gameId!: string;
  @IsArray() @ArrayMinSize(3) @ArrayMaxSize(3) @IsNumberString({}, { each: true })
  multipliers!: string[];
}
class LimitDto {
  @Matches(/^(TENANT|BRANCH|MERCHANT|GAME|DRAW|BET_TYPE|NUMBER)$/) scope!: any;
  @IsOptional() @IsString() scopeId?: string;
  @IsOptional() @IsString() gameId?: string;
  @IsOptional() @IsString() drawId?: string;
  @IsOptional() @IsString() betTypeId?: string;
  @IsOptional() @IsString() numberKey?: string;
  @IsOptional() @IsString() minStake?: string;
  @IsOptional() @IsString() maxStake?: string;
  @IsOptional() @IsString() maxExposure?: string;
  @IsDateString() startsAt!: string;
}
class MarketDto {
  @Matches(/^[A-Z0-9_-]{2,40}$/) code!: string;
  @IsString() name!: string;
}
class ScheduleDto {
  @IsString() gameId!: string;
  @IsOptional() @IsString() marketId?: string;
  @IsInt() @Min(0) @Max(6) weekday!: number;
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) opensAt!: string;
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) closesAt!: string;
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) resultAt!: string;
  @IsString() timezone!: string;
}
class GameSettingsDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsUrl({ require_protocol: true, protocols: ["https"] }) logoUrl?: string;
}
class CatalogStatusDto { @IsBoolean() enabled!: boolean; }
class ScheduleStatusDto {
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) opensAt?: string;
  @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) closesAt?: string;
  @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) resultAt?: string;
}
class ScheduleSlotStatusDto {
  @IsString() gameId!: string;
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) resultAt!: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) opensAt?: string;
  @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) closesAt?: string;
}
class RuleDto {
  @IsString() jurisdictionCode!: string;
  @IsString() key!: string;
  @IsObject() value!: Record<string, unknown>;
  @IsDateString() effectiveFrom!: string;
  @IsOptional() @IsDateString() effectiveTo?: string;
}
class FreeMaryajSettingsDto {
  @Matches(/^[A-Za-z]{2}$/) countryCode!: string;
  @IsNumberString() minimumAmount!: string;
  @IsInt() @Min(1) @Max(10) freeTicketCount!: number;
  @IsOptional() @IsNumberString() payoutAmount?: string | null;
}

@Controller("lottery")
export class LotteryController {
  constructor(private service: LotteryService) {}
  @Get("catalog") @RequirePermissions("tickets.view")
  catalog(@CurrentUser() u: Principal) { return this.service.catalog(u); }
  @Post("catalog/install") @RequirePermissions("settings.edit")
  installCatalog(@CurrentUser() u: Principal) { return this.service.installHaitiCatalog(u); }
  @Patch("catalog/:catalogCode") @RequirePermissions("settings.edit")
  catalogStatus(@CurrentUser() u: Principal, @Param("catalogCode") code: string, @Body() dto: CatalogStatusDto) { return this.service.setCatalogStatus(u, code, dto.enabled); }
  @Get("settings") @RequirePermissions("settings.view")
  settings(@CurrentUser() u: Principal) { return this.service.settings(u); }
  @Get("free-maryaj-settings") @RequirePermissions("settings.view")
  freeMaryajSettings(@CurrentUser() u: Principal, @Query("countryCode") countryCode: string) { return this.service.freeMaryajSettings(u, countryCode); }
  @Put("free-maryaj-settings") @RequirePermissions("settings.edit")
  updateFreeMaryajSettings(@CurrentUser() u: Principal, @Body() dto: FreeMaryajSettingsDto) { return this.service.updateFreeMaryajSettings(u, dto); }
  @Get("games") @RequirePermissions("tickets.view")
  games(@CurrentUser() u: Principal) { return this.service.games(u); }
  @Post("games") @RequirePermissions("settings.edit")
  game(@CurrentUser() u: Principal, @Body() dto: GameDto) { return this.service.createGame(u, dto); }
  @Patch("games/:id") @RequirePermissions("settings.edit")
  gameSettings(@CurrentUser() u: Principal, @Param("id") id: string, @Body() dto: GameSettingsDto) { return this.service.updateGame(u, id, dto); }
  @Post("markets") @RequirePermissions("settings.edit")
  market(@CurrentUser() u: Principal, @Body() dto: MarketDto) { return this.service.createMarket(u, dto); }
  @Post("schedules") @RequirePermissions("settings.edit")
  schedule(@CurrentUser() u: Principal, @Body() dto: ScheduleDto) { return this.service.createSchedule(u, dto); }
  @Patch("schedules/slot") @RequirePermissions("settings.edit")
  scheduleSlotStatus(@CurrentUser() u: Principal, @Body() dto: ScheduleSlotStatusDto) { return this.service.setScheduleSlotStatus(u, dto); }
  @Patch("schedules/:id") @RequirePermissions("settings.edit")
  scheduleStatus(@CurrentUser() u: Principal, @Param("id") id: string, @Body() dto: ScheduleStatusDto) {
    if (dto.opensAt || dto.closesAt || dto.resultAt) return this.service.updateScheduleTimes(u, id, dto);
    return this.service.setScheduleStatus(u, id, dto.enabled ?? false);
  }
  @Post("bet-types") @RequirePermissions("settings.edit")
  betType(@CurrentUser() u: Principal, @Body() dto: BetTypeDto) { return this.service.createBetType(u, dto); }
  @Post("games/:gameId/bet-types/:betTypeId") @RequirePermissions("settings.edit")
  attach(@CurrentUser() u: Principal, @Param("gameId") gameId: string, @Param("betTypeId") betTypeId: string) { return this.service.attachBetType(u, gameId, betTypeId); }
  @Get("draws") @RequirePermissions("tickets.view")
  draws(@CurrentUser() u: Principal, @Query("from") from?: string, @Query("to") to?: string) { return this.service.draws(u, from, to); }
  @Post("draws") @RequirePermissions("settings.edit")
  draw(@CurrentUser() u: Principal, @Body() dto: DrawDto) { return this.service.createDraw(u, dto); }
  @Post("draws/:id/transition") @RequirePermissions("settings.edit")
  transition(@CurrentUser() u: Principal, @Param("id") id: string, @Body() dto: TransitionDto) { return this.service.transition(u, id, dto.status, dto.result); }
  @Post("odds") @RequirePermissions("settings.edit")
  odds(@CurrentUser() u: Principal, @Body() dto: OddsDto) { return this.service.createOdds(u, dto); }
  @Post("odds/bolet-payouts") @RequirePermissions("settings.edit")
  boletPayouts(@CurrentUser() u: Principal, @Body() dto: BoletPayoutDto) { return this.service.updateBoletPayouts(u, dto); }
  @Post("limits") @RequirePermissions("settings.edit")
  limit(@CurrentUser() u: Principal, @Body() dto: LimitDto) { return this.service.createLimit(u, dto); }
  @Post("rules") @RequirePermissions("settings.edit")
  rule(@CurrentUser() u: Principal, @Body() dto: RuleDto) { return this.service.createRule(u, dto); }
}
