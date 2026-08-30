import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BaseRepository } from '../../core/base/base.repository';
import { Lesson } from './lesson.entity';

/**
 * Lesson repository — generated. Extends BaseRepository<Lesson> for
 * standard CRUD (findById, findAll, create, update, softDelete). Add custom
 * query methods here as the project needs them (e.g. findByEmail,
 * findActiveByOrgId). Do not modify the inherited methods.
 */
@Injectable()
export class LessonRepository extends BaseRepository<Lesson> {
  constructor(
    @InjectRepository(Lesson)
    repository: Repository<Lesson>,
  ) {
    super(repository);
  }

  /** A section's lessons in syllabus order — the shape both the course editor and the player need. */
  async findBySectionOrdered(sectionId: string): Promise<Lesson[]> {
    return this.findAll({ where: { sectionId }, order: { displayOrder: 'ASC' } });
  }

  /** One lesson WITH its section, so a caller can check which course it belongs to. */
  async findWithSection(id: string): Promise<Lesson | null> {
    return this.findOne({ where: { id }, relations: { section: true } });
  }

  /** Published lessons across a set of sections, in syllabus order (progress denominator). */
  async findPublishedBySections(sectionIds: string[]): Promise<Lesson[]> {
    if (!sectionIds.length) return [];
    return this.findAll({
      where: { sectionId: In(sectionIds), isPublished: true },
      order: { displayOrder: 'ASC' },
    });
  }
}
