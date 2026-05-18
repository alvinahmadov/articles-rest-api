import { Repository } from "typeorm";

import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { User } from "../../domain/entities/user.entity";

@Injectable()
export class UsersService {
	constructor(
		@InjectRepository(User)
		private readonly usersRepository: Repository<User>,
	) {}

	/**
	 * Creates a new user in the system.
	 * @param data - The user data including email, password hash, and optional names.
	 * @returns A promise that resolves to the created User entity.
	 * @throws {ConflictException} If a user with the provided email already exists.
	 */
	async create(data: {
		email: string;
		passwordHash: string;
		firstName?: string;
		lastName?: string;
	}): Promise<User> {
		const { email } = data;
		const existing = await this.usersRepository.findOne({ where: { email } });
		if (existing) {
			throw new ConflictException("A user with this email already exists");
		}

		const user = this.usersRepository.create(data);
		return this.usersRepository.save(user);
	}

	/**
	 * Finds a user by their unique ID.
	 * @param id - The ID of the user to find.
	 * @returns A promise that resolves to the found User entity.
	 * @throws {NotFoundException} If no user with the given ID is found.
	 */
	async findById(id: string): Promise<User> {
		const user = await this.usersRepository.findOne({ where: { id } });
		if (!user) {
			throw new NotFoundException("User not found");
		}
		return user;
	}

	/**
	 * Finds a user by their email address.
	 * @param email - The email address of the user to find.
	 * @returns A promise that resolves to the User entity if found, or null otherwise.
	 */
	async findByEmail(email: string): Promise<User | null> {
		return this.usersRepository.findOne({ where: { email } });
	}
}
