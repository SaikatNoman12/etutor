import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `avatar_url` was varchar(500) — enough for a link, not for a picture.
 *
 * Nothing in this deployment stores files (Render's disk is ephemeral, so an
 * uploaded file would vanish on the next deploy), and a profile photo the user
 * picks from their own machine has to go somewhere. The browser downscales it to
 * a small square and sends a data URL, which is a few tens of kilobytes — past
 * the old limit, comfortably inside a text column.
 */
export class WidenAvatarUrl11767225700000 implements MigrationInterface {
  name = 'WidenAvatarUrl11767225700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "avatar_url" TYPE text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Anything longer than the old limit would be truncated, so drop it instead
    // of silently corrupting it.
    await queryRunner.query(
      `UPDATE "users" SET "avatar_url" = NULL WHERE length("avatar_url") > 500`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "avatar_url" TYPE character varying(500)`,
    );
  }
}
