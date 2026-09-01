import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { toPublicUser } from "@/modules/users/domain/entities/user.entity";
import {
	type IUserRepository,
	USER_REPOSITORY,
} from "@/modules/users/domain/repositories/user.repository.interface";

@Injectable()
export class FindUserUseCase {
	constructor(
		@Inject(USER_REPOSITORY)
		private readonly userRepository: IUserRepository,
	) {}

	async execute(id: string, organizationId?: string) {
		const user = await this.userRepository.findById(id, organizationId);

		if (!user) {
			throw new NotFoundException("User not found");
		}

		return {
			data: toPublicUser(user),
			message: "User retrieved successfully",
		};
	}
}
