/**
 * A common user interface that must be implemented by entity and dtos.
 * */
export interface IUser {
	email: string;
	firstName?: string;
	lastName?: string;
}
