import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BaseController } from '../../core/base/base.controller';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { user_role } from '../../common/enums/user-role.enum';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { User } from './user.entity';
import { UserService } from './user.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';

/**
 * Generic user CRUD surface at /api/users. Authenticated (JwtAuthGuard) —
 * every route re-checks the session, so an anonymous request answers 401.
 * `findAll` returns the paginated { items, meta } envelope; `remove` answers 204;
 * create / findOne / update are inherited from BaseController. The concrete DTO
 * classes are handed to super() so the inherited create/update validate the body
 * (400 on a malformed payload) — the generic @Body() type erases at runtime and
 * would otherwise skip validation. Account flows (register/login, role changes,
 * suspend-if-has-orders) live on /api/auth and /api/admin/users — see
 * AuthController and AdminConsoleController.
 */
@ApiTags('users')
/**
 * ADMIN ONLY at the class level, and deliberately so.
 *
 * This controller inherits BaseController's CRUD — `GET /users`, `GET /users/:id`,
 * `PATCH /users/:id`, `POST /users`, `DELETE /users/:id` — and carried nothing but
 * JwtAuthGuard. Any signed-in account could therefore list every user on the
 * platform with their email addresses, edit anyone's profile, and delete anyone:
 * a student's own token was enough. Verified against the deployed API before this
 * guard was added (GET /api/users returned 19 accounts to a student, and a PATCH
 * of another person's profile was accepted).
 *
 * The two `/me` routes below carry their own @Roles and so are reachable by every
 * signed-in role — RolesGuard reads the handler's metadata over the class's.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', user_role.ADMIN)
@Controller('users')
export class UserController extends BaseController<
  User,
  CreateUserDto,
  UpdateUserDto
> {
  constructor(protected readonly service: UserService) {
    super(service, CreateUserDto, UpdateUserDto);
  }

  /**
   * The signed-in user's own profile. PROJECT_API declares GET/PATCH /api/users/me and the
   * /profile screen reads and writes it, but neither route existed: the inherited
   * BaseController `@Get(':id')` carries a ParseUUIDPipe, so `/users/me` was parsed as an id
   * and answered 400 "Validation failed (uuid is expected)" for every role.
   *
   * Declared here, on the subclass, so it is matched before the inherited `:id` route.
   */
  @Get('me')
  @Roles('student', 'instructor', 'admin', user_role.STUDENT, user_role.INSTRUCTOR, user_role.ADMIN)
  @ApiOperation({ summary: "Get the signed-in user's profile" })
  @ApiResponse({ status: 200, description: 'The current user' })
  async findMe(@CurrentUser('id') userId: string): Promise<User> {
    // BaseService exposes findByIdOrFail (throws NotFoundException itself).
    return this.service.findByIdOrFail(userId);
  }

  @Patch('me')
  @Roles('student', 'instructor', 'admin', user_role.STUDENT, user_role.INSTRUCTOR, user_role.ADMIN)
  @ApiOperation({ summary: "Update the signed-in user's profile" })
  @ApiResponse({ status: 200, description: 'The updated user' })
  async updateMe(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateUserDto,
  ): Promise<User> {
    // Ownership is the session, not the body: a user may only ever patch themselves here.
    const updated = await this.service.update(userId, dto);
    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }
}
