import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `categories.icon_url` was varchar(500) — a link, not a picture.
 *
 * Same reasoning as WidenAvatarUrl: the console lets an operator pick a file
 * from their machine, the browser downscales it, and what gets stored is a data
 * URL of a few tens of kilobytes. A category still accepts a plain URL; it just
 * is no longer limited to one.
 */
export class WidenCategoryIcon11767225800000 implements MigrationInterface {
  name = 'WidenCategoryIcon11767225800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "categories" ALTER COLUMN "icon_url" TYPE text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "categories" SET "icon_url" = NULL WHERE length("icon_url") > 500`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" ALTER COLUMN "icon_url" TYPE character varying(500)`,
    );
  }
}
