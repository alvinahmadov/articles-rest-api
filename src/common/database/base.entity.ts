import { CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

/**
 * Base entity class with common properties accros many entities throughout the project
 * to avoid repeating ourselves.
 * */
export abstract class BaseEntity {
	/**
	 * The unique identifier of the entity.
	 * For simplicity, we could use a number of the id type, but in
	 * production is better off using a unique identifier (especially v4), as
	 * how difficult it is to guess for malicious actions.
	 * But it doesn't look good in the browser's address bar.
	 * PrimaryGeneratedColumn provides uuid strategy for this purpose.
	 * */
	@PrimaryGeneratedColumn("uuid")
	id!: string;

	// Could be implemented for email/phone verification purposes.
	// Email verification prevents signups with unowned addresses.
	// But for the purpose of the test project we omit all activity,
	// related to the property.
	// @Column({ default: true })
	// isActive: boolean;

	@CreateDateColumn({ type: "timestamp" })
	createdAt!: Date;

	@UpdateDateColumn({ type: "timestamp" })
	updatedAt!: Date;

	// Soft deletion is ideal for scenarios where data recovery,
	// auditing, or maintaining relational integrity is critical and
	// preserves referential integrity for articles owned by a deleted user.
	// But it also degrades database efficiency and increases
	// security risks if used carelessly.
	// A standard soft delete may be not GDPR-compliant, unless you handle
	// postponed hard delete after usually 30 days.
	// The test project didn't explicitly state the requirement for
	// this functionality, so we omit it.
	// @DeleteDateColumn({ type: 'timestamp', nullable: true }
	// deletedAt?: Date; // Automatically handled by TypeORM
}
