import { BaseEntity } from "@common/database/base.entity";
import { Column, Entity, Index, OneToMany } from "typeorm";

import { IUser } from "../interfaces/user.interface";
import { Article } from "./article.entity";

/**
 * Represents a user entity in the system.
 * This class maps to the 'user' table in the database and contains
 * core user information.
 *
 * Usually in production code I prefer to follow DRY pattern, less repeating
 * myself, just creating non-table base model class with predefined id (uuidv4),
 * auto createdAt and updatedAt fields.
 * But for simplicity I'll follow simple approach.
 *
 * @description Defines the structure and persistence mapping for a user record.
 * @package entities
 */
@Entity("users")
export class User extends BaseEntity implements IUser {
	/**
	 * The email of the user used to register and sign in the service.
	 * In production code it is also used to send newsletter, notifications and code/link
	 * for user verification purposes.
	 * It must be always unique as a user identifier in the system.
	 * Also, should be indexed in database, as we will
	 * frequently access this column for login and other purposes.
	 * */
	@Index("idx_email")
	@Column({ type: "varchar", length: 255, unique: true, nullable: false })
	email!: string;

	/**
	 * First name of the user.
	 * Usually the best practice is to create a separate
	 * entity with foreign key (one-to-one) to the user record
	 * e.g. an author, but the test project didn't explicitly
	 * require the need for the author entity, so as the first
	 * and last names of the author of the article we will
	 * simply use user's first and last name properties.
	 * */
	@Column()
	firstName?: string;

	/**
	 * Last name of the user/author. Optional.
	 * It is optional as first name is enough to identify author to article readers.
	 * */
	@Column({ nullable: true })
	lastName?: string;

	/**
	 * Encrypts the password to store in the database.
	 * So it's not a good idea to store plain text passwords
	 * in the database for security reasons.
	 * */
	@Column({ type: "varchar", nullable: false })
	passwordHash!: string;

	// In the real project we should use a separate entity named Author
	// with OneToOne relationship with User entity.
	// Better approach is to use user entity for authentication purposes only.
	// We are doing a test project, therefore using this relation is enough.
	@OneToMany(() => Article, (article) => article.author)
	articles?: Article[];
}
