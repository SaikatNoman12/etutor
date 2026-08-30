import { Injectable } from '@nestjs/common';
import { BaseService } from '../../core/base/base.service';
import { User } from './user.entity';
import { UserRepository } from './user.repository';

export interface UserPage {
  items: User[];
  meta: { page: number; page_size: number; total: number };
}

/**
 * User service — the thin BaseService<User> covering create/findById/findAll/
 * update/remove for the generic /users CRUD surface. Constructor arity stays 1
 * (repository only) so the scaffolded unit test — `new UserService(mockRepo)` —
 * keeps compiling. Account business rules (register/login, role changes,
 * suspend-if-has-orders) live in AuthService and AdminConsoleService, not here.
 */
@Injectable()
export class UserService extends BaseService<User> {
  constructor(protected readonly repository: UserRepository) {
    super(repository, 'User');
  }

  /** Page users as { items, meta: { page, page_size, total } } for GET /api/users. */
  async paginate(page = 1, pageSize = 10): Promise<UserPage> {
    const [items, total] = await Promise.all([
      this.repository.findAll({ skip: (page - 1) * pageSize, take: pageSize }),
      this.repository.count(),
    ]);
    return { items, meta: { page, page_size: pageSize, total } };
  }
}
