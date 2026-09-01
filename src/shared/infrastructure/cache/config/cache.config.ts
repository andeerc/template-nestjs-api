import { RedisModuleOptions } from "@nestjs-modules/ioredis";
import { envConfig } from "@/config/env.config";

export const cacheConfig = (): Promise<RedisModuleOptions> => {
	return Promise.resolve({
		type: "single",
		options: {
			host: envConfig.redis.host,
			port: envConfig.redis.port,
			password: envConfig.redis.password,
			db: envConfig.redis.db,
		},
	});
};
