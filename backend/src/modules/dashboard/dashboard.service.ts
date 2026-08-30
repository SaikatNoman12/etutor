import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DashboardQueryDto, DashboardResult } from './dtos/dashboard-query.dto';

@Injectable()
export class DashboardService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async query(q: DashboardQueryDto): Promise<DashboardResult> {
    const meta = this.dataSource.entityMetadatas.find(
      (em) => em.tableName === q.entity || em.name === q.entity,
    );
    if (!meta) {
      throw new BadRequestException(`Unknown entity: ${q.entity}`);
    }

    const qb = this.dataSource
      .getRepository(meta.target)
      .createQueryBuilder('e');

    const allowedOps = new Set(['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IN']);
    if (q.where && Array.isArray(q.where)) {
      for (let i = 0; i < q.where.length; i++) {
        const w = q.where[i];
        if (!meta.columns.find((c) => c.propertyName === w.field)) {
          throw new BadRequestException(`Unknown column: ${w.field}`);
        }
        if (!allowedOps.has(w.op)) {
          throw new BadRequestException(`Disallowed op: ${w.op}`);
        }
        const param = `p${i}`;
        if (w.op === 'IN' && Array.isArray(w.value)) {
          qb.andWhere(`e.${w.field} IN (:...${param})`, { [param]: w.value });
        } else {
          qb.andWhere(`e.${w.field} ${w.op} :${param}`, { [param]: w.value });
        }
      }
    }

    if (q.group && q.group.field === 'day') {
      const days = q.group.window?.days ?? 30;
      const ts = q.group.timestampField ?? 'createdAt';
      if (!meta.columns.find((c) => c.propertyName === ts)) {
        throw new BadRequestException(`Unknown timestamp column: ${ts}`);
      }
      const items = await qb
        .select(`DATE_TRUNC('day', e."${ts}") AS key`)
        .addSelect('COUNT(*)::int AS count')
        .andWhere(`e."${ts}" >= NOW() - INTERVAL '${days} days'`)
        .groupBy('key')
        .orderBy('key', 'ASC')
        .getRawMany();
      return { items };
    }

    if (q.group && q.group.field) {
      if (!meta.columns.find((c) => c.propertyName === q.group!.field)) {
        throw new BadRequestException(`Unknown group column: ${q.group.field}`);
      }
      const items = await qb
        .select(`e.${q.group.field} AS key`)
        .addSelect('COUNT(*)::int AS count')
        .groupBy(`e.${q.group.field}`)
        .getRawMany();
      return { items };
    }

    return { value: await qb.getCount() };
  }
}
